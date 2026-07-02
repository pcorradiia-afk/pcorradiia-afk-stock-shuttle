"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { inicializar, suscribir, listarClientes, listarComunicaciones } from "@/lib/store";
import { GESTIONES, colaGestion, claveFecha, type GestionTipo } from "@/lib/gestiones";
import { exportarExcel } from "@/lib/exportar";
import { fechaHora } from "@/lib/labels";
import type { Cliente } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, PhoneCall } from "lucide-react";

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
