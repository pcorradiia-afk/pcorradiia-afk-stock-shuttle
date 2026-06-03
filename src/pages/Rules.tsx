import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { POINTS, ASADO_MIN_GUESTS, PRIZE_SPLIT } from "@/data/rules";
import { useLeaderboard, useProfiles } from "@/store/queries";
import { formatMoney } from "@/lib/format";

function Rule({ pts, children }: { pts: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
      <span className="text-sm">{children}</span>
      <span className="text-sm font-extrabold text-amber-600 whitespace-nowrap">
        {pts}
      </span>
    </div>
  );
}

export function Rules() {
  const { pot, settings } = useLeaderboard();
  const profiles = useProfiles();
  const currency = settings?.currency ?? "ARS";
  const payers = (profiles.data ?? []).filter((p) => p.paid).length;
  const entry = settings?.entry_amount ?? 0;

  return (
    <>
      <AppHeader title="Reglas y pozo" subtitle="Cómo se suman los puntos" />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4">
          <h2 className="font-bold mb-1">⚽ Partidos</h2>
          <Rule pts={`${POINTS.outcome} pts`}>
            Acertás el resultado (gana / empata / pierde)
          </Rule>
          <Rule pts={`${POINTS.exact} pts`}>
            Acertás el marcador exacto (no se suma al anterior)
          </Rule>
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-1">🌟 Pronósticos Plus</h2>
          <Rule pts={`${POINTS.champion} pts`}>Campeón del mundo</Rule>
          <Rule pts={`${POINTS.bestPlayer} pts`}>Mejor jugador del Mundial</Rule>
          <Rule pts={`${POINTS.topScorer} pts`}>Goleador del Mundial</Rule>
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-1">🔥 Asados del grupo</h2>
          <Rule pts={`${POINTS.asadoAttendee} pts`}>
            Por participar (mín. {ASADO_MIN_GUESTS} comensales del grupo)
          </Rule>
          <Rule pts={`+${POINTS.asadoHost} pts`}>Extra para quien pone la sede</Rule>
          <p className="text-xs text-muted-foreground mt-2">
            Vale durante toda la Copa del Mundo. El admin confirma que el asado fue
            válido.
          </p>
        </Card>

        <Card className="p-4">
          <h2 className="font-bold mb-2">💰 El pozo</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entrada por persona</span>
              <span className="font-semibold">{formatMoney(entry, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jugadores que pagaron</span>
              <span className="font-semibold">{payers}</span>
            </div>
            <div className="flex justify-between pt-1 border-t">
              <span className="font-bold">Pozo total</span>
              <span className="font-extrabold">{formatMoney(pot, currency)}</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-amber-50 p-3 text-center">
              <p className="text-2xl">🥇</p>
              <p className="text-xs text-muted-foreground">1º lugar · 70%</p>
              <p className="font-extrabold">
                {formatMoney(pot * PRIZE_SPLIT.first, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3 text-center">
              <p className="text-2xl">🥈</p>
              <p className="text-xs text-muted-foreground">2º lugar · 30%</p>
              <p className="font-extrabold">
                {formatMoney(pot * PRIZE_SPLIT.second, currency)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
