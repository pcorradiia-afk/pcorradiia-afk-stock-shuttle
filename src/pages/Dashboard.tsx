import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Star, Flame, CalendarDays, BookOpen, Shield, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { MatchCard } from "@/components/MatchCard";
import { Card } from "@/components/ui/card";
import {
  useLeaderboard,
  useMatches,
  usePredictions,
} from "@/store/queries";
import { useAuth } from "@/store/auth";
import { isLocked } from "@/lib/format";
import { formatMoney } from "@/lib/format";

export function Dashboard() {
  const { profile } = useAuth();
  const matches = useMatches();
  const predictions = usePredictions();
  const { rows, pot, settings } = useLeaderboard();

  const myPreds = useMemo(() => {
    const m = new Map<string, (typeof predictions.data)[number]>();
    (predictions.data ?? [])
      .filter((p) => p.user_id === profile?.id)
      .forEach((p) => m.set(p.match_id, p));
    return m;
  }, [predictions.data, profile?.id]);

  const upcoming = useMemo(() => {
    return (matches.data ?? [])
      .filter((m) => m.status !== "finished" && !isLocked(m.kickoff_at))
      .slice(0, 4);
  }, [matches.data]);

  const myPos = rows.findIndex((r) => r.profile.id === profile?.id);
  const myRow = myPos >= 0 ? rows[myPos] : null;
  const pendingCount = upcoming.filter((m) => !myPreds.has(m.id)).length;

  return (
    <>
      <AppHeader
        title={`¡Hola, ${profile?.display_name}!`}
        subtitle="Prode Mundial 2026"
      />
      <div className="px-4 py-4 space-y-4">
        {/* Mi resumen */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Tu puntaje</p>
            <p className="text-2xl font-extrabold">{myRow?.breakdown.total ?? 0}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Tu posición</p>
            <p className="text-2xl font-extrabold">
              {myPos >= 0 ? `#${myPos + 1}` : "—"}
              <span className="text-sm text-muted-foreground font-medium">
                /{rows.length}
              </span>
            </p>
          </Card>
        </div>

        {pot > 0 && (
          <Link to="/tabla">
            <Card className="p-3 flex items-center justify-between bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <div>
                <p className="text-xs opacity-90">Pozo en juego</p>
                <p className="text-xl font-extrabold">
                  {formatMoney(pot, settings?.currency ?? "ARS")}
                </p>
              </div>
              <ChevronRight />
            </Card>
          </Link>
        )}

        {pendingCount > 0 && (
          <Card className="p-3 bg-primary/10 border-primary/30">
            <p className="text-sm font-semibold text-primary">
              ⏰ Tenés {pendingCount} partido{pendingCount !== 1 ? "s" : ""} sin
              pronosticar
            </p>
          </Card>
        )}

        {/* Próximos partidos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">Próximos partidos</h2>
            <Link to="/partidos" className="text-sm text-primary font-semibold">
              Ver todos
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground text-center">
              No hay partidos abiertos por ahora.
            </Card>
          ) : (
            <div className="space-y-3">
              {upcoming.map((m) => (
                <MatchCard key={m.id} match={m} prediction={myPreds.get(m.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Accesos */}
        <div className="grid grid-cols-2 gap-3">
          <QuickLink to="/especiales" Icon={Star} label="Pronósticos Plus" />
          <QuickLink to="/asados" Icon={Flame} label="Asados" />
          <QuickLink to="/partidos" Icon={CalendarDays} label="Partidos" />
          <QuickLink to="/reglas" Icon={BookOpen} label="Reglas y pozo" />
        </div>

        {profile?.is_admin && (
          <Link to="/admin">
            <Card className="p-3 flex items-center gap-2 text-sm font-semibold">
              <Shield className="w-4 h-4 text-primary" /> Panel de administración
              <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground" />
            </Card>
          </Link>
        )}
      </div>
    </>
  );
}

function QuickLink({
  to,
  Icon,
  label,
}: {
  to: string;
  Icon: typeof Star;
  label: string;
}) {
  return (
    <Link to={to}>
      <Card className="p-4 flex flex-col items-center gap-1 text-center hover:bg-muted/50 transition">
        <Icon className="w-6 h-6 text-primary" />
        <span className="text-sm font-semibold">{label}</span>
      </Card>
    </Link>
  );
}
