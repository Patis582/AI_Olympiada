import { useState } from "react";
import type { Question } from "../types";

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
}

const OPTION_COLORS = [
  "hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700",
  "hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700",
  "hover:bg-violet-50 hover:border-violet-400 hover:text-violet-700",
  "hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700",
];

export function QuestionCard({ question, questionNumber, totalQuestions, onAnswer }: Props) {
  const [customText, setCustomText] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleOption = (key: string, value: string) => {
    if (key === "D" || value.toLowerCase().includes("jiné")) {
      setShowCustom(true);
      setSelected(key);
      return;
    }
    setSelected(key);
    setTimeout(() => onAnswer(value), 200);
  };

  const handleCustomSubmit = () => {
    if (customText.trim()) {
      onAnswer(customText.trim());
    }
  };

  const entries = Object.entries(question.options);

  return (
    <div className="slide-up bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Otázka {questionNumber} / {totalQuestions}
        </span>
      </div>
      <p className="text-gray-800 font-medium text-lg mb-5 leading-snug">{question.text}</p>

      <div className="flex flex-col gap-2">
        {entries.map(([key, value], i) => {
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => handleOption(key, value)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150
                ${isSelected
                  ? "bg-blue-600 border-blue-600 text-white"
                  : `bg-white border-gray-200 text-gray-700 ${OPTION_COLORS[i % OPTION_COLORS.length]}`
                }
              `}
            >
              <span className={`
                w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0
                ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}
              `}>
                {key}
              </span>
              <span className="font-medium">{value}</span>
            </button>
          );
        })}
      </div>

      {showCustom && (
        <div className="mt-4 slide-up">
          <input
            autoFocus
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            placeholder="Napište svoji odpověď..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-gray-800"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customText.trim()}
            className="mt-2 w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Potvrdit
          </button>
        </div>
      )}
    </div>
  );
}
