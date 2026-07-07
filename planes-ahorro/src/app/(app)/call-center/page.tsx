"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import {
  inicializar, suscribir, listarClientes, listarTareas, crearTareas, completarTarea,
  colaboradoresDeEmpresa, listarComunicacionesEmpresa,
} from "@/lib/store";
import { GESTIONES, colaGestion, type GestionTipo } from "@/lib/gestiones";
import { exportarExcel } from "@/lib/exportar";
import { fechaHora } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Headphones, Download, ClipboardList } from "lucide-react";

function tituloGestion(tipo: string): string {
  return GESTIONES.find((g) => g.tipo === tipo)?.titulo ?? tipo;
}
function diaKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function CallCenterPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);
  const [gestion, setGestion] = useState<GestionTipo>("mora");
  const [colaboradorId, setColaboradorId] = useState("");
  const [cantidad, setCantidad] = useState("10");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const puedeAsignar = usuarioActivo ? tienePermiso(usuarioActivo.roles, "callcenter.asignar") : false;
  const veRendimiento = usuarioActivo
    ? puedeAsignar || tienePermiso(usuarioActivo.roles, "informes.ver")
    : false;

  const colaboradores = useMemo(
    () => (empresaActivaId ? colaboradoresDeEmpresa(empresaActivaId) : []),
    [empresaActivaId]
  );

  const clientes = useMemo(
    () => (empresaActivaId && usuarioActivo ? listarClientes(empresaActivaId, {}, usuarioActivo) : []),
    [empresaActivaId, usuarioActivo, tick]
  );

  const tareas = useMemo(
    () => (empresaActivaId ? listarTareas(empresaActivaId) : []),
    [empresaActivaId, tick]
  );
  const misPendientes = useMemo(
    () => (usuarioActivo ? tareas.filter((t) => t.asignadoId === usuarioActivo.id && t.estado === "pendiente") : []),
    [tareas, usuarioActivo]
  );

  const comunicaciones = useMemo(
    () => (empresaActivaId ? listarComunicacionesEmpresa(empresaActivaId) : []),
    [empresaActivaId, tick]
  );

  // Últimos 7 días (hoy incluido), para la grilla de llamados por día.
  const dias = useMemo(() => {
    const out: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, [tick]);

  const rendimiento = useMemo(() => {
    return colaboradores.map((u) => {
      const coms = comunicaciones.filter((x) => x.usuarioId === u.id);
      const porDia = dias.map((d) => coms.filter((x) => diaKey(x.fechaHora) === d).length);
      const mias = tareas.filter((t) => t.asignadoId === u.id);
      return {
        usuario: u,
        pendientes: mias.filter((t) => t.estado === "pendiente").length,
        completadas7: mias.filter((t) => t.estado === "completada" && t.fechaCompletada && dias.includes(diaKey(t.fechaCompletada))).length,
        porDia,
        total7: porDia.reduce((a, b) => a + b, 0),
        ultima: coms[0]?.fechaHora ?? null,
      };
    }).filter((r) => r.pendientes || r.completadas7 || r.total7); // solo quienes tienen actividad o tareas
  }, [colaboradores, comunicaciones, tareas, dias]);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "clientes.ver")) {
    return <Card><CardHeader><CardTitle>Sin acceso</CardTitle></CardHeader></Card>;
  }

  const defGestion = GESTIONES.find((g) => g.tipo === gestion)!;
  const cola = colaGestion(clientes, gestion);
  const pendientesDeEstaGestion = new Set(
    tareas.filter((t) => t.estado === "pendiente" && t.gestionTipo === gestion).map((t) => t.clienteId)
  );
  const sinAsignar = cola.filter((c) => !pendientesDeEstaGestion.has(c.id));

  const asignar = () => {
    const colaborador = colaboradores.find((u) => u.id === colaboradorId);
    const n = Math.max(1, Number(cantidad) || 0);
    if (!colaborador || !empresaActivaId) { setMsg("Elegí un colaborador."); return; }
    const creadas = crearTareas(sinAsignar.slice(0, n), gestion, colaborador, usuarioActivo, empresaActivaId);
    setMsg(creadas ? `✔ Se asignaron ${creadas} tarea(s) de "${defGestion.titulo}" a ${colaborador.nombre}.` : "No había clientes sin asignar en esta gestión.");
  };

  const exportarActividad = () =>
    exportarExcel(
      comunicaciones.map((x) => ({
        "Fecha y hora": fechaHora(x.fechaHora),
        "Colaborador": x.usuarioNombre,
        "Cliente": x.clienteNombre,
        "Tipo de contacto": x.tipoContacto,
        "Detalle": x.detalle,
        "Próxima acción": x.proximaAccion ?? "",
      })),
      "actividad-call-center"
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Headphones className="h-6 w-6" /> Call center</h1>
          <p className="text-muted-foreground">
            Asignación de tareas a los colaboradores y medición de su gestión diaria.
          </p>
        </div>
        {veRendimiento && (
          <Button variant="outline" onClick={exportarActividad}><Download className="h-4 w-4" /> Excel actividad</Button>
        )}
      </div>

      {/* Asignar tareas */}
      {puedeAsignar && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asignar tareas</CardTitle>
            <CardDescription>
              Elegí una gestión y repartila entre los colaboradores. Cada tarea se completa sola
              cuando el colaborador registra el contacto en la bitácora del cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Gestión</span>
                <select value={gestion} onChange={(e) => setGestion(e.target.value as GestionTipo)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {GESTIONES.map((g) => <option key={g.tipo} value={g.tipo}>{g.titulo}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Colaborador</span>
                <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Elegir…</option>
                  {colaboradores.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Cantidad</span>
                <Input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="w-24" />
              </label>
              <Button onClick={asignar} disabled={sinAsignar.length === 0}>
                <ClipboardList className="h-4 w-4" /> Asignar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {cola.length} cliente(s) en la cola de <strong>{defGestion.titulo}</strong> ·{" "}
              {sinAsignar.length} sin tarea pendiente · {cola.length - sinAsignar.length} ya asignados.
            </p>
            {msg && <p className="text-sm font-medium">{msg}</p>}
          </CardContent>
        </Card>
      )}

      {/* Mis tareas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mis tareas — {misPendientes.length} pendiente(s)</CardTitle>
          <CardDescription>
            Abrí el cliente, hacé el llamado y registralo en la bitácora: la tarea se completa sola.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Gestión</TableHead>
                <TableHead>Asignada</TableHead>
                <TableHead>Por</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {misPendientes.slice(0, 50).map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <Link href={`/clientes/${t.clienteId}`} className="hover:underline">{t.clienteNombre}</Link>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{tituloGestion(t.gestionTipo)}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{fechaHora(t.fechaAsignacion)}</TableCell>
                  <TableCell className="text-muted-foreground">{t.creadaPorNombre}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => completarTarea(t.id, "Completada manualmente")}>
                      Marcar completada
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {misPendientes.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No tenés tareas pendientes. 🎉</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rendimiento del equipo */}
      {veRendimiento && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rendimiento del equipo (últimos 7 días)</CardTitle>
            <CardDescription>
              Llamados registrados en la bitácora por colaborador y por día, tareas completadas y pendientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="text-center">Pendientes</TableHead>
                  <TableHead className="text-center">Completadas (7d)</TableHead>
                  {dias.map((d) => (
                    <TableHead key={d} className="text-center text-xs">
                      {new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Total 7d</TableHead>
                  <TableHead>Última actividad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rendimiento.map((r) => (
                  <TableRow key={r.usuario.id}>
                    <TableCell className="font-medium">{r.usuario.nombre}</TableCell>
                    <TableCell className="text-center">
                      {r.pendientes > 0 ? <Badge variant="warning">{r.pendientes}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{r.completadas7}</TableCell>
                    {r.porDia.map((n, i) => (
                      <TableCell key={i} className={`text-center tabular-nums ${n === 0 ? "text-muted-foreground" : "font-semibold"}`}>{n}</TableCell>
                    ))}
                    <TableCell className="text-center font-semibold tabular-nums">{r.total7}</TableCell>
                    <TableCell className="text-muted-foreground">{r.ultima ? fechaHora(r.ultima) : "—"}</TableCell>
                  </TableRow>
                ))}
                {rendimiento.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="py-6 text-center text-muted-foreground">Sin actividad ni tareas asignadas todavía.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
