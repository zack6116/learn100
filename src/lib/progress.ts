import { TRACK_ID } from "@/data/track";

export type Mastery = "new" | "learning" | "explain" | "solid";

export type ConceptProgress = {
  mastery: Mastery;
  heard: boolean;
  days: string[];
};

export type Store = {
  version: 1;
  dailyGoal: number;
  voice: boolean;
  tracks: Record<string, Record<string, ConceptProgress>>;
};

const KEY = "learn100.v1";
export const PROGRESS_EVENT = "learn100:progress";

const RANK: Record<Mastery, number> = {
  new: 0,
  learning: 1,
  explain: 2,
  solid: 3,
};

export function freshStore(): Store {
  return {
    version: 1,
    dailyGoal: 3,
    voice: true,
    tracks: { [TRACK_ID]: {} },
  };
}

export function todayKey(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function bumpMastery(current: Mastery, next: Mastery): Mastery {
  return RANK[next] > RANK[current] ? next : current;
}

export function loadStore(): Store {
  if (typeof window === "undefined") return freshStore();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return freshStore();
  const parsed = JSON.parse(raw) as Partial<Store>;
  if (!parsed || parsed.version !== 1 || typeof parsed.tracks !== "object") {
    throw new Error("corrupt");
  }
  const goal = [1, 2, 3, 5].includes(Number(parsed.dailyGoal)) ? Number(parsed.dailyGoal) : 3;
  return {
    version: 1,
    dailyGoal: goal,
    voice: parsed.voice !== false,
    tracks: {
      [TRACK_ID]: parsed.tracks?.[TRACK_ID] ?? {},
    },
  };
}

export function saveStore(store: Store) {
  window.localStorage.setItem(KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function conceptProgress(store: Store, id: number): ConceptProgress {
  return (
    store.tracks[TRACK_ID]?.[String(id)] ?? {
      mastery: "new",
      heard: false,
      days: [],
    }
  );
}

export function isLit(mastery: Mastery): boolean {
  return mastery === "explain" || mastery === "solid";
}

export function pillLabel(progress: ConceptProgress): string {
  if (progress.mastery === "solid") return "讲透";
  if (progress.mastery === "explain") return "能讲";
  if (progress.mastery === "learning" || progress.heard) return "听过";
  return "未学";
}

export function mapLabel(progress: ConceptProgress): Mastery {
  if (progress.mastery === "new" && progress.heard) return "learning";
  return progress.mastery;
}

export function withConcept(store: Store, id: number, progress: ConceptProgress): Store {
  return {
    ...store,
    tracks: {
      ...store.tracks,
      [TRACK_ID]: {
        ...(store.tracks[TRACK_ID] ?? {}),
        [String(id)]: progress,
      },
    },
  };
}

export function markPracticed(store: Store, id: number, mastery: Mastery): Store {
  const current = conceptProgress(store, id);
  const day = todayKey();
  return withConcept(store, id, {
    mastery: bumpMastery(current.mastery, mastery),
    heard: true,
    days: current.days.includes(day) ? current.days : [...current.days, day],
  });
}

export function resetTrack(store: Store): Store {
  return { ...store, tracks: { ...store.tracks, [TRACK_ID]: {} } };
}
