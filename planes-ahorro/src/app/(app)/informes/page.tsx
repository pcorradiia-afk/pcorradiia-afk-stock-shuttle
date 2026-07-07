"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import {
  inicializar, suscribir, listarClientes, vendedoresDeEmpresa,
  listarObservacionesEmpresa, ESTADIOS_ORDEN, etiquetaScoring, getPlan, listarComunicaciones,
} from "@/lib/store";
import { esRescindido } from "@/lib/gestiones";
import { exportarExcel } from "@/lib/exportar";
import { ESTADIO_LABEL, ESTADO_LABEL, fechaHora } from "@/lib/labels";
import type { Cliente } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, BarChart3 } from "lucide-react";

export default function InformesPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [vendedorId, setVendedorId] = useState("todos");
  const [estado, setEstado] = useState("todos");

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const vendedores = useMemo(
    () => (empresaActivaId ? vendedoresDeEmpresa(empresaActivaId) : []),
    [empresaActivaId]
  );

  const clientes = useMemo<Cliente[]>(() => {
    if (!empresaActivaId || !usuarioActivo) return [];
    let lista = listarClientes(empresaActivaId, {}, usuarioActivo);
    if (desde) lista = lista.filter((c) => c.fechaAlta.slice(0, 10) >= desde);
    if (hasta) lista = lista.filter((c) => c.fechaAlta.slice(0, 10) <= hasta);
    if (vendedorId !== "todos") lista = lista.filter((c) => c.vendedorId === vendedorId);
    if (estado !== "todos") lista = lista.filter((c) => c.estado === estado);
    return lista;
  }, [empresaActivaId, usuarioActivo, desde, hasta, vendedorId, estado, tick]);

  const embudo = useMemo(
    () => ESTADIOS_ORDEN.map((e) => ({
      estadio: e,
      cantidad: clientes.filter((c) => c.estadio === e && !esRescindido(c)).length,
    })),
    [clientes]
  );

  // Rescindidos: fuera de gestiones y embudo, pero listados acá para una eventual reactivación.
  const rescindidos = useMemo(
    () => (empresaActivaId && usuarioActivo ? listarClientes(empresaActivaId, {}, usuarioActivo).filter(esRescindido) : []),
    [empresaActivaId, usuarioActivo, tick]
  );
  const maxEmbudo = Math.max(1, ...embudo.map((e) => e.cantidad));

  const porVendedor = useMemo(
    () =>
      vendedores.map((v) => {
        const suyos = clientes.filter((c) => c.vendedorId === v.id);
        const vendidos = suyos.filter((c) => c.estado === "vendido").length;
        return {
          nombre: v.nombre,
          leads: suyos.length,
          vendidos,
          efectividad: suyos.length ? Math.round((vendidos / suyos.length) * 100) : 0,
        };
      }),
    [vendedores, clientes]
  );

  const observaciones = useMemo(
    () => (empresaActivaId ? listarObservacionesEmpresa(empresaActivaId).filter((o) => o.resultado.startsWith("observado")) : []),
    [empresaActivaId, tick]
  );
  const abiertas = observaciones.filter((o) => !o.gestionResultado);
  const resueltas = observaciones.filter((o) => o.gestionResultado && o.gestionFechaHora);
  const promHoras = resueltas.length
    ? Math.round(
        resueltas.reduce((acc, o) => acc + (new Date(o.gestionFechaHora!).getTime() - new Date(o.fechaHora).getTime()), 0) /
          resueltas.length / 36e5 * 10
      ) / 10
    : null;

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "informes.ver")) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Tu rol no puede ver los informes.</CardDescription>
      </CardHeader></Card>
    );
  }

  const exportarAhorristas = () =>
    exportarExcel(
      clientes.map((c) => ({
        "Nombre": c.nombreCompleto,
        "Documento": c.documento ?? "",
        "Teléfono": c.telefono ?? "",
        "Email": c.email ?? "",
        "N° solicitud": c.solicitud.nroSolicitud ?? "",
        "Grupo": c.solicitud.grupo ?? "",
        "Orden": c.solicitud.orden ?? "",
        "Plan": c.solicitud.plan ?? "",
        "Modelo": c.solicitud.modelo ?? "",
        "Estado": ESTADO_LABEL[c.estado],
        "Estadio": ESTADIO_LABEL[c.estadio],
        "Vendedor": vendedores.find((v) => v.id === c.vendedorId)?.nombre ?? "",
        "Plan ofrecido": getPlan(c.planId)?.codigo ?? "",
        "Origen": c.origenDato ?? "",
        "Fecha de alta": c.fechaAlta.slice(0, 10),
      })),
      "ahorristas"
    );

  const exportarObservaciones = () =>
    exportarExcel(
      observaciones.map((o) => ({
        "Cliente": o.clienteNombre,
        "Resultado": etiquetaScoring(o.resultado),
        "Fecha": fechaHora(o.fechaHora),
        "Registró": o.usuarioNombre,
        "Gestión": o.gestionResultado ?? "PENDIENTE",
        "Fecha gestión": o.gestionFechaHora ? fechaHora(o.gestionFechaHora) : "",
        "Gestionó": o.gestionUsuarioNombre ?? "",
      })),
      "observaciones-scoring"
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><BarChart3 className="h-6 w-6" /> Informes</h1>
          <p className="text-muted-foreground">Tablero gerencial de la empresa seleccionada. Todo listado se exporta a Excel.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportarAhorristas}><Download className="h-4 w-4" /> Ahorristas (Excel)</Button>
          <Button variant="outline" onClick={exportarObservaciones}><Download className="h-4 w-4" /> Scoring (Excel)</Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <Filtro label="Alta desde">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          </Filtro>
          <Filtro label="Alta hasta">
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          </Filtro>
          <Filtro label="Vendedor">
            <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="todos">Todos</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Filtro>
          <Filtro label="Estado">
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="todos">Todos</option>
              {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Filtro>
          {(desde || hasta || vendedorId !== "todos" || estado !== "todos") && (
            <Button variant="ghost" size="sm" onClick={() => { setDesde(""); setHasta(""); setVendedorId("todos"); setEstado("todos"); }}>
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi t="Ahorristas (filtro)" v={clientes.length} />
        <Kpi t="Leads" v={clientes.filter((c) => c.estado === "lead").length} />
        <Kpi t="Vendidos" v={clientes.filter((c) => c.estado === "vendido").length} />
        <Kpi t="Observaciones abiertas" v={abiertas.length} detalle={promHoras != null ? `resolución prom.: ${promHoras} h` : undefined} />
      </div>

      {/* Embudo por estadio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embudo por estadio</CardTitle>
          <CardDescription>Cantidad de clientes en cada etapa del proceso (según filtros).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2" role="img" aria-label="Embudo de clientes por estadio">
            {embudo.map((f) => (
              <div key={f.estadio} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-muted-foreground">{ESTADIO_LABEL[f.estadio]}</span>
                <div className="h-5 flex-1 rounded-sm bg-muted" title={`${ESTADIO_LABEL[f.estadio]}: ${f.cantidad}`}>
                  <div
                    className="h-5 rounded-sm bg-primary"
                    style={{ width: `${(f.cantidad / maxEmbudo) * 100}%`, minWidth: f.cantidad > 0 ? "0.5rem" : 0 }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{f.cantidad}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ventas por vendedor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ventas y efectividad por vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-center">Vendidos</TableHead>
                <TableHead className="w-64">Efectividad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {porVendedor.map((r) => (
                <TableRow key={r.nombre}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  <TableCell className="text-center tabular-nums">{r.leads}</TableCell>
                  <TableCell className="text-center tabular-nums">{r.vendidos}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 flex-1 rounded-sm bg-muted" title={`${r.efectividad}%`}>
                        <div className="h-2.5 rounded-sm bg-primary" style={{ width: `${r.efectividad}%` }} />
                      </div>
                      <span className="w-10 text-right text-sm tabular-nums">{r.efectividad}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {porVendedor.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No hay vendedores en esta empresa.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Observaciones de scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones de scoring</CardTitle>
          <CardDescription>
            {abiertas.length} abierta(s){promHoras != null ? ` · tiempo de resolución promedio: ${promHoras} h` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {observaciones.slice(0, 15).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    <Link href={`/clientes/${o.clienteId}`} className="hover:underline">{o.clienteNombre}</Link>
                  </TableCell>
                  <TableCell>{etiquetaScoring(o.resultado)}</TableCell>
                  <TableCell className="text-muted-foreground">{fechaHora(o.fechaHora)}</TableCell>
                  <TableCell>
                    {o.gestionResultado
                      ? <Badge variant="success">gestionada</Badge>
                      : <Badge variant="warning">abierta</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {observaciones.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">Sin observaciones registradas.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rescindidos (fuera de gestiones por decisión del cliente; acá para reactivación) */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Rescindidos — {rescindidos.length}</CardTitle>
            <CardDescription>
              Contratos rescindidos según FIS. No aparecen en las gestiones ni en el embudo;
              esta lista sirve para una eventual campaña de reactivación.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={rescindidos.length === 0}
            onClick={() =>
              exportarExcel(
                rescindidos.map((c) => {
                  const ultima = listarComunicaciones(c.id)[0];
                  return {
                    "Nombre": c.nombreCompleto,
                    "Teléfono": c.telefono ?? "",
                    "Email": c.email ?? "",
                    "Grupo": c.solicitud.grupo ?? "",
                    "Orden": c.solicitud.orden ?? "",
                    "N° solicitud": c.solicitud.nroSolicitud ?? "",
                    "Modelo": c.solicitud.modelo ?? "",
                    "Cuotas pagas": c.solicitud.pagas ?? "",
                    "Cuotas emitidas": c.solicitud.emitidas ?? "",
                    "Fecha agrupamiento": c.solicitud.fechaAgrupo ?? "",
                    "Última gestión": ultima ? fechaHora(ultima.fechaHora) : "",
                    "Detalle última gestión": ultima?.detalle ?? "",
                  };
                }),
                "rescindidos-reactivacion"
              )
            }
          >
            <Download className="h-4 w-4" /> Excel
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Grupo/Orden</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Cuotas pagas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rescindidos.slice(0, 15).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/clientes/${c.id}`} className="hover:underline">{c.nombreCompleto}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.telefono ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.solicitud.grupo ?? "—"}/{c.solicitud.orden ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.solicitud.modelo ?? "—"}</TableCell>
                  <TableCell>{c.solicitud.pagas ?? "—"} / {c.solicitud.emitidas ?? "—"}</TableCell>
                </TableRow>
              ))}
              {rescindidos.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No hay rescindidos en la cartera.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {rescindidos.length > 15 && (
            <p className="mt-2 text-sm text-muted-foreground">Mostrando 15 de {rescindidos.length}. Bajá el Excel para la lista completa.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Filtro({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Kpi({ t, v, detalle }: { t: string; v: number; detalle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{t}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{v}</CardTitle>
      </CardHeader>
      {detalle && <CardContent className="pt-0 text-xs text-muted-foreground">{detalle}</CardContent>}
    </Card>
  );
}
