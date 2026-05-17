import { useEffect, useState, useSyncExternalStore } from "react";
import { ALL_STICKERS, Sticker } from "@/data/stickers";
import { CATEGORIES, Category, Level, LEVEL_META } from "@/data/trivia";

export type PlayerId = "dante" | "otto";

export interface PlayerProfile {
  id: PlayerId;
  name: string;
  emoji: string;
  defaultLevel: Level;
  color: string;
}

export const PLAYERS: Record<PlayerId, PlayerProfile> = {
  otto: {
    id: "otto",
    name: "Otto",
    emoji: "🦊",
    defaultLevel: "primaria-baja",
    color: "from-orange-400 to-amber-500",
  },
  dante: {
    id: "dante",
    name: "Dante",
    emoji: "⚡",
    defaultLevel: "primaria-alta",
    color: "from-sky-400 to-indigo-500",
  },
};

export function gradeLabel(level: Level): string {
  return LEVEL_META[level].short;
}

export interface CategoryStats {
  asked: number;
  correct: number;
}

export interface PlayerState {
  level: Level;
  ownedCounts: Record<string, number>;
  packsEarned: number;
  totalCorrect: number;
  totalAsked: number;
  currentStreak: number;
  bestStreak: number;
  byCategory: Record<Category, CategoryStats>;
  unopenedPacks: number;
  sessionElapsedMs: number;
  restingUntil: number | null;
  lastWarnedAtMs: number;
}

export interface GameState {
  activePlayer: PlayerId | null;
  players: Record<PlayerId, PlayerState>;
}

const STORAGE_KEY = "mundial-2026-album-v1";

function emptyCategoryStats(): Record<Category, CategoryStats> {
  return CATEGORIES.reduce((acc, c) => {
    acc[c] = { asked: 0, correct: 0 };
    return acc;
  }, {} as Record<Category, CategoryStats>);
}

function emptyPlayerState(level: Level = "primaria-baja"): PlayerState {
  return {
    level,
    ownedCounts: {},
    packsEarned: 0,
    totalCorrect: 0,
    totalAsked: 0,
    currentStreak: 0,
    bestStreak: 0,
    byCategory: emptyCategoryStats(),
    unopenedPacks: 0,
    sessionElapsedMs: 0,
    restingUntil: null,
    lastWarnedAtMs: 0,
  };
}

export const SESSION_LIMIT_MS = 30 * 60 * 1000;
export const REST_DURATION_MS = 20 * 60 * 1000;
const WARN_5_MS = 25 * 60 * 1000;
const WARN_1_MS = 29 * 60 * 1000;
const TICK_INTERVAL_MS = 5000;
const MAX_TICK_DELTA_MS = 15000;

export type SessionStatus =
  | { kind: "playing"; playMsRemaining: number; elapsedMs: number }
  | { kind: "resting"; restMsRemaining: number };

export function getSessionStatus(p: PlayerState, now = Date.now()): SessionStatus {
  if (p.restingUntil && p.restingUntil > now) {
    return { kind: "resting", restMsRemaining: p.restingUntil - now };
  }
  return {
    kind: "playing",
    elapsedMs: p.sessionElapsedMs,
    playMsRemaining: Math.max(0, SESSION_LIMIT_MS - p.sessionElapsedMs),
  };
}

function defaultState(): GameState {
  return {
    activePlayer: null,
    players: {
      dante: emptyPlayerState(PLAYERS.dante.defaultLevel),
      otto: emptyPlayerState(PLAYERS.otto.defaultLevel),
    },
  };
}

function migratePlayer(
  raw: Partial<PlayerState> | undefined,
  defaults: PlayerState
): PlayerState {
  const merged: PlayerState = { ...defaults, ...(raw ?? {}) };
  // Keep only known categories; ensure every category has stats
  const cleaned = emptyCategoryStats();
  const incoming = (raw?.byCategory ?? {}) as Record<string, CategoryStats>;
  for (const c of CATEGORIES) {
    if (incoming[c]) cleaned[c] = incoming[c];
  }
  merged.byCategory = cleaned;
  // Ensure level is one of the known levels
  const validLevels: Level[] = [
    "primaria-baja",
    "primaria-media",
    "primaria-alta",
    "secundaria-baja",
    "secundaria-alta",
  ];
  if (!validLevels.includes(merged.level)) merged.level = defaults.level;
  return merged;
}

