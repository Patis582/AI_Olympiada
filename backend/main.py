# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
import json, os
import tools
import intake as intake_mod
from bodovac import vyhodnot, PRIPADY

app = FastAPI(
    title="AI Triáž - Linie ZDRAVÍ",
    description="REST API nad sandbox daty pro ČAO 2026",
    version="1.0.0",
)

@app.on_event("startup")
def on_startup():
    intake_mod.seed_demo()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
_DIR = os.path.dirname(os.path.abspath(__file__))
# ---------- Pydantic schémata ----------
class AskRequest(BaseModel):
    otazka: str

class EscalateRequest(BaseModel):
    duvod: str

class EvaluateRequest(BaseModel):
    priority: dict  # {"P001": 3, "P002": 1, ...}

class PriorityAssignment(BaseModel):
    pid: str
    priorita: int

class IntakeStartRequest(BaseModel):
    complaint: str
    patient_id: Optional[str] = None

class IntakeRoundRequest(BaseModel):
    session_id: str
    answers: list[dict]  # [{"question": str, "answer": str}]

class ConfirmPriorityRequest(BaseModel):
    priority: int

# ---------- Root ----------
@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

# ---------- Pacienti ----------
@app.get("/patients", summary="Seznam všech ID pacientů")
def list_patients():
    return {"ids": list(tools._PRES.keys())}

@app.get("/patients/{pid}/presentation", summary="Prezentace pacienta - symptomy a vitály")
def get_presentation(pid: str):
    data = tools.get_presentation(pid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Pacient {pid} nenalezen")
    return data

@app.get("/patients/{pid}/history", summary="Anamnéza pacienta z dostupných záznamů")
def get_history(pid: str):
    data = tools.get_history(pid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Anamnéza pro {pid} není k dispozici")
    return data

@app.post("/patients/{pid}/ask", summary="Položit otázku přímo pacientovi (zvyšuje zátěž)")
def ask_patient(pid: str, body: AskRequest):
    if tools.get_presentation(pid) is None:
        raise HTTPException(status_code=404, detail=f"Pacient {pid} nenalezen")
    return tools.ask_patient(pid, body.otazka)

@app.post("/patients/{pid}/escalate", summary="Předat pacienta lékaři")
def escalate(pid: str, body: EscalateRequest):
    if tools.get_presentation(pid) is None:
        raise HTTPException(status_code=404, detail=f"Pacient {pid} nenalezen")
    return tools.escalate(pid, body.duvod)

# ---------- Kontext ----------
@app.get("/epidemiology/{datum}", summary="Epidemiologický kontext pro dané datum (YYYY-MM-DD)")
def get_epidemiology(datum: str):
    return tools.get_epidemiology(datum)

@app.get("/guideline/{symptom}", summary="Triážní doporučení pro symptom (placeholder)")
def lookup_guideline(symptom: str):
    return tools.lookup_guideline(symptom)

# ---------- Statistiky sezení ----------
@app.get("/stats/burden", summary="Celkový počet otázek položených pacientům")
def patient_burden():
    return {"otazky": tools.patient_burden()}

@app.get("/stats/escalations", summary="Seznam všech eskalovaných pacientů v tomto sezení")
def list_escalations():
    return {"eskalace": tools._escalations()}

# ---------- Fronta ----------
@app.get("/queue", summary="Cvičná fronta pacientů k vyzkoušení agenta")
def get_queue():
    path = os.path.join(_DIR, "practice_scenario.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)

# ---------- Hodnocení ----------
@app.post("/evaluate", summary="Porovná vaše priority s baseline na ukázkových případech")
def evaluate(body: EvaluateRequest):
    result = vyhodnot(body.priority)
    return {
        "pripadu": len(PRIPADY),
        "baseline": {"podhodnoceni": result["baseline"][0], "plane_poplachy": result["baseline"][1]},
        "vase": {"podhodnoceni": result["vase"][0], "plane_poplachy": result["vase"][1]},
        "zlepseni": {
            "podhodnoceni": result["baseline"][0] - result["vase"][0],
            "plane_poplachy": result["baseline"][1] - result["vase"][1],
        },
    }

@app.get("/evaluate/cases", summary="Seznam ukázkových případů s baseline prioritami")
def get_evaluation_cases():
    return list(PRIPADY.values())

# ---------- Reset (pro testování/demo) ----------
@app.post("/reset", summary="Resetuje stav sezení (eskalace, zátěž pacienta)")
def reset_session():
    tools._ESCALATIONS.clear()
    tools._BURDEN["otazky"] = 0
    return {"ok": True, "zprava": "Sezení bylo resetováno"}

# ---------- Intake (pacientský flow) ----------
@app.post("/intake/start", summary="Zahájí intake session pro pacienta")
def intake_start(body: IntakeStartRequest):
    try:
        session_id, questions, done, priority, reasoning = intake_mod.start_session(
            body.complaint, body.patient_id
        )
        return {
            "session_id": session_id,
            "questions": questions,
            "done": done,
            "priority": priority,
            "reasoning": reasoning,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/intake/round", summary="Odešle odpovědi z kola a vrátí další otázky nebo výsledek")
def intake_round(body: IntakeRoundRequest):
    try:
        questions, done, priority, reasoning = intake_mod.process_round(
            body.session_id, body.answers
        )
        return {
            "questions": questions,
            "done": done,
            "priority": priority,
            "reasoning": reasoning,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------- Admin dashboard ----------
@app.get("/admin/triage", summary="Seznam pacientů s AI prioritou pro admin dashboard")
def admin_triage():
    return intake_mod.get_triage_list()

@app.post("/admin/triage/{pid}/confirm", summary="Lékař potvrdí nebo upraví prioritu")
def admin_confirm(pid: str, body: ConfirmPriorityRequest):
    try:
        return intake_mod.confirm_priority(pid, body.priority)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/admin/seed", summary="Naplní admin dashboard demo daty (bez volání GPT)")
def admin_seed():
    intake_mod.seed_demo()
    return {"ok": True, "zprava": f"Naplněno {len(intake_mod._TRIAGE_STATE)} demo pacientů"}