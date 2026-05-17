import { createAvatar } from "@dicebear/core";
import * as adventurer from "@dicebear/adventurer";

const cache = new Map<string, string>();

export function playerAvatarSvg(seed: string): string {
  const key = `p:${seed}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const svg = createAvatar(adventurer, {
    seed,
    radius: 50,
    backgroundColor: ["fef3c7", "fde68a"],
    backgroundType: ["gradientLinear"],
    scale: 95,
  }).toString();
  cache.set(key, svg);
  return svg;
}

export function legendAvatarSvg(seed: string): string {
  const key = `l:${seed}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const svg = createAvatar(adventurer, {
    seed: `legend-${seed}`,
    radius: 50,
    backgroundColor: ["fbbf24", "f59e0b"],
    backgroundType: ["gradientLinear"],
    scale: 100,
  }).toString();
  cache.set(key, svg);
  return svg;
}

