# -*- coding: utf-8 -*-
"""
Inkrementální intake session management pro web UI.
Spravuje stav konverzace s pacientem a AI triage výsledky pro admin dashboard.
"""
import uuid
from datetime import datetime
from typing import Optional
from chat import _call_gpt, _build_context, _is_respiratory
from tools import get_presentation, get_history, get_epidemiology

_SESSIONS: dict = {}
_TRIAGE_STATE: dict = {}

_DEMO_RECORDS = [
    {
        "pid": "P005",
        "ai_priority": 2,
        "ai_reasoning": "Senior 75 let s CHOPN v anamnéze, SpO2 95%, respirační vlna střední – vysoké riziko komplikací.",
        "qa_history": [
            {"question": "Jak intenzivní je vaše dušnost?", "answer": "Výrazná, dušný i v klidu"},
            {"question": "Jak dlouho potíže trvají?", "answer": "Více než 3 dny"},
        ],
    },
    {
        "pid": "P017",
        "ai_priority": 2,
        "ai_reasoning": "Žena 54 let s kardiovaskulárními rizikovými faktory, netypická prezentace možného infarktu myokardu.",
        "qa_history": [
            {"question": "Máte tlak nebo svírání na hrudi?", "answer": "Mírný tlak, spíše únava"},
            {"question": "Vyzařuje bolest do ramene nebo čelisti?", "answer": "Do levého ramene ano"},
        ],
    },
    {
        "pid": "P001",
        "ai_priority": 4,
        "ai_reasoning": "Mladý muž 32 let, normální vitály, mírné příznaky virózy bez rizikových faktorů.",
        "qa_history": [
            {"question": "Jak intenzivní je vaše horečka?", "answer": "Mírná, pod 38°C"},
            {"question": "Jak dlouho potíže trvají?", "answer": "1–3 dny"},
        ],
    },
    {
        "pid": "P020",
        "ai_priority": 2,
        "ai_reasoning": "Senior 75 let, SpO2 92%, dechová frekvence 22/min, CHOPN – urgentní respirační selhání.",
        "qa_history": [
            {"question": "Zvládáte chůzi bez dušnosti?", "answer": "Ne, dušný i v klidu"},
            {"question": "Jak dlouho potíže trvají?", "answer": "Více než 3 dny"},
        ],
    },
    {
        "pid": "P010",
        "ai_priority": 2,
        "ai_reasoning": "Senior 70 let, SpO2 94%, horečka 38.6°C, CHOPN – respirační vlna vysoká.",
        "qa_history": [
            {"question": "Jak intenzivní je kašel?", "answer": "Výrazný, hlenový"},
            {"question": "Máte potíže s dýcháním?", "answer": "Ano, výrazné potíže"},
        ],
    },
    {
        "pid": "P014",
        "ai_priority": 4,
        "ai_reasoning": "Muž 52 let bez rizikových faktorů, SpO2 99%, mírná horečka – lehká viróza.",
        "qa_history": [
            {"question": "Jak intenzivní je vaše horečka?", "answer": "Střední, kolem 38°C"},
            {"question": "Jak dlouho potíže trvají?", "answer": "1–3 dny"},
        ],
    },
]


def seed_demo():
    for record in _DEMO_RECORDS:
        pid = record["pid"]
        pres = get_presentation(pid)
        hist = get_history(pid)
        if pres is None:
            continue
        _TRIAGE_STATE[pid] = {
            "pid": pid,
            "patient_id": pid,
            "complaint": pres.get("hlavni_obtiz", ""),
            "presentation": pres,
            "history": hist,
            "ai_priority": record["ai_priority"],
            "ai_reasoning": record["ai_reasoning"],
            "confirmed_priority": None,
            "qa_history": record["qa_history"],
            "submitted_at": "demo",
        }


def start_session(complaint: str, patient_id: Optional[str] = None):
    """
    Zahájí novou intake session.
    Vrací (session_id, questions) – první kolo otázek od GPT.
    """
    session_id = str(uuid.uuid4())
    now = datetime.now().strftime("%H:%M")

    if patient_id:
        pres = get_presentation(patient_id)
        hist = get_history(patient_id)
        epi = get_epidemiology(pres["datum"]) if pres and _is_respiratory(pres) else None
    else:
        pres = {
            "id": f"ANON-{session_id[:8].upper()}",
            "vek": "?",
            "pohlavi": "?",
            "hlavni_obtiz": complaint,
            "symptomy": [],
            "datum": datetime.now().strftime("%Y-%m-%d"),
            "vitaly": {},
        }
        hist = None
        epi = None

    session = {
        "session_id": session_id,
        "patient_id": patient_id,
        "complaint": complaint,
        "pres": pres,
        "hist": hist,
        "epi": epi,
        "qa_history": [],
        "round": 0,
        "done": False,
        "priority": None,
        "reasoning": "",
        "submitted_at": now,
    }
    _SESSIONS[session_id] = session

    context = _build_context(pres, hist, epi, [])
    result = _call_gpt(context, force_prioritize=False)
    session["round"] = 1

    if result.get("action") == "prioritize":
        session["done"] = True
        session["priority"] = int(result.get("priority", 3))
        session["reasoning"] = result.get("reasoning", "")
        _store_in_triage(session)
        return session_id, [], True, session["priority"], session["reasoning"]

    return session_id, result.get("questions", []), False, None, ""


def process_round(session_id: str, qa_pairs: list):
    """
    Zpracuje všechny odpovědi z jednoho kola najednou.
    qa_pairs = [{"question": str, "answer": str}, ...]
    Vrací (questions, done, priority, reasoning).
    """
    session = _SESSIONS.get(session_id)
    if not session:
        raise ValueError(f"Session {session_id} nenalezena")

    for qa in qa_pairs:
        session["qa_history"].append(qa)

    force = session["round"] >= 2
    context = _build_context(session["pres"], session["hist"], session["epi"], session["qa_history"])
    result = _call_gpt(context, force_prioritize=force)
    session["round"] += 1

    if result.get("action") == "prioritize" or session["round"] > 2:
        session["done"] = True
        session["priority"] = int(result.get("priority", 3))
        session["reasoning"] = result.get("reasoning", "")
        _store_in_triage(session)
        return [], True, session["priority"], session["reasoning"]

    return result.get("questions", []), False, None, ""


def get_triage_list():
    return sorted(_TRIAGE_STATE.values(), key=lambda x: x["ai_priority"])


def confirm_priority(pid: str, priority: int):
    if pid not in _TRIAGE_STATE:
        raise ValueError(f"Pacient {pid} není v triage state")
    _TRIAGE_STATE[pid]["confirmed_priority"] = priority
    return _TRIAGE_STATE[pid]


def _store_in_triage(session: dict):
    pid = session["patient_id"] or session["pres"]["id"]
    _TRIAGE_STATE[pid] = {
        "pid": pid,
        "patient_id": session["patient_id"],
        "complaint": session["complaint"],
        "presentation": session["pres"],
        "history": session["hist"],
        "ai_priority": session["priority"],
        "ai_reasoning": session["reasoning"],
        "confirmed_priority": None,
        "qa_history": session["qa_history"],
        "submitted_at": session["submitted_at"],
    }
