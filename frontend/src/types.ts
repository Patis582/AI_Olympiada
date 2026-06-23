export interface Question {
  text: string;
  options: Record<string, string>; // {"A": "...", "B": "...", "C": "...", "D": "..."}
}

export interface Vitals {
  TF?: number;
  TK?: string;
  SpO2?: number;
  teplota?: number;
  DF?: number;
}

export interface Presentation {
  id: string;
  vek: number | string;
  pohlavi: string;
  hlavni_obtiz: string;
  symptomy: string[];
  datum: string;
  vitaly: Vitals;
}

export interface History {
  id?: string;
  rizikove_faktory: string[];
  predchozi_navstevy: number;
}

export interface QAPair {
  question: string;
  answer: string;
}

export interface TriageRecord {
  pid: string;
  patient_id: string | null;
  complaint: string;
  presentation: Presentation;
  history: History | null;
  ai_priority: number;
  ai_reasoning: string;
  confirmed_priority: number | null;
  qa_history: QAPair[];
  submitted_at: string;
}
