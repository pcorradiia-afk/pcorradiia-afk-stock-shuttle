"use client";

// Comisiones a comercializadoras (gestiones terciarizadas que venden planes).
// Esquema configurable por comercializadora (monto fijo por solicitud o % del
// valor móvil) + liquidaciones mensuales con historial y export a Excel.
// ⚠️ Base de cálculo A CONFIRMAR con el cliente (CLAUDE.md).

import { useEffect, useMemo, useState } from "react";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import {
  suscribir, listarComercializadoras, esquemasComision, guardarEsquemaComision,
  ventasComercializadora, generarLiquidacion, listarLiquidaciones,
  cambiarEstadoLiquidacion, eliminarLiquidacion, type EsquemaComision,
} from "@/lib/store";
import { exportarExcel } from "@/lib/exportar";
import { pesos } from "@/lib/labels";
import type { LiquidacionComision } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, HandCoins, Plus, Trash2 } from "lucide-react";

const ESTADO_BADGE: Record<LiquidacionComision["estado"], "outline" | "warning" | "success"> = {
  borrador: "outline", aprobada: "warning", pagada: "success",
};

function mesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ComisionesPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [, setTick] = useState(0);
  useEffect(() => suscribir(() => setTick((t) => t + 1)), []);

  const [comercializadora, setComercializadora] = useState("");
  const [nuevaCom, setNuevaCom] = useState("");
  const [periodo, setPeriodo] = useState(mesActual());
  const [tipo, setTipo] = useState<EsquemaComision["tipo"]>("monto_fijo");
  const [valor, setValor] = useState("");
  const [detalle, setDetalle] = useState<LiquidacionComision | null>(null);

  const comercializadoras = useMemo(
    () => (empresaActivaId ? listarComercializadoras(empresaActivaId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresaActivaId, nuevaCom]
  );

  useEffect(() => {
    if (!comercializadora && comercializadoras.length) setComercializadora(comercializadoras[0]);
  }, [comercializadoras, comercializadora]);

  // Al elegir comercializadora, cargar su esquema guardado.
  useEffect(() => {
    if (!empresaActivaId || !comercializadora) return;
    const e = esquemasComision(empresaActivaId)[comercializadora];
    if (e) { setTipo(e.tipo); setValor(String(e.valor)); }
  }, [empresaActivaId, comercializadora]);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "importar") && !usuarioActivo.roles.includes("gerencia")) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Esta sección es de Administración / Gerencia.</CardDescription>
      </CardHeader></Card>
    );
  }
  const soloLectura = !tienePermiso(usuarioActivo.roles, "importar");

  const ventas = empresaActivaId && comercializadora ? ventasComercializadora(empresaActivaId, comercializadora, periodo) : [];
  const liquidaciones = empresaActivaId ? listarLiquidaciones(empresaActivaId) : [];
  const valorNum = Number(valor.replace(",", "."));
  const esquemaValido = Number.isFinite(valorNum) && valorNum > 0;

  const generar = () => {
    if (!empresaActivaId || !comercializadora || !esquemaValido) return;
    const esquema: EsquemaComision = { tipo, valor: valorNum };
    guardarEsquemaComision(empresaActivaId, comercializadora, esquema);
    const liq = generarLiquidacion(empresaActivaId, comercializadora, periodo, esquema, usuarioActivo.nombre);
    setDetalle(liq);
  };

  const exportar = (l: LiquidacionComision) =>
    exportarExcel(
      l.items.map((i) => ({
        "Comercializadora": l.comercializadora,
        "Período": l.periodo,
        "Cliente": i.nombre,
        "N° solicitud": i.nroSolicitud ?? "",
        "Fecha de venta": i.fechaVenta ? new Date(i.fechaVenta).toLocaleDateString("es-AR") : "",
        "Base (valor móvil)": i.base ?? "",
        "Comisión": i.comision,
      })),
      `comisiones-${l.comercializadora}-${l.periodo}`
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><HandCoins className="h-6 w-6" /> Comisiones a comercializadoras</h1>
        <p className="text-muted-foreground">
          Liquidación mensual por comercializadora según sus ventas cerradas. El esquema
          (monto fijo por solicitud o % del valor móvil) se guarda por comercializadora.
        </p>
      </div>

      {!soloLectura && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Generar liquidación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Comercializadora</span>
                <select value={comercializadora} onChange={(e) => setComercializadora(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {comercializadoras.length === 0 && <option value="">— sin comercializadoras —</option>}
                  {comercializadoras.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Agregar comercializadora</span>
                <span className="flex gap-1">
                  <Input className="h-10 w-44" value={nuevaCom} onChange={(e) => setNuevaCom(e.target.value)} placeholder="Nombre (= gestión)" />
                  <Button variant="outline" onClick={() => {
                    const n = nuevaCom.trim();
                    if (n && empresaActivaId) {
                      guardarEsquemaComision(empresaActivaId, n, { tipo: "monto_fijo", valor: 0 });
                      setComercializadora(n);
                      setNuevaCom("");
                    }
                  }}><Plus className="h-4 w-4" /></Button>
                </span>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Mes</span>
                <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">Esquema</span>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as EsquemaComision["tipo"])} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="monto_fijo">Monto fijo por solicitud</option>
                  <option value="pct_valor_movil">% del valor móvil</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="block text-xs font-medium text-muted-foreground">{tipo === "monto_fijo" ? "Monto ($ por solicitud)" : "Porcentaje (%)"}</span>
                <Input className="h-10 w-36" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === "monto_fijo" ? "50000" : "1,5"} />
              </label>
              <Button onClick={generar} disabled={!comercializadora || !esquemaValido || ventas.length === 0}>
                Generar ({ventas.length} venta{ventas.length === 1 ? "" : "s"})
              </Button>
            </div>
            {comercializadora && ventas.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No hay ventas cerradas de <strong>{comercializadora}</strong> en {periodo.split("-").reverse().join("/")}.
                (Cuentan los clientes de esa gestión con fecha de venta en el mes.)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {detalle && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Liquidación {detalle.comercializadora} — {detalle.periodo.split("-").reverse().join("/")}
              <Badge variant={ESTADO_BADGE[detalle.estado]}>{detalle.estado}</Badge>
              <span className="grow" />
              <Button size="sm" variant="outline" onClick={() => exportar(detalle)}><Download className="h-4 w-4" /> Excel</Button>
              <Button size="sm" variant="outline" onClick={() => setDetalle(null)}>Cerrar</Button>
            </CardTitle>
            <CardDescription>
              {detalle.esquema.tipo === "monto_fijo" ? `${pesos(detalle.esquema.valor)} por solicitud` : `${detalle.esquema.valor}% del valor móvil`}
              {" — generada por "}{detalle.creadaPorNombre}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>N° solicitud</TableHead>
                  <TableHead>Fecha venta</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalle.items.map((i) => (
                  <TableRow key={i.clienteId}>
                    <TableCell className="font-medium">{i.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{i.nroSolicitud ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{i.fechaVenta ? new Date(i.fechaVenta).toLocaleDateString("es-AR") : "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{i.base != null ? pesos(i.base) : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{pesos(i.comision)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">{pesos(detalle.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Historial de liquidaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Comercializadora</TableHead>
                <TableHead>Ventas</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {liquidaciones.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.periodo.split("-").reverse().join("/")}</TableCell>
                  <TableCell>{l.comercializadora}</TableCell>
                  <TableCell className="text-muted-foreground">{l.items.length}</TableCell>
                  <TableCell className="text-right font-medium">{pesos(l.total)}</TableCell>
                  <TableCell><Badge variant={ESTADO_BADGE[l.estado]}>{l.estado}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetalle(l)}>Ver</Button>
                      <Button size="sm" variant="ghost" onClick={() => exportar(l)}><Download className="h-4 w-4" /></Button>
                      {!soloLectura && l.estado === "borrador" && (
                        <Button size="sm" variant="outline" onClick={() => cambiarEstadoLiquidacion(l.id, "aprobada")}>Aprobar</Button>
                      )}
                      {!soloLectura && l.estado === "aprobada" && (
                        <Button size="sm" variant="outline" onClick={() => cambiarEstadoLiquidacion(l.id, "pagada")}>Marcar pagada</Button>
                      )}
                      {!soloLectura && l.estado !== "pagada" && (
                        <Button size="sm" variant="ghost" title="Eliminar" onClick={() => {
                          if (confirm("¿Eliminar esta liquidación?")) { eliminarLiquidacion(l.id); if (detalle?.id === l.id) setDetalle(null); }
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {liquidaciones.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Todavía no hay liquidaciones. Generá la primera arriba.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
