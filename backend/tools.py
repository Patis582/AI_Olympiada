"""
Rozhraní k sandbox datům - Linie ZDRAVÍ.
Tyto funkce používá váš agent. Skutečnou prioritu pacienta nezískáte - ta slouží k hodnocení.
"""
import json, csv, os

_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(_DIR, "patients_presentation.json"), encoding="utf-8") as f:
    _PRES = {p["id"]: p for p in json.load(f)}
with open(os.path.join(_DIR, "patients_anamnesis.json"), encoding="utf-8") as f:
    _ANAM = json.load(f)
_EPI = {}
with open(os.path.join(_DIR, "epidemiology.csv"), encoding="utf-8") as f:
    for row in csv.DictReader(f):
        _EPI[row["datum"]] = row

_ESCALATIONS = []
_BURDEN = {"otazky": 0}  # počet otázek položených pacientovi (zátěž pacienta)

#Functions
def get_presentation(pid):
    """Vrátí prezentaci pacienta (symptomy + vitály). Vidí každý."""
    return _PRES.get(pid)

def get_history(pid):
    """Vrátí anamnézu pacienta z dostupných záznamů. Nezatěžuje pacienta."""
    return _ANAM.get(pid)

def get_epidemiology(datum):
    """Vrátí epidemiologický kontext pro dané datum. Nezatěžuje pacienta."""
    return _EPI.get(datum, {"datum": datum, "ARI_vyskyt_na_100k": "150", "uroven_vlny": "nízká"})

def ask_patient(pid, otazka):
    """Zeptá se přímo PACIENTA. Vždy dostupné, ALE počítá se do zátěže pacienta.
       Dobrý agent si informaci raději dohledá (get_history / get_epidemiology)
       a pacienta se ptá jen tehdy, když to jinak nejde."""
    _BURDEN["otazky"] += 1
    anam = _ANAM.get(pid, {})
    pres = _PRES.get(pid, {})
    # zjednodušená odpověď: pacient potvrdí to, co o sobě ví
    return {"id": pid, "otazka": otazka,
            "odpoved": {"rizikove_faktory": anam.get("rizikove_faktory", []),
                        "symptomy": pres.get("symptomy", [])}}

def lookup_guideline(symptom):
    """Placeholder. Nahraďte vlastní rešerší platného českého triážního standardu."""
    return {"symptom": symptom, "poznamka": "Dohledejte platný český triážní standard (SUMMK/ÚZIS)."}

def escalate(pid, duvod):
    """Předá pacienta lékaři (human-in-the-loop). Vrací potvrzení."""
    _ESCALATIONS.append({"id": pid, "duvod": duvod})
    return {"id": pid, "eskalovano": True, "duvod": duvod}

def _escalations():
    return list(_ESCALATIONS)

def patient_burden():
    """Vrátí počet otázek, které jste dosud položili pacientům (nižší = lépe)."""
    return _BURDEN["otazky"]