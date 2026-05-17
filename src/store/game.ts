import { useEffect, useState, useSyncExternalStore } from "react";
import { ALL_STICKERS, Sticker } from "@/data/stickers";
import { CATEGORIES, Category, Level, LEVEL_META } from "@/data/trivia";

export type PlayerId = string;

export interface PlayerProfile {
  id: PlayerId;
  name: string;
  emoji: string;
  defaultLevel: Level;
  color: string;
}

export const PROFILE_COLORS: string[] = [
  "from-sky-400 to-indigo-500",
  "from-orange-400 to-amber-500",
  "from-emerald-400 to-teal-500",
  "from-pink-400 to-rose-500",
  "from-violet-400 to-fuchsia-500",
  "from-yellow-400 to-orange-500",
  "from-lime-400 to-green-500",
  "from-red-400 to-rose-500",
];

export const PROFILE_EMOJIS: string[] = [
  "⚡", "🦊", "⚽", "🐯", "🦁", "🐼", "🐨", "🐸",
  "🦄", "🐲", "🦖", "🐙", "🦈", "🐺", "🐵", "🐶",
  "🐱", "🚀", "🏆", "🎮", "🎯", "🌟", "🔥", "💫",
];

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
  profiles: Record<PlayerId, PlayerProfile>;
  profileOrder: PlayerId[];
  players: Record<PlayerId, PlayerState>;
}

const STORAGE_KEY = "mundial-2026-album-v2";
const LEGACY_STORAGE_KEY = "mundial-2026-album-v1";

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

const SEED_PROFILES: PlayerProfile[] = [
  {
    id: "dante",
    name: "Dante",
    emoji: "⚡",
    defaultLevel: "primaria-alta",
    color: "from-sky-400 to-indigo-500",
  },
  {
    id: "otto",
    name: "Otto",
    emoji: "🦊",
    defaultLevel: "primaria-baja",
    color: "from-orange-400 to-amber-500",
  },
];

function defaultState(): GameState {
  const profiles: Record<PlayerId, PlayerProfile> = {};
  const players: Record<PlayerId, PlayerState> = {};
  const order: PlayerId[] = [];
  for (const p of SEED_PROFILES) {
    profiles[p.id] = p;
    players[p.id] = emptyPlayerState(p.defaultLevel);
    order.push(p.id);
  }
  return { activePlayer: null, profiles, profileOrder: order, players };
}

const VALID_LEVELS: Level[] = [
  "primaria-baja",
  "primaria-media",
  "primaria-alta",
  "secundaria-baja",
  "secundaria-alta",
];

function migratePlayer(
  raw: Partial<PlayerState> | undefined,
  defaults: PlayerState
): PlayerState {
  const merged: PlayerState = { ...defaults, ...(raw ?? {}) };
  const cleaned = emptyCategoryStats();
  const incoming = (raw?.byCategory ?? {}) as Record<string, CategoryStats>;
  for (const c of CATEGORIES) {
    if (incoming[c]) cleaned[c] = incoming[c];
  }
  merged.byCategory = cleaned;
  if (!VALID_LEVELS.includes(merged.level)) merged.level = defaults.level;
  return merged;
}

interface LegacyV1State {
  activePlayer: string | null;
  players: Record<string, Partial<PlayerState>>;
}

function loadLegacyV1(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyV1State;
    const base = defaultState();
    for (const seed of SEED_PROFILES) {
      const oldPlayer = parsed.players?.[seed.id];
      if (oldPlayer) {
        base.players[seed.id] = migratePlayer(oldPlayer, base.players[seed.id]);
      }
    }
    if (parsed.activePlayer && base.profiles[parsed.activePlayer]) {
      base.activePlayer = parsed.activePlayer;
    }
    return base;
  } catch {
    return null;
  }
}

function loadState(): GameState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fromLegacy = loadLegacyV1();
      return fromLegacy ?? defaultState();
    }
    const parsed = JSON.parse(raw) as Partial<GameState>;
    const base = defaultState();
    const profiles: Record<PlayerId, PlayerProfile> = {};
    const players: Record<PlayerId, PlayerState> = {};
    const order: PlayerId[] = [];

    const rawProfiles = parsed.profiles ?? {};
    const rawPlayers = parsed.players ?? {};
    const rawOrder = Array.isArray(parsed.profileOrder)
      ? parsed.profileOrder
      : Object.keys(rawProfiles);

    for (const id of rawOrder) {
      const p = rawProfiles[id];
      if (!p) continue;
      const profile: PlayerProfile = {
        id,
        name: p.name || id,
        emoji: p.emoji || "⚽",
        defaultLevel: VALID_LEVELS.includes(p.defaultLevel) ? p.defaultLevel : "primaria-baja",
        color: p.color || PROFILE_COLORS[order.length % PROFILE_COLORS.length],
      };
      profiles[id] = profile;
      const defaults = emptyPlayerState(profile.defaultLevel);
      players[id] = migratePlayer(rawPlayers[id], defaults);
      order.push(id);
    }

    // Fallback: if storage is empty/corrupt and we ended up with no profiles, seed defaults.
    if (order.length === 0) return base;

    const activePlayer =
      parsed.activePlayer && profiles[parsed.activePlayer] ? parsed.activePlayer : null;

    return { activePlayer, profiles, profileOrder: order, players };
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
  const profile = s.profiles[s.activePlayer];
  const playerState = s.players[s.activePlayer];
  if (!profile || !playerState) return null;
  return { id: s.activePlayer, profile, state: playerState };
}

