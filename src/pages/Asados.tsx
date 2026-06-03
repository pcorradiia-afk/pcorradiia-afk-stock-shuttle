import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Flame, Check, Trash2, MapPin } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASADO_MIN_GUESTS, POINTS } from "@/data/rules";
import { formatDay } from "@/lib/format";
import {
  useAsados,
  useAttendees,
  useCreateAsado,
  useDeleteAsado,
  useProfiles,
  useToggleAttendance,
} from "@/store/queries";
import { useAuth } from "@/store/auth";

export function Asados() {
  const { profile } = useAuth();
  const profiles = useProfiles();
  const asados = useAsados();
  const attendees = useAttendees();
  const createAsado = useCreateAsado();
  const toggle = useToggleAttendance();
  const del = useDeleteAsado();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [hostId, setHostId] = useState<string | undefined>(profile?.id);
  const [showForm, setShowForm] = useState(false);

  const nameOf = useMemo(() => {
    const m = new Map((profiles.data ?? []).map((p) => [p.id, p.display_name]));
    return (id: string | null) => (id ? m.get(id) ?? "?" : "—");
  }, [profiles.data]);

  const attByAsado = useMemo(() => {
    const m = new Map<string, string[]>();
    (attendees.data ?? []).forEach((a) => {
      const arr = m.get(a.asado_id) ?? [];
      arr.push(a.user_id);
      m.set(a.asado_id, arr);
    });
    return m;
  }, [attendees.data]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!date) {
      toast.error("Elegí la fecha del asado");
      return;
    }
    try {
      await createAsado.mutateAsync({
        title: title.trim() || "Asado del grupo",
        date,
        host_id: hostId ?? profile.id,
        created_by: profile.id,
      });
      toast.success("¡Asado cargado! 🔥");
      setTitle("");
      setDate("");
      setShowForm(false);
    } catch (e) {
      toast.error("No se pudo cargar", { description: (e as Error).message });
    }
  }

  return (
    <>
      <AppHeader title="Asados" subtitle={`Mín. ${ASADO_MIN_GUESTS} del grupo = +${POINTS.asadoAttendee} · sede +${POINTS.asadoHost}`} />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-4 bg-orange-50 border-orange-200">
          <p className="text-sm text-orange-900">
            🔥 Cada asado del grupo durante el Mundial con <b>{ASADO_MIN_GUESTS} o más
            comensales</b> suma <b>{POINTS.asadoAttendee} pts</b> a cada uno. El que
            pone la sede se lleva <b>+{POINTS.asadoHost} pts</b> extra. El admin
            confirma que fue válido.
          </p>
        </Card>

        {showForm ? (
          <Card className="p-4">
            <form onSubmit={create} className="space-y-3">
              <Input
                placeholder="Nombre del asado (opcional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Fecha
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  ¿Quién pone la sede? (+{POINTS.asadoHost} pts)
                </label>
                <Select value={hostId} onValueChange={setHostId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí anfitrión" />
                  </SelectTrigger>
                  <SelectContent>
                    {(profiles.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={createAsado.isPending}>
                  Cargar asado
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Flame className="w-4 h-4 mr-1" /> Cargar un asado
          </Button>
        )}

        <div className="space-y-3">
          {(asados.data ?? []).length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Todavía no hay asados. ¡Organicen uno! 🥩
            </p>
          )}
          {(asados.data ?? []).map((a) => {
            const att = attByAsado.get(a.id) ?? [];
            const iAmIn = !!profile && att.includes(profile.id);
            const enough = att.length >= ASADO_MIN_GUESTS;
            const canDelete = a.created_by === profile?.id || profile?.is_admin;
            return (
              <Card key={a.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground">{formatDay(a.date)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> Sede: <b>{nameOf(a.host_id)}</b>
                    </p>
                  </div>
                  <div className="text-right">
                    {a.approved ? (
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                        ✓ Válido
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {att.map((uid) => (
                    <span
                      key={uid}
                      className="text-[11px] bg-muted rounded-full px-2 py-0.5"
                    >
                      {nameOf(uid)}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span
                    className={`text-xs font-semibold ${
                      enough ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {att.length} comensal{att.length !== 1 ? "es" : ""}
                    {!enough && ` (faltan ${ASADO_MIN_GUESTS - att.length})`}
                  </span>
                  <div className="flex gap-2">
                    {canDelete && (
                      <button
                        onClick={() => del.mutate(a.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Borrar asado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        profile &&
                        toggle.mutate({
                          asado_id: a.id,
                          user_id: profile.id,
                          attending: !iAmIn,
                        })
                      }
                      className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                        iAmIn
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {iAmIn ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Estuve
                        </span>
                      ) : (
                        "Anotarme"
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