function loadState(): GameState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as GameState;
    const base = defaultState();
    return {
      activePlayer: parsed.activePlayer ?? null,
      players: {
        dante: migratePlayer(parsed.players?.dante, base.players.dante),
        otto: migratePlayer(parsed.players?.otto, base.players.otto),
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
    const lvl = s.players[s.activePlayer].level;
    return { ...s, players: { ...s.players, [s.activePlayer]: emptyPlayerState(lvl) } };
  });
}

export function setActivePlayerLevel(level: Level) {
  setState((s) => {
    if (!s.activePlayer) return s;
    return {
      ...s,
      players: {
        ...s.players,
        [s.activePlayer]: { ...s.players[s.activePlayer], level },
      },
    };
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

// --- Session timer (Pomodoro-like for kids) ---

type SessionEvent = "warn-5" | "warn-1" | "rest-start" | null;

function addSessionTime(deltaMs: number): SessionEvent {
  let event: SessionEvent = null;
  setState((s) => {
    if (!s.activePlayer) return s;
    const id = s.activePlayer;
    const p = s.players[id];

    // Already resting: don't accumulate. If rest finished, clear it.
    if (p.restingUntil) {
      if (p.restingUntil <= Date.now()) {
        return {
          ...s,
          players: {
            ...s.players,
            [id]: { ...p, restingUntil: null, sessionElapsedMs: 0, lastWarnedAtMs: 0 },
          },
        };
      }
      return s;
    }

    const elapsed = p.sessionElapsedMs + deltaMs;
    const prev = p.sessionElapsedMs;
    let lastWarn = p.lastWarnedAtMs;

    if (elapsed >= SESSION_LIMIT_MS) {
      event = "rest-start";
      return {
        ...s,
        players: {
          ...s.players,
          [id]: {
            ...p,
            sessionElapsedMs: 0,
            restingUntil: Date.now() + REST_DURATION_MS,
            lastWarnedAtMs: 0,
          },
        },
      };
    }
    if (prev < WARN_1_MS && elapsed >= WARN_1_MS && lastWarn < WARN_1_MS) {
      event = "warn-1";
      lastWarn = WARN_1_MS;
    } else if (prev < WARN_5_MS && elapsed >= WARN_5_MS && lastWarn < WARN_5_MS) {
      event = "warn-5";
      lastWarn = WARN_5_MS;
    }

    return {
      ...s,
      players: {
        ...s.players,
        [id]: { ...p, sessionElapsedMs: elapsed, lastWarnedAtMs: lastWarn },
      },
    };
  });
  return event;
}

export interface SessionTickerHandlers {
  onWarn5?: () => void;
  onWarn1?: () => void;
  onRestStart?: () => void;
}

export function useSessionTicker(handlers: SessionTickerHandlers = {}) {
  const handlersRef = handlers;
  useEffect(() => {
    let lastTick = Date.now();
    let visible = typeof document !== "undefined" ? !document.hidden : true;

    function onVisibility() {
      visible = !document.hidden;
      lastTick = Date.now();
    }
    document.addEventListener("visibilitychange", onVisibility);

    const intervalId = window.setInterval(() => {
      // If a player is resting and the rest expired, clear it.
      const s = state;
      if (s.activePlayer) {
        const p = s.players[s.activePlayer];
        if (p.restingUntil && p.restingUntil <= Date.now()) {
          addSessionTime(0);
        }
      }
      if (!visible) {
        lastTick = Date.now();
        return;
      }
      if (!s.activePlayer) {
        lastTick = Date.now();
        return;
      }
      const now = Date.now();
      const delta = Math.min(now - lastTick, MAX_TICK_DELTA_MS);
      lastTick = now;
      if (delta <= 0) return;
      const event = addSessionTime(delta);
      if (event === "warn-5") handlersRef.onWarn5?.();
      else if (event === "warn-1") handlersRef.onWarn1?.();
      else if (event === "rest-start") handlersRef.onRestStart?.();
    }, TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Live countdown hook (re-renders every second when active)
export function useLiveNow(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return Date.now();
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
