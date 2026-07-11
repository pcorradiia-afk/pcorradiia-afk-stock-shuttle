"use client";

// Supervisión de administración: qué porcentaje del trabajo está al día —
// asignaciones (tareas de call center) según sus fechas, recordatorios y
// cantidad de clientes gestionados por colaborador y por gestión.

import { useEffect, useMemo, useState } from "react";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import {
  suscribir, inicializar, listarClientes, listarTareas, listarRecordatorios,
  listarComunicacionesEmpresa, colaboradoresDeEmpresa, hoyISO,
} from "@/lib/store";
import { GESTIONES, colaGestion } from "@/lib/gestiones";
import { exportarExcel } from "@/lib/exportar";
import { fechaHora } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Download } from "lucide-react";

const DIAS_ATRASO = 7; // una asignación pendiente hace más de 7 días se considera atrasada

function pct(parte: number, todo: number): number {
  return todo > 0 ? Math.round((parte / todo) * 100) : 100;
}

function Barra({ valor }: { valor: number }) {
  const color = valor >= 80 ? "bg-emerald-500" : valor >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, valor)}%` }} />
      </div>
      <span className="text-sm font-medium">{valor}%</span>
    </div>
  );
}

export default function SupervisionAdminPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const datos = useMemo(() => {
    if (!empresaActivaId || !usuarioActivo) return null;
    const hoy = hoyISO();
    const corte = new Date(Date.now() - dias * 86400000).toISOString();
    const corteAtraso = new Date(Date.now() - DIAS_ATRASO * 86400000).toISOString();

    const tareas = listarTareas(empresaActivaId);
    const recordatorios = listarRecordatorios(empresaActivaId).filter((r) => !r.completado);
    const coms = listarComunicacionesEmpresa(empresaActivaId).filter((c) => c.fechaHora >= corte);
    const clientes = listarClientes(empresaActivaId, {}, usuarioActivo);
    const gestionadosSet = new Set(coms.map((c) => c.clienteId));

    const completadas = tareas.filter((t) => t.estado === "completada");
    const pendientes = tareas.filter((t) => t.estado === "pendiente");
    const atrasadas = pendientes.filter((t) => t.fechaAsignacion < corteAtraso);
    const recVencidos = recordatorios.filter((r) => r.fecha < hoy);

    const porColaborador = colaboradoresDeEmpresa(empresaActivaId).map((u) => {
      const asig = tareas.filter((t) => t.asignadoId === u.id);
      const comp = asig.filter((t) => t.estado === "completada");
      const pend = asig.filter((t) => t.estado === "pendiente");
      const atr = pend.filter((t) => t.fechaAsignacion < corteAtraso);
      const recPend = recordatorios.filter((r) => r.usuarioId === u.id);
      const recVenc = recPend.filter((r) => r.fecha < hoy);
      const gestiono = new Set(coms.filter((c) => c.usuarioId === u.id).map((c) => c.clienteId));
      const ultima = coms.find((c) => c.usuarioId === u.id);
      return {
        id: u.id, nombre: u.nombre,
        asignadas: asig.length, completadas: comp.length, atrasadas: atr.length,
        cumplimiento: pct(comp.length, asig.length),
        recVencidos: recVenc.length, recPendientes: recPend.length,
        gestionados: gestiono.size,
        ultimaActividad: ultima?.fechaHora ?? null,
      };
    }).filter((f) => f.asignadas > 0 || f.gestionados > 0 || f.recPendientes > 0);

    const porGestion = GESTIONES.map((g) => {
      const cola = colaGestion(clientes, g.tipo);
      const gestionados = cola.filter((c) => gestionadosSet.has(c.id)).length;
      return { tipo: g.tipo, titulo: g.titulo, cola: cola.length, gestionados, alDia: pct(gestionados, cola.length) };
    });

    const carteraActiva = clientes.length;
    return {
      tareas: tareas.length, completadas: completadas.length, pendientes: pendientes.length,
      atrasadas: atrasadas.length, cumplimiento: pct(completadas.length, tareas.length),
      recVencidos: recVencidos.length, recPendientes: recordatorios.length,
      gestionados: gestionadosSet.size, carteraActiva,
      porColaborador, porGestion,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaActivaId, usuarioActivo, dias, tick]);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "admin.supervisar")) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Esta sección es de Supervisión de administración / Gerencia.</CardDescription>
      </CardHeader></Card>
    );
  }
  if (!datos) return null;

  const exportar = () =>
    exportarExcel(
      datos.porColaborador.map((f) => ({
        "Colaborador": f.nombre,
        "Asignaciones": f.asignadas,
        "Completadas": f.completadas,
        "% cumplimiento": f.cumplimiento,
        [`Atrasadas (>${DIAS_ATRASO} días)`]: f.atrasadas,
        "Recordatorios pendientes": f.recPendientes,
        "Recordatorios vencidos": f.recVencidos,
        [`Clientes gestionados (${dias} días)`]: f.gestionados,
        "Última actividad": f.ultimaActividad ? fechaHora(f.ultimaActividad) : "",
      })),
      `supervision-administracion-${dias}dias`
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><ClipboardCheck className="h-6 w-6" /> Supervisión de administración</h1>
          <p className="text-muted-foreground">
            Qué porcentaje del trabajo está al día: asignaciones según sus fechas, recordatorios
            y clientes gestionados por colaborador y por gestión.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <Button variant="outline" onClick={exportar}><Download className="h-4 w-4" /> Excel</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Cumplimiento de asignaciones</p>
          <p className="text-2xl font-bold">{datos.cumplimiento}%</p>
          <p className="text-xs text-muted-foreground">{datos.completadas} de {datos.tareas} completadas</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pendientes atrasadas (&gt;{DIAS_ATRASO} días)</p>
          <p className={`text-2xl font-bold ${datos.atrasadas > 0 ? "text-red-600" : "text-emerald-600"}`}>{datos.atrasadas}</p>
          <p className="text-xs text-muted-foreground">de {datos.pendientes} pendientes</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Recordatorios vencidos</p>
          <p className={`text-2xl font-bold ${datos.recVencidos > 0 ? "text-red-600" : "text-emerald-600"}`}>{datos.recVencidos}</p>
          <p className="text-xs text-muted-foreground">de {datos.recPendientes} pendientes</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Clientes gestionados ({dias} días)</p>
          <p className="text-2xl font-bold">{datos.gestionados}</p>
          <p className="text-xs text-muted-foreground">{pct(datos.gestionados, datos.carteraActiva)}% de {datos.carteraActiva} en cartera</p>
        </Card>
      </div>

      {/* Por colaborador */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Por colaborador</CardTitle>
          <CardDescription>
            Cumplimiento de asignaciones del call center, recordatorios y clientes gestionados en el período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Asignaciones</TableHead>
                <TableHead>Cumplimiento</TableHead>
                <TableHead>Atrasadas</TableHead>
                <TableHead>Record. vencidos</TableHead>
                <TableHead>Gestionados ({dias}d)</TableHead>
                <TableHead>Última actividad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos.porColaborador.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{f.completadas}/{f.asignadas}</TableCell>
                  <TableCell><Barra valor={f.cumplimiento} /></TableCell>
                  <TableCell>{f.atrasadas > 0 ? <Badge variant="destructive">{f.atrasadas}</Badge> : <Badge variant="success">0</Badge>}</TableCell>
                  <TableCell>{f.recVencidos > 0 ? <Badge variant="destructive">{f.recVencidos}</Badge> : <span className="text-muted-foreground">{f.recPendientes > 0 ? "al día" : "—"}</span>}</TableCell>
                  <TableCell className="font-medium">{f.gestionados}</TableCell>
                  <TableCell className="text-muted-foreground">{f.ultimaActividad ? fechaHora(f.ultimaActividad) : "—"}</TableCell>
                </TableRow>
              ))}
              {datos.porColaborador.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Sin actividad ni asignaciones todavía. Asigná tareas desde Call center o agendá recordatorios en Gestiones.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Por gestión */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Avance por gestión</CardTitle>
          <CardDescription>
            De cada cola de llamados, cuántos clientes fueron gestionados (con registro en el anotador) en los últimos {dias} días.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gestión</TableHead>
                <TableHead>Clientes en cola</TableHead>
                <TableHead>Gestionados ({dias}d)</TableHead>
                <TableHead>% al día</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos.porGestion.map((g) => (
                <TableRow key={g.tipo}>
                  <TableCell className="font-medium">{g.titulo}</TableCell>
                  <TableCell className="text-muted-foreground">{g.cola}</TableCell>
                  <TableCell className="text-muted-foreground">{g.gestionados}</TableCell>
                  <TableCell>{g.cola > 0 ? <Barra valor={g.alDia} /> : <span className="text-muted-foreground">sin clientes</span>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