export function listProfiles(s: GameState): PlayerProfile[] {
  return s.profileOrder
    .map((id) => s.profiles[id])
    .filter((p): p is PlayerProfile => Boolean(p));
}

// --- Actions ---

export function selectPlayer(id: PlayerId) {
  setState((s) => (s.profiles[id] ? { ...s, activePlayer: id } : s));
}

export function clearPlayer() {
  setState((s) => ({ ...s, activePlayer: null }));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32);
}

function uniqueId(base: string, taken: Record<string, unknown>): string {
  const root = base || "jugador";
  if (!taken[root]) return root;
  let i = 2;
  while (taken[`${root}-${i}`]) i++;
  return `${root}-${i}`;
}

export interface CreateProfileInput {
  name: string;
  emoji?: string;
  color?: string;
  level?: Level;
}

export function createProfile(input: CreateProfileInput): PlayerId | null {
  const name = input.name.trim();
  if (!name) return null;
  let newId: PlayerId | null = null;
  setState((s) => {
    const id = uniqueId(slugify(name), s.profiles);
    const color = input.color || PROFILE_COLORS[s.profileOrder.length % PROFILE_COLORS.length];
    const emoji = input.emoji || PROFILE_EMOJIS[s.profileOrder.length % PROFILE_EMOJIS.length];
    const level = input.level && VALID_LEVELS.includes(input.level) ? input.level : "primaria-baja";
    const profile: PlayerProfile = { id, name, emoji, defaultLevel: level, color };
    newId = id;
    return {
      ...s,
      profiles: { ...s.profiles, [id]: profile },
      profileOrder: [...s.profileOrder, id],
      players: { ...s.players, [id]: emptyPlayerState(level) },
    };
  });
  return newId;
}

export interface UpdateProfileInput {
  name?: string;
  emoji?: string;
  color?: string;
}

export function updateProfile(id: PlayerId, patch: UpdateProfileInput) {
  setState((s) => {
    const existing = s.profiles[id];
    if (!existing) return s;
    const updated: PlayerProfile = {
      ...existing,
      ...(patch.name !== undefined ? { name: patch.name.trim() || existing.name } : {}),
      ...(patch.emoji ? { emoji: patch.emoji } : {}),
      ...(patch.color ? { color: patch.color } : {}),
    };
    return { ...s, profiles: { ...s.profiles, [id]: updated } };
  });
}

export function deleteProfile(id: PlayerId) {
  setState((s) => {
    if (!s.profiles[id]) return s;
    const profiles = { ...s.profiles };
    delete profiles[id];
    const players = { ...s.players };
    delete players[id];
    const profileOrder = s.profileOrder.filter((p) => p !== id);
    const activePlayer = s.activePlayer === id ? null : s.activePlayer;
    return { ...s, profiles, players, profileOrder, activePlayer };
  });
}

export function recordAnswer(category: Category, correct: boolean) {
  setState((s) => {
    if (!s.activePlayer) return s;
    const id = s.activePlayer;
    const p = s.players[id];
    if (!p) return s;
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
    if (!p) return s;
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
    if (!p) return s;
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
  if (!p || p.unopenedPacks <= 0) return [];

  const missing = ALL_STICKERS.filter((s) => !p.ownedCounts[s.id]);
  const drawn: Sticker[] = [];
  for (let i = 0; i < STICKERS_PER_PACK; i++) {
    const favorMissing = missing.length > 0 && Math.random() < 0.7;
    const pool = favorMissing ? missing : ALL_STICKERS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    drawn.push(pick);
    const idx = missing.findIndex((m) => m.id === pick.id);
    if (idx >= 0) missing.splice(idx, 1);
  }

  setState((s) => {
    if (!s.activePlayer) return s;
    const cur = s.players[s.activePlayer];
    if (!cur) return s;
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
  if (!p) return null;

  const duplicateIds = Object.entries(p.ownedCounts)
    .filter(([, n]) => n > 1)
    .flatMap(([sid, n]) => Array(n - 1).fill(sid)) as string[];

  if (duplicateIds.length < 5) return null;
  const missing = ALL_STICKERS.filter((s) => !p.ownedCounts[s.id]);
  if (missing.length === 0) return null;

  const pick = missing[Math.floor(Math.random() * missing.length)];

  const toConsume = duplicateIds.slice(0, 5);
  setState((s) => {
    if (!s.activePlayer) return s;
    const cur = s.players[s.activePlayer];
    if (!cur) return s;
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
    const cur = s.players[s.activePlayer];
    if (!cur) return s;
    return {
      ...s,
      players: { ...s.players, [s.activePlayer]: emptyPlayerState(cur.level) },
    };
  });
}

export function setActivePlayerLevel(level: Level) {
  setState((s) => {
    if (!s.activePlayer) return s;
    const cur = s.players[s.activePlayer];
    if (!cur) return s;
    return {
      ...s,
      players: { ...s.players, [s.activePlayer]: { ...cur, level } },
    };
  });
}

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
    if (!p) return s;

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
      const s = state;
      if (s.activePlayer) {
        const p = s.players[s.activePlayer];
        if (p?.restingUntil && p.restingUntil <= Date.now()) {
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
