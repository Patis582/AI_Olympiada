# -*- coding: utf-8 -*-
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json, os
import tools
from bodovac import vyhodnot, PRIPADY

app = FastAPI(
    title="AI Triáž - Linie ZDRAVÍ",
    description="REST API nad sandbox daty pro ČAO 2026",
    version="1.0.0",
)
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
    priority: dict[str, int]  # {"P001": 3, "P002": 1, ...}

class PriorityAssignment(BaseModel):
    pid: str
    priorita: int
    
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