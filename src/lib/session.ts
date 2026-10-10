export type FeedbackSession = {
  conceptId: number;
  userText: string;
  covered: number[];
  tip: string;
  fromModel: boolean;
};

const KEY = "learn100.session";

export function saveSession(session: FeedbackSession) {
  window.sessionStorage.setItem(KEY, JSON.stringify(session));
}

export function readSession(conceptId: number): FeedbackSession | null {
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FeedbackSession;
    if (parsed.conceptId !== conceptId) return null;
    if (!Array.isArray(parsed.covered)) return null;
    return parsed;
  } catch {
    return null;
  }
}
