import { useEffect, useSyncExternalStore } from "react";
import { ALL_STICKERS, Sticker } from "@/data/stickers";
import { Category } from "@/data/trivia";

export type PlayerId = "dante" | "otto";

export interface PlayerProfile {
  id: PlayerId;
  name: string;
  emoji: string;
  grade: string;
  level: "facil" | "medio";
  color: string;
}

export const PLAYERS: Record<PlayerId, PlayerProfile> = {
  otto: {
    id: "otto",
    name: "Otto",
    emoji: "🦊",
    grade: "2° grado",
    level: "facil",
    color: "from-orange-400 to-amber-500",
  },
  dante: {
    id: "dante",
    name: "Dante",
    emoji: "⚡",
    grade: "5° grado",
    level: "medio",
    color: "from-sky-400 to-indigo-500",
  },
};

export interface CategoryStats {
  asked: number;
  correct: number;
}

export interface PlayerState {
  ownedCounts: Record<string, number>;
  packsEarned: number;
  totalCorrect: number;
  totalAsked: number;
  currentStreak: number;
  bestStreak: number;
  byCategory: Record<Category, CategoryStats>;
  unopenedPacks: number;
}

export interface GameState {
  activePlayer: PlayerId | null;
  players: Record<PlayerId, PlayerState>;
}

const STORAGE_KEY = "mundial-2026-album-v1";

function emptyPlayerState(): PlayerState {
  return {
    ownedCounts: {},
    packsEarned: 0,
    totalCorrect: 0,
    totalAsked: 0,
    currentStreak: 0,
    bestStreak: 0,
    byCategory: {
      geografia: { asked: 0, correct: 0 },
      historia: { asked: 0, correct: 0 },
      matematica: { asked: 0, correct: 0 },
      ingles: { asked: 0, correct: 0 },
      futbol: { asked: 0, correct: 0 },
    },
    unopenedPacks: 0,
  };
}

function defaultState(): GameState {
  return {
    activePlayer: null,
    players: {
      dante: emptyPlayerState(),
      otto: emptyPlayerState(),
    },
  };
}

function loadState(): GameState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as GameState;
    // shallow merge with defaults to handle migrations
    const base = defaultState();
    return {
      activePlayer: parsed.activePlayer ?? null,
      players: {
        dante: { ...base.players.dante, ...(parsed.players?.dante ?? {}), byCategory: { ...base.players.dante.byCategory, ...(parsed.players?.dante?.byCategory ?? {}) } },
        otto: { ...base.players.otto, ...(parsed.players?.otto ?? {}), byCategory: { ...base.players.otto.byCategory, ...(parsed.players?.otto?.byCategory ?? {}) } },
      },
    };
  } catch {
    return defaultState();
  }
}

let state: GameState = loadState();
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota issues
  }
}

