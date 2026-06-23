import type { QAPair, Question, TriageRecord } from "./types";

const BASE = "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export interface StartResponse {
  session_id: string;
  questions: Question[];
  done: boolean;
  priority: number | null;
  reasoning: string | null;
}

export interface RoundResponse {
  questions: Question[];
  done: boolean;
  priority: number | null;
  reasoning: string | null;
}

export const api = {
  intakeStart: (complaint: string, patient_id?: string) =>
    post<StartResponse>("/intake/start", { complaint, patient_id: patient_id || null }),

  intakeRound: (session_id: string, answers: QAPair[]) =>
    post<RoundResponse>("/intake/round", { session_id, answers }),

  adminTriage: () => get<TriageRecord[]>("/admin/triage"),

  adminSeed: () => post<{ ok: boolean; zprava: string }>("/admin/seed", {}),

  adminConfirm: (pid: string, priority: number) =>
    post<TriageRecord>(`/admin/triage/${pid}/confirm`, { priority }),
};
