import { DEFAULT_PROFILE, HistoryEntry, Profile } from "./types";

const PROFILE_KEY = "dining-helper.profile";
const HISTORY_KEY = "dining-helper.history";

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile) {
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function appendHistory(entry: HistoryEntry) {
  const history = loadHistory();
  history.push(entry);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function updateLastHistorySelection(placeId: string) {
  const history = loadHistory();
  if (history.length === 0) return;
  history[history.length - 1].selected = placeId;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function updateLastHistorySatisfaction(satisfaction: boolean) {
  const history = loadHistory();
  if (history.length === 0) return;
  history[history.length - 1].satisfaction = satisfaction;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearAll() {
  window.localStorage.removeItem(PROFILE_KEY);
  window.localStorage.removeItem(HISTORY_KEY);
}
