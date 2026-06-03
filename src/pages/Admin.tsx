import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Check } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamSelect, teamLabel } from "@/components/TeamSelect";
import type { Match, MatchStage } from "@/lib/db-types";
import { formatKickoff } from "@/lib/format";
import {
  useAsados,
  useMatches,
  useProfiles,
  useSaveMatch,
  useDeleteMatch,
  useSaveSettings,
  useSetAsadoApproved,
  useSetProfileFlags,
  useSettings,
} from "@/store/queries";

const STAGES: { value: MatchStage; label: string }[] = [
  { value: "group", label: "Grupos" },
  { value: "r32", label: "16avos" },
  { value: "r16", label: "Octavos" },
  { value: "qf", label: "Cuartos" },
  { value: "sf", label: "Semi" },
  { value: "third", label: "3er puesto" },
  { value: "final", label: "Final" },
];

// datetime-local <-> ISO
function toLocalInput(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function Admin() {
  return (
    <>
      <AppHeader title="Administración" subtitle="Sólo para el admin del grupo" />
      <div className="px-4 py-4">
        <Tabs defaultValue="partidos">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="partidos">Partidos</TabsTrigger>
            <TabsTrigger value="plus">Plus</TabsTrigger>
            <TabsTrigger value="pozo">Pozo</TabsTrigger>
            <TabsTrigger value="gente">Gente</TabsTrigger>
          </TabsList>
          <TabsContent value="partidos">
            <MatchesAdmin />
          </TabsContent>
          <TabsContent value="plus">
            <SpecialsAdmin />
          </TabsContent>
          <TabsContent value="pozo">
            <PotAdmin />
          </TabsContent>
          <TabsContent value="gente">
            <PeopleAdmin />
            <AsadosAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function MatchesAdmin() {
  const matches = useMatches();
  const save = useSaveMatch();
  const del = useDeleteMatch();

  const [stage, setStage] = useState<MatchStage>("group");
  const [group, setGroup] = useState("");
  const [home, setHome] = useState<string | null>(null);
  const [away, setAway] = useState<string | null>(null);
  const [kickoff, setKickoff] = useState(toLocalInput());

  async function add() {
    if (!home || !away) {
      toast.error("Elegí los dos equipos");
      return;
    }
    if (home === away) {
      toast.error("No pueden ser el mismo equipo");
      return;
    }
    try {
      await save.mutateAsync({
        stage,
        group_name: stage === "group" ? group.trim().toUpperCase() || null : null,
        home_team: home,
        away_team: away,
        kickoff_at: new Date(kickoff).toISOString(),
        status: "scheduled",
      });
      toast.success("Partido creado");
      setHome(null);
      setAway(null);
    } catch (e) {
      toast.error("Error", { description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">Nuevo partido</h3>
        <div className="grid grid-cols-2 gap-2">
          <Select value={stage} onValueChange={(v) => setStage(v as MatchStage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {stage === "group" && (
            <Input
              placeholder="Grupo (A-L)"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              maxLength={1}
            />
          )}
        </div>
        <TeamSelect value={home} onChange={setHome} placeholder="Local" />
        <TeamSelect value={away} onChange={setAway} placeholder="Visitante" />
        <Input
          type="datetime-local"
          value={kickoff}
          onChange={(e) => setKickoff(e.target.value)}
        />
        <Button onClick={add} className="w-full" disabled={save.isPending}>
          Crear partido
        </Button>
      </Card>

      <h3 className="font-bold">Partidos cargados ({matches.data?.length ?? 0})</h3>
      <div className="space-y-2">
        {(matches.data ?? []).map((m) => (
          <MatchAdminRow key={m.id} match={m} onSave={save} onDelete={del} />
        ))}
      </div>
    </div>
  );
}

function MatchAdminRow({
  match,
  onSave,
  onDelete,
}: {
  match: Match;
  onSave: ReturnType<typeof useSaveMatch>;
  onDelete: ReturnType<typeof useDeleteMatch>;
}) {
  const [h, setH] = useState(match.home_score?.toString() ?? "");
  const [a, setA] = useState(match.away_score?.toString() ?? "");

  async function saveResult() {
    if (h === "" || a === "") {
      toast.error("Completá el resultado");
      return;
    }
    await onSave.mutateAsync({
      id: match.id,
      home_score: Number(h),
      away_score: Number(a),
      status: "finished",
    });
    toast.success("Resultado guardado");
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>
          {STAGES.find((s) => s.value === match.stage)?.label}
          {match.group_name ? ` · ${match.group_name}` : ""} ·{" "}
          {formatKickoff(match.kickoff_at)}
        </span>
        <button
          onClick={() => onDelete.mutate(match.id)}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-right text-sm font-semibold">
          {teamLabel(match.home_team)}
        </span>
        <Input
          type="number"
          className="w-14 text-center"
          value={h}
          onChange={(e) => setH(e.target.value)}
        />
        <span>-</span>
        <Input
          type="number"
          className="w-14 text-center"
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
        <span className="flex-1 text-sm font-semibold">{teamLabel(match.away_team)}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span
          className={`text-xs font-bold ${
            match.status === "finished" ? "text-emerald-600" : "text-muted-foreground"
          }`}
        >
          {match.status === "finished" ? "✓ Finalizado" : "Programado"}
        </span>
        <Button size="sm" onClick={saveResult} disabled={onSave.isPending}>
          Guardar resultado
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function SpecialsAdmin() {
  const settings = useSettings();
  const save = useSaveSettings();
  const [champion, setChampion] = useState<string | null>(null);
  const [best, setBest] = useState("");
  const [scorer, setScorer] = useState("");

  // Sincroniza una vez cuando llega settings
  if (settings.data && champion === null && best === "" && scorer === "") {
    if (settings.data.champion || settings.data.best_player || settings.data.top_scorer) {
      setChampion(settings.data.champion);
      setBest(settings.data.best_player ?? "");
      setScorer(settings.data.top_scorer ?? "");
    }
  }

  async function persist() {
    await save.mutateAsync({
      champion,
      best_player: best.trim() || null,
      top_scorer: scorer.trim() || null,
    });
    toast.success("Resultados oficiales guardados");
  }

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-bold">Resultados oficiales (al terminar el Mundial)</h3>
      <p className="text-xs text-muted-foreground">
        Cargá acá los ganadores reales. Apenas los guardás, se suman los puntos en la
        tabla.
      </p>
      <label className="text-xs font-semibold">🏆 Campeón</label>
      <TeamSelect value={champion} onChange={setChampion} />
      <label className="text-xs font-semibold">⭐ Mejor jugador</label>
      <Input value={best} onChange={(e) => setBest(e.target.value)} placeholder="Nombre" />
      <label className="text-xs font-semibold">🥅 Goleador</label>
      <Input
        value={scorer}
        onChange={(e) => setScorer(e.target.value)}
        placeholder="Nombre"
      />
      <Button onClick={persist} className="w-full" disabled={save.isPending}>
        Guardar resultados oficiales
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function PotAdmin() {
  const settings = useSettings();
  const save = useSaveSettings();
  const [entry, setEntry] = useState("");
  const [currency, setCurrency] = useState("ARS");
  const [deadline, setDeadline] = useState("");
  const [synced, setSynced] = useState(false);

  if (settings.data && !synced) {
    setEntry(String(settings.data.entry_amount ?? 0));
    setCurrency(settings.data.currency ?? "ARS");
    setDeadline(settings.data.specials_deadline ? toLocalInput(settings.data.specials_deadline) : "");
    setSynced(true);
  }

  async function persist() {
    await save.mutateAsync({
      entry_amount: Number(entry) || 0,
      currency,
      specials_deadline: deadline ? new Date(deadline).toISOString() : null,
    });
    toast.success("Configuración guardada");
  }

  async function toggleLock() {
    await save.mutateAsync({
      predictions_locked: !settings.data?.predictions_locked,
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-bold">Pozo y fechas</h3>
      <label className="text-xs font-semibold">Entrada por persona</label>
      <div className="flex gap-2">
        <Input
          type="number"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="0"
        />
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ARS">ARS</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="UYU">UYU</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        El pozo se calcula con los jugadores marcados como “pagó”.
      </p>

      <label className="text-xs font-semibold">
        Cierre de pronósticos Plus (campeón/jugador/goleador)
      </label>
      <Input
        type="datetime-local"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
      />

      <Button onClick={persist} className="w-full" disabled={save.isPending}>
        Guardar
      </Button>

      <div className="pt-2 border-t flex items-center justify-between">
        <span className="text-sm">
          {settings.data?.predictions_locked ? "🔒 Todo cerrado" : "🔓 Abierto"}
        </span>
        <Button variant="outline" size="sm" onClick={toggleLock}>
          {settings.data?.predictions_locked ? "Reabrir Plus" : "Cerrar Plus ahora"}
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function PeopleAdmin() {
  const profiles = useProfiles();
  const setFlags = useSetProfileFlags();

  return (
    <Card className="p-4 space-y-2 mb-4">
      <h3 className="font-bold">Jugadores ({profiles.data?.length ?? 0})</h3>
      {(profiles.data ?? []).map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-0">
          <span className="text-sm flex-1 truncate">
            {p.display_name}
            {p.is_admin && <span className="text-xs text-primary"> · admin</span>}
          </span>
          <button
            onClick={() => setFlags.mutate({ id: p.id, paid: !p.paid })}
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              p.paid ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
            }`}
          >
            {p.paid ? "Pagó ✓" : "Marcar pago"}
          </button>
          <button
            onClick={() => setFlags.mutate({ id: p.id, is_admin: !p.is_admin })}
            className="text-xs font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground"
          >
            {p.is_admin ? "Quitar admin" : "Hacer admin"}
          </button>
        </div>
      ))}
    </Card>
  );
}

function AsadosAdmin() {
  const asados = useAsados();
  const approve = useSetAsadoApproved();

  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-bold">Validar asados</h3>
      <p className="text-xs text-muted-foreground">
        Aprobá los asados que cumplieron el mínimo de comensales para que sumen puntos.
      </p>
      {(asados.data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground py-2">No hay asados cargados.</p>
      )}
      {(asados.data ?? []).map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-0">
          <span className="text-sm flex-1 truncate">{a.title}</span>
          <button
            onClick={() => approve.mutate({ id: a.id, approved: !a.approved })}
            className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
              a.approved ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
            }`}
          >
            {a.approved ? (
              <>
                <Check className="w-3.5 h-3.5" /> Válido
              </>
            ) : (
              "Aprobar"
            )}
          </button>
        </div>
      ))}
    </Card>
  );
}
