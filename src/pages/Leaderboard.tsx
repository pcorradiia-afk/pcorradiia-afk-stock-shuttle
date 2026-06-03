import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/ui/card";
import { useLeaderboard } from "@/store/queries";
import { useAuth } from "@/store/auth";
import { PRIZE_SPLIT } from "@/data/rules";
import { formatMoney } from "@/lib/format";
import type { LeaderboardRow } from "@/lib/scoring";

const MEDAL = ["🥇", "🥈", "🥉"];

function Row({
  row,
  pos,
  prize,
  currency,
  me,
  open,
  onToggle,
}: {
  row: LeaderboardRow;
  pos: number;
  prize: number;
  currency: string;
  me: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const b = row.breakdown;
  return (
    <div
      className={`rounded-2xl border p-3 ${
        me ? "border-primary bg-primary/5" : "border-border bg-card"
      }`}
    >
      <button onClick={onToggle} className="w-full flex items-center gap-3 text-left">
        <span className="w-7 text-center text-lg font-extrabold">
          {MEDAL[pos] ?? pos + 1}
        </span>
        <Avatar name={row.profile.display_name} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">
            {row.profile.display_name}
            {me && <span className="text-xs text-primary"> (vos)</span>}
          </p>
          {prize > 0 && (
            <p className="text-xs text-emerald-600 font-semibold">
              Premio: {formatMoney(prize, currency)}
            </p>
          )}
        </div>
        <span className="text-xl font-extrabold tabular-nums">{b.total}</span>
      </button>

      {open && (
        <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Partidos</span>
          <span className="text-right font-semibold text-foreground">{b.matches}</span>
          <span>Campeón</span>
          <span className="text-right font-semibold text-foreground">{b.champion}</span>
          <span>Mejor jugador</span>
          <span className="text-right font-semibold text-foreground">{b.bestPlayer}</span>
          <span>Goleador</span>
          <span className="text-right font-semibold text-foreground">{b.topScorer}</span>
          <span>Asados</span>
          <span className="text-right font-semibold text-foreground">{b.asados}</span>
        </div>
      )}
    </div>
  );
}

export function Leaderboard() {
  const { profile } = useAuth();
  const { rows, pot, settings, isLoading } = useLeaderboard();
  const [openId, setOpenId] = useState<string | null>(null);
  const currency = settings?.currency ?? "ARS";

  const prizeFor = (pos: number) =>
    pos === 0 ? pot * PRIZE_SPLIT.first : pos === 1 ? pot * PRIZE_SPLIT.second : 0;

  return (
    <>
      <AppHeader title="Tabla de posiciones" subtitle="El que más sabe, gana 🧠" />
      <div className="px-4 py-4 space-y-4">
        {pot > 0 && (
          <Card className="p-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <p className="text-xs uppercase tracking-wide opacity-90">Pozo total</p>
            <p className="text-3xl font-extrabold">{formatMoney(pot, currency)}</p>
            <div className="flex gap-4 mt-2 text-sm">
              <span>🥇 70% · {formatMoney(pot * PRIZE_SPLIT.first, currency)}</span>
              <span>🥈 30% · {formatMoney(pot * PRIZE_SPLIT.second, currency)}</span>
            </div>
          </Card>
        )}

        {isLoading ? (
          <p className="text-center text-muted-foreground py-10">Cargando tabla…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            Todavía no hay jugadores.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row, i) => (
              <Row
                key={row.profile.id}
                row={row}
                pos={i}
                prize={prizeFor(i)}
                currency={currency}
                me={row.profile.id === profile?.id}
                open={openId === row.profile.id}
                onToggle={() =>
                  setOpenId(openId === row.profile.id ? null : row.profile.id)
                }
              />
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Tocá un jugador para ver el desglose de puntos.
        </p>
      </div>
    </>
  );
}
