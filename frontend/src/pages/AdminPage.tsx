import { useEffect, useState, useCallback } from "react";
import { api } from "../api";
import type { TriageRecord } from "../types";
import { PatientCard } from "../components/PatientCard";
import { PatientDetail } from "../components/PatientDetail";
import { PriorityBadge } from "../components/PriorityBadge";

export function AdminPage() {
  const [records, setRecords] = useState<TriageRecord[]>([]);
  const [selected, setSelected] = useState<TriageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const data = await api.adminTriage();
      setRecords(data);
      if (selected) {
        const updated = data.find((r) => r.pid === selected.pid);
        if (updated) setSelected(updated);
      }
    } catch {}
  }, [selected]);

  useEffect(() => {
    fetchRecords();
    setLoading(false);
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.adminSeed();
      await fetchRecords();
    } finally {
      setSeeding(false);
    }
  };

  const handleConfirm = async (priority: number) => {
    if (!selected) return;
    const updated = await api.adminConfirm(selected.pid, priority);
    setRecords((prev) => prev.map((r) => (r.pid === updated.pid ? updated : r)));
    setSelected(updated);
  };

  const confirmed = records
    .filter((r) => r.confirmed_priority !== null)
    .sort((a, b) => (a.confirmed_priority ?? 9) - (b.confirmed_priority ?? 9));

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-bold text-gray-900">TriážAI</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Přehled triáže</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{records.length} pacientů ve frontě</span>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {seeding ? "Načítám…" : "Demo data"}
          </button>
          <button
            onClick={fetchRecords}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            ↻ Obnovit
          </button>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: AI suggestions */}
        <div className="w-72 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Návrhy AI
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Seřazeno dle priority</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Načítám…</p>
            ) : records.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-gray-400 mb-3">Zatím žádní pacienti</p>
                <button
                  onClick={handleSeed}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Načíst demo data →
                </button>
              </div>
            ) : (
              records.map((r) => (
                <PatientCard
                  key={r.pid}
                  record={r}
                  isSelected={selected?.pid === r.pid}
                  onClick={() => setSelected(r)}
                />
              ))
            )}
          </div>
        </div>

        {/* MIDDLE: Confirmed queue */}
        <div className="w-56 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Potvrzená fronta
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{confirmed.length} pacientů</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {confirmed.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Zatím žádní potvrzení pacienti
              </p>
            ) : (
              confirmed.map((r, i) => (
                <button
                  key={r.pid}
                  onClick={() => setSelected(r)}
                  className={`
                    w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all
                    ${selected?.pid === r.pid
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-100 bg-white hover:bg-gray-50"
                    }
                  `}
                >
                  <span className="text-sm font-bold text-gray-400 w-5 text-center">{i + 1}</span>
                  <PriorityBadge priority={r.confirmed_priority!} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{r.pid}</p>
                    <p className="text-xs text-gray-400 truncate">{r.presentation.vek} let</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Patient detail */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          {selected ? (
            <PatientDetail
              key={selected.pid}
              record={selected}
              onConfirm={handleConfirm}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">Vyberte pacienta ze seznamu</p>
                <p className="text-gray-400 text-xs mt-1">Klikněte na kartu vlevo pro zobrazení detailu</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
