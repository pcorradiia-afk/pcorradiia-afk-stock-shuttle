"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import {
  inicializar, suscribir, listarClientes, listarComunicaciones, listarUsuariosCache,
  listarRecordatorios, crearRecordatorio, completarRecordatorio, eliminarRecordatorio, hoyISO,
} from "@/lib/store";
import { GESTIONES, colaGestion, claveFecha, type GestionTipo } from "@/lib/gestiones";
import { exportarExcel } from "@/lib/exportar";
import { fechaHora } from "@/lib/labels";
import type { Cliente, Recordatorio, Usuario } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, PhoneCall, CalendarClock, Check, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

export default function GestionesPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);
  const [tipo, setTipo] = useState<GestionTipo>("bienvenida");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [status, setStatus] = useState("todos");

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const clientes = useMemo<Cliente[]>(
    () => (empresaActivaId && usuarioActivo ? listarClientes(empresaActivaId, {}, usuarioActivo) : []),    [empresaActivaId, usuarioActivo, tick]
  );

  const conteos = useMemo(
    () => GESTIONES.map((g) => ({ ...g, cantidad: colaGestion(clientes, g.tipo).length })),
    [clientes]
  );
  const def = GESTIONES.find((g) => g.tipo === tipo)!;

  // Status de cartera presentes en la empresa (para el filtro).
  const statuses = useMemo(
    () => Array.from(new Set(clientes.map((c) => c.solicitud.statusDesc).filter(Boolean) as string[])).sort(),
    [clientes]
  );

  const cola = useMemo(() => {
    let lista = colaGestion(clientes, tipo);
    if (status !== "todos") lista = lista.filter((c) => c.solicitud.statusDesc === status);
    if (desde || hasta) {
      lista = lista.filter((c) => {
        const k = claveFecha(def.fechaDe(c));
        if (!k) return false; // con rango activo, sin fecha queda fuera
        return (!desde || k >= desde) && (!hasta || k <= hasta);
      });
    }
    return lista;
  }, [clientes, tipo, status, desde, hasta, def]);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "clientes.ver")) {
    return <Card><CardHeader><CardTitle>Sin acceso</CardTitle></CardHeader></Card>;
  }

  const exportarConAnotador = () =>
    exportarExcel(
      cola.map((c) => {
        const ultima = listarComunicaciones(c.id)[0];
        return {
          "Nombre": c.nombreCompleto,
          "Teléfono": c.telefono ?? "",
          "Email": c.email ?? "",
          "Grupo": c.solicitud.grupo ?? "",
          "Orden": c.solicitud.orden ?? "",
          "N° solicitud": c.solicitud.nroSolicitud ?? "",
          "Modelo": c.solicitud.modelo ?? "",
          "Status cartera": c.solicitud.statusDesc ?? "",
          [def.columnaDato]: def.dato(c),
          "Última gestión (fecha)": ultima ? fechaHora(ultima.fechaHora) : "",
          "Última gestión (detalle)": ultima?.detalle ?? "",
          "Próxima acción": ultima?.proximaAccion ?? "",
          "Gestionó": ultima?.usuarioNombre ?? "",
        };
      }),
      `gestion-${tipo}-con-anotador`
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><PhoneCall className="h-6 w-6" /> Gestiones</h1>
          <p className="text-muted-foreground">
            Colas de llamados por campaña (como en el sistema actual). Elegí una gestión, trabajala
            desde la ficha con el anotador, y bajala a Excel con las últimas gestiones incluidas.
          </p>
        </div>
        <Button variant="outline" onClick={exportarConAnotador} disabled={cola.length === 0}>
          <Download className="h-4 w-4" /> Excel con anotador
        </Button>
      </div>

      {/* Recordatorios con calendario (pedido del cliente 2026-07-11) */}
      {empresaActivaId && <Recordatorios empresaId={empresaActivaId} usuario={usuarioActivo} clientes={clientes} />}

      {/* Selector de gestión con contadores */}
      <div className="flex flex-wrap gap-2">
        {conteos.map((g) => (
          <button
            key={g.tipo}
            onClick={() => setTipo(g.tipo)}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              g.tipo === tipo ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent"
            }`}
          >
            {g.titulo}
            <Badge variant={g.tipo === tipo ? "secondary" : g.cantidad > 0 ? "default" : "outline"}>
              {g.cantidad}
            </Badge>
          </button>
        ))}
      </div>

      {/* Filtros: rango de fechas + status de cartera */}
      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Desde ({def.fechaLabel})</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Hasta ({def.fechaLabel})</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Status de cartera</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="todos">Todos</option>
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          {(desde || hasta || status !== "todos") && (
            <Button variant="ghost" size="sm" onClick={() => { setDesde(""); setHasta(""); setStatus("todos"); }}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{def.titulo} — {cola.length} cliente(s)</CardTitle>
          <CardDescription>{def.descripcion}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Grupo/Orden</TableHead>
                <TableHead>{def.columnaDato}</TableHead>
                <TableHead>Última gestión</TableHead>
                <TableHead>Próxima acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cola.slice(0, 100).map((c) => {
                const ultima = listarComunicaciones(c.id)[0];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/clientes/${c.id}`} className="hover:underline">{c.nombreCompleto}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.telefono ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.solicitud.grupo ?? "—"}/{c.solicitud.orden ?? "—"}</TableCell>
                    <TableCell>{def.dato(c)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ultima ? `${fechaHora(ultima.fechaHora)} · ${ultima.detalle.slice(0, 40)}${ultima.detalle.length > 40 ? "…" : ""}` : <Badge variant="warning">sin gestionar</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ultima?.proximaAccion ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
              {cola.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No hay clientes en esta gestión. (Importá la cartera Novedades para alimentar las colas.)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {cola.length > 100 && (
            <p className="mt-2 text-sm text-muted-foreground">Mostrando 100 de {cola.length}. Bajá el Excel para la lista completa.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== Recordatorios (calendario de tareas con aviso) =====================

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

function fmtDia(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function Recordatorios({ empresaId, usuario, clientes }: { empresaId: string; usuario: Usuario; clientes: Cliente[] }) {
  const hoy = hoyISO();
  const [mes, setMes] = useState(hoy.slice(0, 7)); // "aaaa-mm" visible en el calendario
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [soloMios, setSoloMios] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState({ fecha: hoy, nota: "", usuarioId: usuario.id, busquedaCliente: "", clienteId: null as string | null, clienteNombre: null as string | null });

  const todos = listarRecordatorios(empresaId, soloMios ? usuario.id : undefined);
  const pendientes = todos.filter((r) => !r.completado);
  const vencidos = pendientes.filter((r) => r.fecha < hoy);
  const deHoy = pendientes.filter((r) => r.fecha === hoy);

  // Calendario del mes visible
  const [anio, mesNum] = mes.split("-").map(Number);
  const primerDia = new Date(anio, mesNum - 1, 1);
  const diasEnMes = new Date(anio, mesNum, 0).getDate();
  const offset = (primerDia.getDay() + 6) % 7; // lunes = 0
  const porDia = new Map<string, number>();
  pendientes.forEach((r) => porDia.set(r.fecha, (porDia.get(r.fecha) ?? 0) + 1));
  const cambiarMes = (delta: number) => {
    const d = new Date(anio, mesNum - 1 + delta, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setDiaSel(null);
  };

  const agenda = (diaSel ? pendientes.filter((r) => r.fecha === diaSel) : pendientes).slice(0, 30);

  const colegas = listarUsuariosCache().filter((u) => u.activo && (u.empresaId === empresaId || u.alcance === "grupo" || (Array.isArray(u.alcance) && u.alcance.includes(empresaId))));

  const resultadosCliente = form.busquedaCliente.trim().length >= 3
    ? clientes.filter((c) => c.nombreCompleto.toLowerCase().includes(form.busquedaCliente.trim().toLowerCase())).slice(0, 6)
    : [];

  const crear = () => {
    if (!form.nota.trim() || !form.fecha) return;
    const destinatario = colegas.find((u) => u.id === form.usuarioId) ?? usuario;
    crearRecordatorio({
      empresaId,
      usuarioId: destinatario.id,
      usuarioNombre: destinatario.nombre,
      creadoPorNombre: usuario.nombre,
      fecha: form.fecha,
      nota: form.nota.trim(),
      clienteId: form.clienteId,
      clienteNombre: form.clienteNombre,
      gestionTipo: null,
    });
    setForm({ fecha: hoy, nota: "", usuarioId: usuario.id, busquedaCliente: "", clienteId: null, clienteNombre: null });
    setAbierto(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Recordatorios
            {vencidos.length > 0 && <Badge variant="destructive">{vencidos.length} vencido(s)</Badge>}
            {deHoy.length > 0 && <Badge variant="warning">{deHoy.length} para hoy</Badge>}
            {vencidos.length === 0 && deHoy.length === 0 && <Badge variant="outline">al día</Badge>}
          </span>
          <span className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm font-normal">
              <input type="checkbox" checked={soloMios} onChange={(e) => setSoloMios(e.target.checked)} /> Solo los míos
            </label>
            <Button size="sm" onClick={() => setAbierto((v) => !v)}>
              <Plus className="h-4 w-4" /> Nuevo recordatorio
            </Button>
          </span>
        </CardTitle>
        <CardDescription>
          Agendá gestiones a realizar. El día del recordatorio (o si quedó vencido) le suena la campanita al usuario asignado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {abierto && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Fecha</span>
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="block text-xs font-medium text-muted-foreground">Qué hay que hacer</span>
                <Input value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} placeholder="Ej: llamar por la alícuota pendiente" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Para</span>
                <select value={form.usuarioId} onChange={(e) => setForm({ ...form, usuarioId: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {colegas.map((u) => <option key={u.id} value={u.id}>{u.id === usuario.id ? `${u.nombre} (yo)` : u.nombre}</option>)}
                </select>
              </label>
            </div>
            <div className="space-y-1">
              <span className="block text-xs font-medium text-muted-foreground">Cliente (opcional)</span>
              {form.clienteId ? (
                <p className="text-sm">
                  {form.clienteNombre}{" "}
                  <button className="text-xs text-primary hover:underline" onClick={() => setForm({ ...form, clienteId: null, clienteNombre: null })}>quitar</button>
                </p>
              ) : (
                <div className="relative max-w-sm">
                  <Input value={form.busquedaCliente} onChange={(e) => setForm({ ...form, busquedaCliente: e.target.value })} placeholder="Buscar por nombre (3+ letras)" />
                  {resultadosCliente.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-card shadow">
                      {resultadosCliente.map((c) => (
                        <button key={c.id} className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => setForm({ ...form, clienteId: c.id, clienteNombre: c.nombreCompleto, busquedaCliente: "" })}>
                          {c.nombreCompleto}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={crear} disabled={!form.nota.trim()}>Guardar</Button>
              <Button size="sm" variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Calendario del mes */}
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => cambiarMes(-1)} className="rounded p-1 hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
              <p className="text-sm font-medium">{MESES[mesNum - 1]} {anio}</p>
              <button onClick={() => cambiarMes(1)} className="rounded p-1 hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {DIAS.map((d, i) => <span key={i}>{d}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => <span key={`v${i}`} />)}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                const iso = `${mes}-${String(i + 1).padStart(2, "0")}`;
                const n = porDia.get(iso) ?? 0;
                const activo = diaSel === iso;
                return (
                  <button
                    key={iso}
                    onClick={() => { setDiaSel(activo ? null : iso); if (!activo) setForm((f) => ({ ...f, fecha: iso })); }}
                    className={`relative h-9 rounded text-sm ${activo ? "bg-primary text-primary-foreground" : iso === hoy ? "border border-primary" : "hover:bg-accent"} ${iso < hoy && n > 0 && !activo ? "text-red-600" : ""}`}
                  >
                    {i + 1}
                    {n > 0 && (
                      <span className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[10px] font-bold ${iso < hoy ? "bg-red-600 text-white" : "bg-primary text-primary-foreground"} ${activo ? "bg-background text-foreground" : ""}`}>
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Tocá un día para ver/agendar. El número indica recordatorios pendientes.</p>
          </div>

          {/* Agenda */}
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {diaSel ? `Recordatorios del ${fmtDia(diaSel)}` : "Pendientes"}
              {diaSel && <button className="ml-2 text-xs text-primary hover:underline" onClick={() => setDiaSel(null)}>ver todos</button>}
            </p>
            {agenda.length === 0 && <p className="text-sm text-muted-foreground">Sin recordatorios pendientes {diaSel ? "ese día" : ""}. 🎉</p>}
            {agenda.map((r) => <FilaRecordatorio key={r.id} r={r} hoy={hoy} />)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilaRecordatorio({ r, hoy }: { r: Recordatorio; hoy: string }) {
  const vencido = r.fecha < hoy;
  const esHoy = r.fecha === hoy;
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm ${vencido ? "border-red-300 bg-red-50" : esHoy ? "border-amber-300 bg-amber-50" : ""}`}>
      <Badge variant={vencido ? "destructive" : esHoy ? "warning" : "secondary"}>{esHoy ? "HOY" : fmtDia(r.fecha)}</Badge>
      <span className="font-medium">{r.nota}</span>
      {r.clienteId && (
        <Link href={`/clientes/${r.clienteId}`} className="text-primary hover:underline">{r.clienteNombre}</Link>
      )}
      <span className="text-xs text-muted-foreground">para {r.usuarioNombre} · agendó {r.creadoPorNombre}</span>
      <span className="grow" />
      <Button size="sm" variant="outline" onClick={() => completarRecordatorio(r.id)}>
        <Check className="h-4 w-4" /> Hecho
      </Button>
      <Button size="sm" variant="ghost" title="Eliminar" onClick={() => eliminarRecordatorio(r.id)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