function setState(updater: (prev: GameState) => GameState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useGameState(): GameState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function useActivePlayer(): { id: PlayerId; profile: PlayerProfile; state: PlayerState } | null {
  const s = useGameState();
  if (!s.activePlayer) return null;
  return {
    id: s.activePlayer,
    profile: PLAYERS[s.activePlayer],
    state: s.players[s.activePlayer],
  };
}

// --- Actions ---

export function selectPlayer(id: PlayerId) {
  setState((s) => ({ ...s, activePlayer: id }));
}

export function clearPlayer() {
  setState((s) => ({ ...s, activePlayer: null }));
}

export function recordAnswer(category: Category, correct: boolean) {
  setState((s) => {
    if (!s.activePlayer) return s;
    const id = s.activePlayer;
    const p = s.players[id];
    const cat = p.byCategory[category];
    const next: PlayerState = {
      ...p,
      totalAsked: p.totalAsked + 1,
      totalCorrect: p.totalCorrect + (correct ? 1 : 0),
      currentStreak: correct ? p.currentStreak + 1 : 0,
      bestStreak: Math.max(p.bestStreak, correct ? p.currentStreak + 1 : p.bestStreak),
      byCategory: {
        ...p.byCategory,
        [category]: {
          asked: cat.asked + 1,
          correct: cat.correct + (correct ? 1 : 0),
        },
      },
    };
    return { ...s, players: { ...s.players, [id]: next } };
  });
}

export function awardSingle(stickerId: string) {
  setState((s) => {
    if (!s.activePlayer) return s;
    const id = s.activePlayer;
    const p = s.players[id];
    return {
      ...s,
      players: {
        ...s.players,
        [id]: {
          ...p,
          ownedCounts: { ...p.ownedCounts, [stickerId]: (p.ownedCounts[stickerId] ?? 0) + 1 },
        },
      },
    };
  });
}

export function awardPack(count = 1) {
  setState((s) => {
    if (!s.activePlayer) return s;
    const id = s.activePlayer;
    const p = s.players[id];
    return {
      ...s,
      players: {
        ...s.players,
        [id]: {
          ...p,
          packsEarned: p.packsEarned + count,
          unopenedPacks: p.unopenedPacks + count,
        },
      },
    };
  });
}

const STICKERS_PER_PACK = 4;

export function openOnePack(): Sticker[] {
  if (!state.activePlayer) return [];
  const id = state.activePlayer;
  const p = state.players[id];
  if (p.unopenedPacks <= 0) return [];

  const missing = ALL_STICKERS.filter((s) => !p.ownedCounts[s.id]);
  const drawn: Sticker[] = [];
  for (let i = 0; i < STICKERS_PER_PACK; i++) {
    // 70% chance to favor missing stickers if any available
    const favorMissing = missing.length > 0 && Math.random() < 0.7;
    const pool = favorMissing ? missing : ALL_STICKERS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    drawn.push(pick);
    // remove from missing if we just drew it
    const idx = missing.findIndex((m) => m.id === pick.id);
    if (idx >= 0) missing.splice(idx, 1);
  }

  setState((s) => {
    if (!s.activePlayer) return s;
    const cur = s.players[s.activePlayer];
    const newCounts = { ...cur.ownedCounts };
    drawn.forEach((d) => {
      newCounts[d.id] = (newCounts[d.id] ?? 0) + 1;
    });
    return {
      ...s,
      players: {
        ...s.players,
        [s.activePlayer]: {
          ...cur,
          ownedCounts: newCounts,
          unopenedPacks: cur.unopenedPacks - 1,
        },
      },
    };
  });

  return drawn;
}

export function tradeDuplicatesForSticker(): Sticker | null {
  if (!state.activePlayer) return null;
  const id = state.activePlayer;
  const p = state.players[id];

  // collect duplicates (count > 1)
  const duplicateIds = Object.entries(p.ownedCounts)
    .filter(([, n]) => n > 1)
    .flatMap(([sid, n]) => Array(n - 1).fill(sid)) as string[];

  if (duplicateIds.length < 5) return null;
  const missing = ALL_STICKERS.filter((s) => !p.ownedCounts[s.id]);
  if (missing.length === 0) return null;

  const pick = missing[Math.floor(Math.random() * missing.length)];

  // consume 5 duplicates
  const toConsume = duplicateIds.slice(0, 5);
  setState((s) => {
    if (!s.activePlayer) return s;
    const cur = s.players[s.activePlayer];
    const newCounts = { ...cur.ownedCounts };
    toConsume.forEach((sid) => {
      newCounts[sid] = (newCounts[sid] ?? 0) - 1;
      if (newCounts[sid] <= 0) delete newCounts[sid];
    });
    newCounts[pick.id] = (newCounts[pick.id] ?? 0) + 1;
    return {
      ...s,
      players: {
        ...s.players,
        [s.activePlayer]: { ...cur, ownedCounts: newCounts },
      },
    };
  });

  return pick;
}

export function resetActivePlayer() {
  setState((s) => {
    if (!s.activePlayer) return s;
    return { ...s, players: { ...s.players, [s.activePlayer]: emptyPlayerState() } };
  });
}

// One-time hook to sync across tabs
export function useStorageSync() {
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        state = loadState();
        listeners.forEach((l) => l());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
