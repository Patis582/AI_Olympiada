import type { TriageRecord } from "../types";
import { PriorityBadge, priorityBg } from "./PriorityBadge";

interface Props {
  record: TriageRecord;
  isSelected: boolean;
  isHighlighted?: boolean;
  onClick: () => void;
}

export function PatientCard({ record, isSelected, isHighlighted, onClick }: Props) {
  const { presentation: pres, ai_priority, complaint, confirmed_priority } = record;
  const isUrgent = ai_priority <= 2;

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border p-4 transition-all duration-150
        ${isSelected
          ? "border-blue-400 bg-blue-50 shadow-md ring-2 ring-blue-100"
          : isHighlighted
          ? "border-blue-300 bg-blue-50/50"
          : `${priorityBg(ai_priority)} hover:shadow-sm`
        }
      `}
    >
      <div className="flex items-start gap-3">
        <PriorityBadge priority={ai_priority} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">
              {pres.id} · {pres.vek} let · {pres.pohlavi}
            </span>
            {isUrgent && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                URGENTNÍ
              </span>
            )}
            {confirmed_priority !== null && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                ✓ Potvrzeno
              </span>
            )}
          </div>
          <p className="text-gray-600 text-sm mt-0.5 truncate">{complaint}</p>
          <p className="text-gray-400 text-xs mt-1">{record.submitted_at}</p>
        </div>
      </div>
    </button>
  );
}
