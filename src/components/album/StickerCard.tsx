import { Sticker } from "@/data/stickers";
import { getTeam } from "@/data/teams";

interface Props {
  sticker: Sticker;
  owned: boolean;
  count?: number;
  isNew?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const sizeMap = {
  sm: "w-16 h-24 text-[10px]",
  md: "w-24 h-36 text-xs",
  lg: "w-40 h-56 text-base",
};

export function StickerCard({ sticker, owned, count = 0, isNew, size = "md", onClick }: Props) {
  const team = getTeam(sticker.teamCode);
  if (!team) return null;

  const sizeClass = sizeMap[size];

  if (!owned) {
    return (
      <button
        onClick={onClick}
        className={`${sizeClass} rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex flex-col items-center justify-center text-slate-400 font-bold border-2 border-dashed border-slate-300 select-none active:scale-95 transition-transform`}
      >
        <div className="text-2xl opacity-50">?</div>
        <div className="mt-1">{sticker.teamCode}</div>
        <div className="opacity-60">{sticker.number}</div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${sizeClass} relative rounded-xl overflow-hidden shadow-md select-none active:scale-95 transition-transform ${
        isNew ? "animate-pop-in ring-4 ring-yellow-300" : ""
      }`}
      style={{
        background: `linear-gradient(135deg, ${team.color}cc, ${team.color}88, ${team.color}ee)`,
      }}
    >
      {sticker.shiny && <div className="shine absolute inset-0 z-10" />}
      <div className="absolute top-1 left-1 right-1 flex items-center justify-between text-white text-stroke font-extrabold">
        <span>{team.code}</span>
        <span>{sticker.number}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-5xl">
        {sticker.type === "badge" ? team.flag : sticker.type === "star" ? "⭐" : "👤"}
      </div>
      <div className="absolute bottom-1 left-1 right-1 text-white text-stroke font-bold text-center leading-tight">
        <div className="truncate">{sticker.label}</div>
      </div>
      {count > 1 && (
        <span className="absolute bottom-1 right-1 bg-yellow-400 text-black text-[10px] font-extrabold rounded-full px-1.5 py-0.5 z-20">
          x{count}
        </span>
      )}
    </button>
  );
}
