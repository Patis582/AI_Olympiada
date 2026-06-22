# -*- coding: utf-8 -*-
"""
Triážní agent pro urgentní příjem.
Nejprve dohledá záznamy bez zátěže pacienta, pak se ptá A/B/C/D otázkami jen pokud chybí
klíčová informace. Po shromáždění dostatečných dat přiřadí prioritu 1-5.
"""
import json
import os
from typing import Optional
from openai import OpenAI
from tools import (
    get_presentation, get_history, get_epidemiology,
    ask_patient, escalate, patient_burden,
)

client = OpenAI()

RESPIRATORY_KEYWORDS = {
    "kašel", "dušnost", "horečka", "rýma", "astma", "chopn",
    "zápal plic", "pneumonie", "bronchitida",
}

SYSTEM_PROMPT = """Jsi zkušený triážní agent na urgentním příjmu. Přiřazuješ pacientům prioritu 1–5 dle českého standardu SUMMK:

Priorita 1 – Bezprostřední ohrožení života (okamžitá resuscitace)
Priorita 2 – Velmi urgentní: stav vyžadující rychlý zásah do 20 minut
Priorita 3 – Urgentní: stav vyžadující ošetření do 60 minut
Priorita 4 – Méně urgentní: stav vyžadující ošetření do 2 hodin
Priorita 5 – Neurgentní: plánované nebo velmi mírné stavy

KLÍČOVÉ PRINCIPY:
1. Záznamy z anamnézy a epidemiologie jsou již k dispozici – využij je přednostně
2. Ptej se pacienta POUZE tehdy, kdy chybí pro triáž zásadní informace, kterou jinak nezjistíš
3. Rizikové faktory (věk 65+, CHOPN, DM, kardiovaskulární onemocnění, imunosuprese) dramaticky zvyšují prioritu i při mírné prezentaci
4. Netypické projevy (infarkt bez klasické bolesti na hrudi u diabetiků, žen, seniorů) vyžadují vyšší bdělost
5. Při nejistotě raději přiřaď vyšší prioritu

FORMÁT ODPOVĚDI – VŽDY vrať POUZE validní JSON, žádný jiný text:

Pokud potřebuješ více informací (max 2 otázky za jedno kolo):
{
  "action": "ask",
  "questions": [
    {
      "text": "Otázka v češtině?",
      "options": {"A": "Možnost A", "B": "Možnost B", "C": "Možnost C", "D": "Jiné"}
    }
  ]
}

Pokud máš dost informací:
{
  "action": "prioritize",
  "priority": <číslo 1-5>,
  "reasoning": "Stručné odůvodnění v češtině (1-2 věty)"
}"""


def _is_respiratory(pres: dict) -> bool:
    text = (" ".join(pres.get("symptomy", [])) + " " + pres.get("hlavni_obtiz", "")).lower()
    return any(kw in text for kw in RESPIRATORY_KEYWORDS)


def _build_context(pres: dict, hist: Optional[dict], epi: Optional[dict], qa_history: list) -> str:
    v = pres.get("vitaly", {})
    lines = [
        f"=== PACIENT {pres['id']} ===",
        f"Věk: {pres['vek']} let, pohlaví: {pres['pohlavi']}",
        f"Hlavní obtíž: {pres['hlavni_obtiz']}",
        f"Symptomy: {', '.join(pres.get('symptomy', []))}",
        (
            f"Vitály: TF={v.get('TF')} bpm, TK={v.get('TK')} mmHg, "
            f"SpO2={v.get('SpO2')}%, teplota={v.get('teplota')}°C, "
            f"DF={v.get('DF')} dechů/min"
        ),
    ]

    if hist:
        rf = hist.get("rizikove_faktory", [])
        lines.append(f"Rizikové faktory z anamnézy: {', '.join(rf) if rf else 'žádné'}")
        lines.append(f"Předchozí návštěvy: {hist.get('predchozi_navstevy', 0)}")
    else:
        lines.append("Anamnéza: nedostupná")

    if epi:
        lines.append(
            f"Epidemiologie ({epi.get('datum', '?')}): "
            f"výskyt ARI {epi.get('ARI_vyskyt_na_100k', '?')}/100k, "
            f"úroveň vlny: {epi.get('uroven_vlny', '?')}"
        )

    if qa_history:
        lines.append("\n=== DOSAVADNÍ OTÁZKY A ODPOVĚDI ===")
        for qa in qa_history:
            lines.append(f"Otázka: {qa['question']}")
            lines.append(f"Odpověď pacienta: {qa['answer']}")

    return "\n".join(lines)


def _call_gpt(context: str, force_prioritize: bool = False) -> dict:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": context},
    ]
    if force_prioritize:
        messages.append({
            "role": "user",
            "content": "Shromáždil jsi dost informací. Urči prioritu ihned (action=prioritize).",
        })
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    return json.loads(response.choices[0].message.content)


def run_intake(pres: dict, hist: Optional[dict], epi: Optional[dict]) -> tuple:
    """
    Iterativní intake flow pro jednoho pacienta.
    Vrací (priority: int, reasoning: str, qa_history: list).
    Čistá funkce – snadno zabalitelná do web API.
    """
    qa_history = []

    for round_num in range(4):  # max 3 kola otázek + 1 finální
        context = _build_context(pres, hist, epi, qa_history)
        result = _call_gpt(context, force_prioritize=(round_num >= 3))

        if result.get("action") == "prioritize" or round_num >= 3:
            priority = int(result.get("priority", 3))
            reasoning = result.get("reasoning", "")
            return priority, reasoning, qa_history

        # action == "ask" – položíme otázky pacientovi
        for q in result.get("questions", [])[:2]:  # max 2 otázky za kolo
            options = q.get("options", {})
            options_str = " | ".join(f"{k}: {v}" for k, v in options.items())
            full_question = f"{q['text']} ({options_str})"

            answer_raw = ask_patient(pres["id"], full_question)
            rf = answer_raw["odpoved"].get("rizikove_faktory", [])
            symp = answer_raw["odpoved"].get("symptomy", [])
            answer_text = (
                f"Rizikové faktory: {', '.join(rf) if rf else 'žádné'}; "
                f"Symptomy: {', '.join(symp) if symp else 'neuvedeny'}"
            )
            qa_history.append({"question": q["text"], "answer": answer_text})

    return 3, "Nepodařilo se jednoznačně určit prioritu.", qa_history


def triage_patient(pid: str) -> int:
    pres = get_presentation(pid)
    hist = get_history(pid)
    epi = get_epidemiology(pres["datum"]) if _is_respiratory(pres) else None

    print(f"Pacient {pid} | věk {pres['vek']} | {pres['hlavni_obtiz']}")

    priority, reasoning, qa_history = run_intake(pres, hist, epi)

    if qa_history:
        print(f"  Otázky položeny: {len(qa_history)}")

    escalate(pid, f"Priorita {priority}: {reasoning}")
    print(f"  → Priorita {priority} | {reasoning}")
    return priority


def main():
    scenario_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "practice_scenario.json")
    with open(scenario_path, encoding="utf-8") as f:
        fronta = json.load(f)["fronta"]

    print("=== TRIAGE AGENT – ZPRACOVÁNÍ FRONTY ===\n")
    results = []
    for pid in fronta:
        priority = triage_patient(pid)
        results.append({"id": pid, "priority": priority})
        print()

    print("=== VÝSLEDKY ===")
    for r in results:
        print(f"  {r['id']}: priorita {r['priority']}")
    print(f"\nZátěž pacienta (celkem otázek): {patient_burden()}")


if __name__ == "__main__":
    main()
