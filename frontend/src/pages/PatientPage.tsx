import { useState } from "react";
import { api } from "../api";
import type { Question, QAPair } from "../types";
import { QuestionCard } from "../components/QuestionCard";

type Phase = "welcome" | "loading" | "questions" | "done";

interface QuestionState {
  questions: Question[];
  currentIndex: number;
  collectedAnswers: QAPair[];
  sessionId: string;
}

export function PatientPage() {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [complaint, setComplaint] = useState("");
  const [patientId, setPatientId] = useState("");
  const [error, setError] = useState("");
  const [qState, setQState] = useState<QuestionState | null>(null);

  const handleStart = async () => {
    if (!complaint.trim()) return;
    setError("");
    setPhase("loading");
    try {
      const res = await api.intakeStart(complaint.trim(), patientId.trim() || undefined);
      if (res.done) {
        setPhase("done");
        return;
      }
      setQState({ questions: res.questions, currentIndex: 0, collectedAnswers: [], sessionId: res.session_id });
      setPhase("questions");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chyba spojení");
      setPhase("welcome");
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!qState) return;
    const currentQ = qState.questions[qState.currentIndex];
    const newAnswers = [...qState.collectedAnswers, { question: currentQ.text, answer }];

    if (qState.currentIndex < qState.questions.length - 1) {
      // More questions in this round – show next locally
      setQState({ ...qState, currentIndex: qState.currentIndex + 1, collectedAnswers: newAnswers });
      return;
    }

    // All questions in this round answered – send to backend
    setPhase("loading");
    try {
      const res = await api.intakeRound(qState.sessionId, newAnswers);
      if (res.done || !res.questions.length) {
        setPhase("done");
        return;
      }
      setQState({ questions: res.questions, currentIndex: 0, collectedAnswers: [], sessionId: qState.sessionId });
      setPhase("questions");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chyba spojení");
      setPhase("done");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4 py-12">
      {/* Logo / header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">TriážAI</span>
        </div>
        <p className="text-gray-500 text-sm">Urgentní příjem · Vítejte</p>
      </div>

      <div className="w-full max-w-lg">
        {phase === "welcome" && (
          <div className="slide-up bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Popište svůj problém</h1>
            <p className="text-gray-500 text-sm mb-6">
              Napiše, co vás trápí. AI vám položí několik upřesňujících otázek.
            </p>

            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Např. Bolí mě na hrudi a jsem zadýchaný..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-gray-800 resize-none text-base"
            />

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Číslo pojišťence / ID pacienta{" "}
                <span className="text-gray-400 font-normal">(volitelné)</span>
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Např. P001"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-gray-800 text-sm"
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleStart}
              disabled={!complaint.trim()}
              className="mt-5 w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors text-base"
            >
              Začít →
            </button>

            <p className="mt-4 text-center text-xs text-gray-400">
              Vaše odpovědi jsou anonymní a slouží pouze pro triáž.
            </p>
          </div>
        )}

        {phase === "loading" && (
          <div className="slide-up bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="flex justify-center gap-1.5 mb-4">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
            <p className="text-gray-500 text-sm">AI zpracovává vaše informace…</p>
          </div>
        )}

        {phase === "questions" && qState && (
          <div>
            {/* Progress */}
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((qState.collectedAnswers.length) / 4) * 100, 90)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {qState.collectedAnswers.length + 1} / 4
              </span>
            </div>

            <QuestionCard
              key={`${qState.currentIndex}-${qState.questions[qState.currentIndex]?.text}`}
              question={qState.questions[qState.currentIndex]}
              questionNumber={qState.collectedAnswers.length + 1}
              totalQuestions={4}
              onAnswer={handleAnswer}
            />
          </div>
        )}

        {phase === "done" && (
          <div className="slide-up bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Žádost přijata</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Vaše informace byly předány zdravotnickému personálu.
              <br />Prosím vyčkejte, brzy vás zavoláme.
            </p>
            <button
              onClick={() => { setPhase("welcome"); setComplaint(""); setPatientId(""); }}
              className="mt-6 px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
              Nová žádost
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
