import { useMemo } from "react";
import { Sticker } from "@/data/stickers";
import { getTeam } from "@/data/teams";
import { legendAvatarSvg, playerAvatarSvg } from "@/lib/avatar";

interface Props {
  sticker: Sticker;
  owned: boolean;
  count?: number;
  isNew?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const sizeMap = {
  sm: { card: "w-16 h-24", title: "text-[9px]", nick: "text-[10px]", num: "text-[9px]", art: "w-12 h-12" },
  md: { card: "w-24 h-36", title: "text-[10px]", nick: "text-[11px]", num: "text-[10px]", art: "w-20 h-20" },
  lg: { card: "w-40 h-56", title: "text-xs", nick: "text-base", num: "text-xs", art: "w-32 h-32" },
};

export function StickerCard({ sticker, owned, count = 0, isNew, size = "md", onClick }: Props) {
  const team = getTeam(sticker.teamCode);
  const sz = sizeMap[size];

  const avatarSvg = useMemo(() => {
    if (!owned || !team) return null;
    if (sticker.type === "player" && sticker.nickname) {
      return playerAvatarSvg(`${team.code}-${sticker.nickname}`);
    }
    if (sticker.type === "star" && sticker.nickname) {
      return legendAvatarSvg(`${team.code}-${sticker.nickname}`);
    }
    return null;
  }, [owned, team, sticker.type, sticker.nickname]);

  if (!team) return null;

  if (!owned) {
    return (
      <button
        onClick={onClick}
        className={`${sz.card} rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex flex-col items-center justify-center text-slate-400 font-bold border-2 border-dashed border-slate-300 select-none active:scale-95 transition-transform`}
      >
        <div className="text-2xl opacity-50">?</div>
        <div className={`mt-1 ${sz.title}`}>{sticker.teamCode}</div>
        <div className={`opacity-60 ${sz.num}`}>{sticker.number}</div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${sz.card} relative rounded-xl overflow-hidden shadow-md select-none active:scale-95 transition-transform ${
        isNew ? "animate-pop-in ring-4 ring-yellow-300" : ""
      }`}
      style={{
        background: `linear-gradient(160deg, ${team.color} 0%, ${team.color}cc 55%, #ffffff22 100%)`,
      }}
    >
      {sticker.shiny && <div className="shine absolute inset-0 z-10 pointer-events-none" />}

      <div className={`absolute top-1 left-1.5 right-1.5 flex items-center justify-between text-white text-stroke font-extrabold z-20 ${sz.title}`}>
        <span className="inline-flex items-center gap-1">
          <span>{team.flag}</span>
          <span>{team.code}</span>
        </span>
        {sticker.jerseyNumber !== undefined ? (
          <span className="bg-white/85 text-slate-900 rounded-full px-1.5 leading-tight">
            {sticker.jerseyNumber}
          </span>
        ) : (
          <span>#{sticker.number}</span>
        )}
      </div>

      {renderArt(sticker, team, avatarSvg, sz.art)}

      <div className={`absolute bottom-1 left-1 right-1 text-white text-stroke font-extrabold text-center leading-tight z-20 ${sz.nick}`}>
        <div className="truncate">{sticker.nickname ?? sticker.label}</div>
        {sticker.position && (
          <div className={`opacity-90 font-bold ${sz.num} truncate`}>{sticker.position}</div>
        )}
        {sticker.type === "star" && (
          <div className={`opacity-90 font-bold ${sz.num} truncate`}>Leyenda ⭐</div>
        )}
        {sticker.type === "badge" && (
          <div className={`opacity-90 font-bold ${sz.num} truncate`}>{team.name}</div>
        )}
      </div>

      {count > 1 && (
        <span className="absolute bottom-1 right-1 bg-yellow-400 text-black text-[10px] font-extrabold rounded-full px-1.5 py-0.5 z-30">
          x{count}
        </span>
      )}
    </button>
  );
}

function renderArt(
  sticker: Sticker,
  team: { flag: string; color: string },
  avatarSvg: string | null,
  artClass: string
) {
  if (sticker.type === "badge") {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className={`${artClass} rounded-full flex items-center justify-center text-[2.5em] bg-white/85 shadow-inner border-4`}
          style={{ borderColor: team.color }}
        >
          {team.flag}
        </div>
      </div>
    );
  }

  if (sticker.type === "star") {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div
          className={`${artClass} rounded-full overflow-hidden border-4 border-yellow-300 shadow-lg relative`}
        >
          {avatarSvg ? (
            <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: avatarSvg }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">⭐</div>
          )}
          <div className="shine absolute inset-0 pointer-events-none" />
        </div>
      </div>
    );
  }

  // player
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div
        className={`${artClass} rounded-full overflow-hidden border-4 border-white/80 shadow-md bg-white/30`}
      >
        {avatarSvg ? (
          <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: avatarSvg }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
        )}
      </div>
    </div>
  );
}
