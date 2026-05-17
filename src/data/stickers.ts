import { TEAMS, Team } from "./teams";
import { getTeamRoster, PlayerPosition } from "./players";

export type StickerType = "badge" | "player" | "star";

export interface Sticker {
  id: string;
  teamCode: string;
  number: number;
  type: StickerType;
  label: string;
  shiny: boolean;
  nickname?: string;
  position?: PlayerPosition;
  jerseyNumber?: number;
}

function buildTeamStickers(team: Team): Sticker[] {
  const roster = getTeamRoster(team.code);
  const result: Sticker[] = [];

  result.push({
    id: `${team.code}-1`,
    teamCode: team.code,
    number: 1,
    type: "badge",
    label: "Escudo",
    shiny: true,
  });

  roster.players.forEach((p, i) => {
    result.push({
      id: `${team.code}-${i + 2}`,
      teamCode: team.code,
      number: i + 2,
      type: "player",
      label: p.nickname,
      shiny: false,
      nickname: p.nickname,
      position: p.position,
      jerseyNumber: p.number,
    });
  });

  result.push({
    id: `${team.code}-6`,
    teamCode: team.code,
    number: 6,
    type: "star",
    label: roster.legend,
    shiny: true,
    nickname: roster.legend,
  });

  return result;
}

export const ALL_STICKERS: Sticker[] = TEAMS.flatMap(buildTeamStickers);

export const STICKERS_PER_TEAM = 6;
export const TOTAL_STICKERS = ALL_STICKERS.length;

export const STICKERS_BY_TEAM: Record<string, Sticker[]> = TEAMS.reduce(
  (acc, team) => {
    acc[team.code] = ALL_STICKERS.filter((s) => s.teamCode === team.code);
    return acc;
  },
  {} as Record<string, Sticker[]>
);

export const getSticker = (id: string) => ALL_STICKERS.find((s) => s.id === id);
