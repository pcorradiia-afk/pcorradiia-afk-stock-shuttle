import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { TeamSelect, teamLabel } from "@/components/TeamSelect";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { POINTS } from "@/data/rules";
import { useSpecials, useSettings, useUpsertSpecial } from "@/store/queries";
import { useAuth } from "@/store/auth";
import { normalizeName } from "@/lib/scoring";

export function Specials() {
  const { profile } = useAuth();
  const specials = useSpecials();
  const settings = useSettings();
  const upsert = useUpsertSpecial();

  const mine = useMemo(
    () => (specials.data ?? []).find((s) => s.user_id === profile?.id) ?? null,
    [specials.data, profile?.id]
  );

  const [champion, setChampion] = useState<string | null>(null);
  const [bestPlayer, setBestPlayer] = useState("");
  const [topScorer, setTopScorer] = useState("");

  useEffect(() => {
    if (mine) {
      setChampion(mine.champion);
      setBestPlayer(mine.best_player ?? "");
      setTopScorer(mine.top_scorer ?? "");
    }
  }, [mine]);

  const deadline = settings.data?.specials_deadline;
  const locked =
    settings.data?.predictions_locked ||
    (deadline ? Date.now() >= new Date(deadline).getTime() : false);

  async function save() {
    if (!profile) return;
    try {
      await upsert.mutateAsync({
        user_id: profile.id,
        champion,
        best_player: bestPlayer.trim() || null,
        top_scorer: topScorer.trim() || null,
      });
      toast.success("Pronósticos especiales guardados");
    } catch (e) {
      toast.error("No se pudo guardar", { description: (e as Error).message });
    }
  }

  const official = settings.data;
  const hit = (a: string | null | undefined, b: string | null | undefined) =>
    !!a && normalizeName(a) === normalizeName(b);

  return (
    <>
      <AppHeader title="Pronósticos Plus" subtitle="Campeón, mejor jugador y goleador" />
      <div className="px-4 py-4 space-y-4">
        {locked && (
          <div className="flex items-center gap-2 text-sm bg-amber-100 text-amber-800 rounded-xl px-3 py-2">
            <Lock className="w-4 h-4" /> Cerrado. Ya no se pueden cambiar.
          </div>
        )}

        {/* Campeón */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">🏆 Campeón del mundo</h3>
            <span className="text-xs font-bold text-amber-600">
              +{POINTS.champion} pts
            </span>
          </div>
          <TeamSelect value={champion} onChange={setChampion} disabled={locked} />
          {official?.champion && (
            <p
              className={`text-xs ${
                hit(mine?.champion, official.champion)
                  ? "text-emerald-600 font-bold"
                  : "text-muted-foreground"
              }`}
            >
              Resultado oficial: {teamLabel(official.champion)}{" "}
              {hit(mine?.champion, official.champion) && "✓ ¡Acertaste!"}
            </p>
          )}
        </Card>

        {/* Mejor jugador */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">⭐ Mejor jugador (Balón de Oro)</h3>
            <span className="text-xs font-bold text-amber-600">
              +{POINTS.bestPlayer} pts
            </span>
          </div>
          <Input
            placeholder="Nombre y apellido del jugador"
            value={bestPlayer}
            onChange={(e) => setBestPlayer(e.target.value)}
            disabled={locked}
          />
          {official?.best_player && (
            <p
              className={`text-xs ${
                hit(mine?.best_player, official.best_player)
                  ? "text-emerald-600 font-bold"
                  : "text-muted-foreground"
              }`}
            >
              Resultado oficial: {official.best_player}{" "}
              {hit(mine?.best_player, official.best_player) && "✓ ¡Acertaste!"}
            </p>
          )}
        </Card>

        {/* Goleador */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">🥅 Goleador (Botín de Oro)</h3>
            <span className="text-xs font-bold text-amber-600">
              +{POINTS.topScorer} pts
            </span>
          </div>
          <Input
            placeholder="Nombre y apellido del goleador"
            value={topScorer}
            onChange={(e) => setTopScorer(e.target.value)}
            disabled={locked}
          />
          {official?.top_scorer && (
            <p
              className={`text-xs ${
                hit(mine?.top_scorer, official.top_scorer)
                  ? "text-emerald-600 font-bold"
                  : "text-muted-foreground"
              }`}
            >
              Resultado oficial: {official.top_scorer}{" "}
              {hit(mine?.top_scorer, official.top_scorer) && "✓ ¡Acertaste!"}
            </p>
          )}
        </Card>

        {!locked && (
          <Button onClick={save} className="w-full" disabled={upsert.isPending}>
            {upsert.isPending ? "Guardando…" : "Guardar pronósticos"}
          </Button>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Tip: escribí el nombre completo. Se comparan sin distinguir mayúsculas ni
          tildes.
        </p>
      </div>
    </>
  );
}
