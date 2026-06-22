# -*- coding: utf-8 -*-
"""Bodovac na ukazkovych oznacenych pripadech (linie ZDRAVI).
Porovna VASE prirazene priority s baseline na techto par pripadech.
Priorita 1 = nejnalehavejsi ... 5 = nejlehci.
Pouziti:
    from bodovac import vyhodnot
    moje = {"P012": 2, "P034": 1, ...}   # id -> priorita, kterou priradil vas agent
    vyhodnot(moje)
"""
import json, os
_D = os.path.dirname(__file__)
with open(os.path.join(_D, "ukazkove_pripady.json"), encoding="utf-8") as f:
    PRIPADY = {p["id"]: p for p in json.load(f)}

def _skore(prio):
    podhodnoceni = plany_poplach = 0
    for pid, p in PRIPADY.items():
        sp = p["spravna_priorita"]; mp = prio.get(pid, 3)
        if sp <= 2 and mp >= 3: podhodnoceni += 1      # FN: vazneho jsem poslal do nizke priority
        if sp >= 4 and mp <= 2: plany_poplach += 1     # FP: lehkeho jsem zbytecne eskaloval
    return podhodnoceni, plany_poplach

def vyhodnot(moje_priority):
    bpo, bpp = _skore({pid: p["baseline_priorita"] for pid, p in PRIPADY.items()})
    mpo, mpp = _skore(moje_priority)
    print("Pripadu:", len(PRIPADY))
    print(f"Baseline:     podhodnoceni={bpo}, plane poplachy={bpp}")
    print(f"Vase reseni:  podhodnoceni={mpo}, plane poplachy={mpp}")
    print(f"Lepsi o: podhodnoceni {bpo-mpo}, plane poplachy {bpp-mpp}")
    return {"baseline": (bpo, bpp), "vase": (mpo, mpp)}
