import { useState } from "react";
import type { TriageRecord } from "../types";
import { PriorityBadge, PriorityLabel } from "./PriorityBadge";

interface Props {
  record: TriageRecord;
  onConfirm: (priority: number) => void;
}

const PRIORITY_COLORS: Record<number, string> = {
  1: "bg-red-500 text-white border-red-500",
  2: "bg-orange-500 text-white border-orange-500",
  3: "bg-amber-400 text-white border-amber-400",
  4: "bg-green-500 text-white border-green-500",
  5: "bg-gray-400 text-white border-gray-400",
};
const PRIORITY_IDLE = "bg-white text-gray-600 border-gray-200 hover:border-gray-400";

export function PatientDetail({ record, onConfirm }: Props) {
  const [selectedPriority, setSelectedPriority] = useState(
    record.confirmed_priority ?? record.ai_priority
  );
  const [saving, setSaving] = useState(false);
  const { presentation: pres, history: hist, ai_reasoning, qa_history, confirmed_priority } = record;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(selectedPriority);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-1">
          <PriorityBadge priority={record.ai_priority} size="lg" />
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">
              {pres.id} · {pres.vek} let · {pres.pohlavi}
            </h2>
            <PriorityLabel priority={record.ai_priority} />
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-2 italic">„{record.complaint}"</p>
      </div>

      <div className="flex-1 p-5 space-y-5">
        {/* Vitals */}
        {pres.vitaly && Object.keys(pres.vitaly).length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Vitály</h3>
            <div className="flex flex-wrap gap-2">
              {pres.vitaly.TF && <Chip label="TF" value={`${pres.vitaly.TF} bpm`} />}
              {pres.vitaly.TK && <Chip label="TK" value={pres.vitaly.TK} />}
              {pres.vitaly.SpO2 && (
                <Chip
                  label="SpO2"
                  value={`${pres.vitaly.SpO2}%`}
                  warn={pres.vitaly.SpO2 < 94}
                />
              )}
              {pres.vitaly.teplota && (
                <Chip
                  label="Teplota"
                  value={`${pres.vitaly.teplota}°C`}
                  warn={pres.vitaly.teplota > 38}
                />
              )}
              {pres.vitaly.DF && <Chip label="DF" value={`${pres.vitaly.DF}/min`} />}
            </div>
          </section>
        )}

        {/* Symptoms */}
        {pres.symptomy.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Symptomy</h3>
            <div className="flex flex-wrap gap-1.5">
              {pres.symptomy.map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Risk factors */}
        {hist && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Rizikové faktory z anamnézy
            </h3>
            {hist.rizikove_faktory.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {hist.rizikove_faktory.map((rf) => (
                  <span key={rf} className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100">
                    {rf}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Žádné rizikové faktory</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Předchozí návštěvy: {hist.predchozi_navstevy}
            </p>
          </section>
        )}

        {/* AI Q&A */}
        {qa_history.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Odpovědi na otázky AI
            </h3>
            <div className="space-y-2">
              {qa_history.map((qa, i) => (
                <div key={i} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-500">{qa.question}</p>
                  <p className="text-sm text-gray-800 font-medium mt-0.5">{qa.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI reasoning */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Odůvodnění AI
          </h3>
          <p className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 leading-relaxed">
            {ai_reasoning}
          </p>
        </section>
      </div>

      {/* Priority confirm */}
      <div className="p-5 border-t border-gray-100 bg-white">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Upravit a potvrdit prioritu
        </p>
        <div className="flex gap-2 mb-3">
          {[1, 2, 3, 4, 5].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`
                flex-1 h-10 rounded-lg border-2 font-bold text-sm transition-all
                ${selectedPriority === p ? PRIORITY_COLORS[p] : PRIORITY_IDLE}
              `}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className={`
            w-full py-3 rounded-xl font-semibold text-sm transition-colors
            ${confirmed_priority !== null
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
            }
            disabled:opacity-50
          `}
        >
          {saving ? "Ukládám…" : confirmed_priority !== null ? "✓ Aktualizovat prioritu" : "Potvrdit prioritu"}
        </button>
      </div>
    </div>
  );
}

function Chip({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <span className={`
      px-3 py-1.5 rounded-lg text-xs font-medium border
      ${warn ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-700"}
    `}>
      <span className="font-semibold">{label}</span> {value}
    </span>
  );
}
