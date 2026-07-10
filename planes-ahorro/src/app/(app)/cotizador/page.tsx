"use client";

import { useEffect, useMemo, useState } from "react";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import {
  DB, buscarPlan, cotizarSeq, seqDelPlan, actualizacionVigente,
  type PlanAdjudicado, type Provincia,
} from "@/lib/cotizador";
import { suscribir, listarClientes } from "@/lib/store";
import type { Cliente } from "@/lib/types";
import { pesos } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Search, Printer } from "lucide-react";

const $n = (v: number | null | undefined) => (v == null ? "—" : pesos(Math.round(v)));

export default function CotizadorPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);
  useEffect(() => suscribir(() => setTick((t) => t + 1)), []);
  const [grupo, setGrupo] = useState("");
  const [orden, setOrden] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanAdjudicado | null>(null);
  const [prov, setProv] = useState<Provincia>("nqn");
  const [cancelado, setCancelado] = useState(false);
  const [alicPagada, setAlicPagada] = useState(false);
  const [seqs, setSeqs] = useState<string[]>(["", "", ""]);

  // Deep-link: /cotizador?grupo=…&orden=…
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const g = p.get("grupo"), o = p.get("orden");
    if (g && o) {
      setGrupo(g); setOrden(o);
      ejecutarBusqueda(g, o);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ejecutarBusqueda = (g: string, o: string) => {
    setError(null);
    const r = buscarPlan(g, o, empresaActivaId);
    if (!r.ok) { setError(r.error); setPlan(null); return; }
    setPlan(r.plan);
    setAlicPagada(false);
    setCancelado(false);
    setSeqs([seqDelPlan(r.plan.desc), "", ""]);
  };

  const cotizaciones = useMemo(
    () => (plan ? seqs.map((s) => cotizarSeq(plan, s, { prov, cancelado, alicuotaPagada: alicPagada })) : []),
    [plan, seqs, prov, cancelado, alicPagada]
  );

  const resultados = useMemo<Cliente[]>(() => {
    const t = busqueda.trim().toLowerCase();
    if (t.length < 3 || !empresaActivaId || !usuarioActivo) return [];
    return listarClientes(empresaActivaId, {}, usuarioActivo)
      .filter((c) => c.solicitud.grupo && c.solicitud.orden)
      .filter((c) =>
        c.nombreCompleto.toLowerCase().includes(t) ||
        (c.documento || "").toLowerCase().includes(t) ||
        (c.solicitud.nroSolicitud || "").toLowerCase().includes(t) ||
        (c.telefono || "").replace(/\D/g, "").includes(t.replace(/\D/g, "") || "\u0000")
      )
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, empresaActivaId, usuarioActivo, tick]);

  const elegirCliente = (c: Cliente) => {
    const g = c.solicitud.grupo!;
    const o = c.solicitud.orden!;
    setGrupo(g);
    setOrden(o);
    setBusqueda("");
    ejecutarBusqueda(g, o);
  };

  const fuente = useMemo(
    () => actualizacionVigente(empresaActivaId),
    [empresaActivaId, tick]
  );

  const opcionesSeq = useMemo(
    () => Object.entries(DB.prec2).map(([seq, r]) => ({ seq, label: `${seq} — ${r[0]}` })),
    []
  );

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "clientes.ver")) {
    return <Card><CardHeader><CardTitle>Sin acceso</CardTitle></CardHeader></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Calculator className="h-6 w-6" /> Cotizador del adjudicado</h1>
          <p className="text-muted-foreground">
            Requisitos, alícuota, cambio de modelo y gastos de patentamiento por jurisdicción.
            Datos de la actualización del <strong>{fuente.fecha}</strong>{" "}
            {fuente.importada
              ? <Badge variant="success">cartera importada</Badge>
              : <Badge variant="secondary">planilla embebida — importá el Novedades para actualizar</Badge>}.
          </p>
        </div>
        {plan && (
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir / PDF</Button>
        )}
      </div>

      {/* Buscador */}
      <Card className="p-4">
        <div className="mb-3 space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">
            Buscar cliente (apellido, DNI, N° de solicitud o teléfono)
          </span>
          <div className="relative max-w-xl">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej: ZAPELLA, 20123456, 1353689…"
            />
            {resultados.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-card shadow-md">
                {resultados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => elegirCliente(c)}
                    className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
                  >
                    <span className="font-medium">{c.nombreCompleto}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {c.solicitud.grupo}/{c.solicitud.orden}{c.solicitud.statusDesc ? ` · ${c.solicitud.statusDesc}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {busqueda.trim().length >= 3 && resultados.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sin coincidencias en la cartera importada de esta empresa.
              </p>
            )}
          </div>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); ejecutarBusqueda(grupo, orden); }}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Grupo</span>
            <Input value={grupo} onChange={(e) => setGrupo(e.target.value)} className="w-32" placeholder="11405" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Orden</span>
            <Input value={orden} onChange={(e) => setOrden(e.target.value)} className="w-32" placeholder="6" />
          </label>
          <Button type="submit"><Search className="h-4 w-4" /> Buscar plan</Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      </Card>

      {plan && (
        <>
          {/* Datos del plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan {plan.key} · {plan.codPlan}</CardTitle>
              <CardDescription>{plan.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <Dato k="Tipo de plan" v={plan.tipo} />
                <Dato k="Valor móvil" v={$n(plan.vm)} destacar />
                <Dato k="Cuotas pagas" v={`${plan.pagas} de ${plan.totCuotas}`} />
                <Dato k="Cuotas a vencer" v={String(plan.aVencer)} />
                <Dato k="Derecho de adjudicación (1,21% + $1)" v={$n(plan.derecho)} />
                <Dato k="Saldo estimado de cuotas" v={$n(plan.saldo)} />
                {plan.alicTotal > 0 && (
                  <Dato k={`Alícuota extraordinaria (${plan.tipo === "70/30" ? "30%" : "20%"} + 1,25%)`} v={$n(plan.alicTotal)} destacar />
                )}
              </div>
              {plan.beneficio && (
                <p className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-sm text-emerald-900">
                  <strong>Bonificación especial:</strong> {plan.beneficio}
                </p>
              )}
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="mb-1 font-medium">Documentación / requisitos para este caso</p>
                <p className="whitespace-pre-line text-muted-foreground">{plan.reqTexto}</p>
              </div>
            </CardContent>
          </Card>

          {/* Opciones */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <span className="font-medium">Patenta en:</span>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={prov === "nqn"} onChange={() => setProv("nqn")} /> Neuquén
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={prov === "rn"} onChange={() => setProv("rn")} /> Río Negro
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={cancelado} onChange={(e) => setCancelado(e.target.checked)} />
                Plan cancelado / patenta el cliente
              </label>
              {plan.alicTotal > 0 && (
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={alicPagada} onChange={(e) => setAlicPagada(e.target.checked)} />
                  Alícuota ya pagada
                </label>
              )}
            </div>
          </Card>

          {/* Slots de cotización */}
          <div className="grid gap-4 lg:grid-cols-3">
            {[0, 1, 2].map((i) => {
              const cot = cotizaciones[i];
              return (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Modelo N° {i + 1}</CardTitle>
                    <select
                      value={seqs[i]}
                      onChange={(e) => setSeqs((s) => s.map((v, j) => (j === i ? e.target.value : v)))}
                      className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">— Elegir modelo (SEQ) —</option>
                      {opcionesSeq.map((o) => <option key={o.seq} value={o.seq}>{o.label}</option>)}
                    </select>
                  </CardHeader>
                  <CardContent className="text-sm">
                    {!cot && <p className="text-muted-foreground">Elegí un modelo para cotizar.</p>}
                    {cot && "error" in cot && <p className="text-destructive">{cot.error}</p>}
                    {cot && !("error" in cot) && (
                      <div className="space-y-1.5">
                        <p className="font-medium">{cot.desc} <Badge variant="secondary">{cot.origen}</Badge></p>
                        {cot.nota && <p className="text-xs text-amber-700">{cot.nota}</p>}
                        <Fila k="Valor de lista" v={$n(cot.precioActual)} />
                        <Fila k="Precio promo" v={cot.promo != null ? $n(cot.promo) : "No publicado"} />
                        <Fila k="Diferencia de modelo (lista)" v={$n(cot.difActual)} resaltar={cot.difActual > 0} />
                        {cot.difPromo != null && <Fila k="Diferencia con promo" v={$n(cot.difPromo)} resaltar={cot.difPromo > 0} />}
                        <hr className="my-2" />
                        <Fila k="Gestoría + inscripción" v={$n(cot.inscripcion)} />
                        <Fila k={`Sellado (${prov === "nqn" ? "Neuquén 1,4%" : "Río Negro 2%"})`} v={$n(cot.sellado)} />
                        <Fila k="Prenda (2,8% del saldo)" v={$n(cot.prenda)} />
                        <Fila k="Flete y traslado" v={$n(cot.flete)} />
                        <Fila k="Derecho de adjudicación" v={$n(plan.derecho)} />
                        {cot.alicPendiente > 0 && <Fila k="Alícuota pendiente" v={$n(cot.alicPendiente)} />}
                        <hr className="my-2" />
                        <Fila k="TOTAL patentando el concesionario" v={$n(cot.totalConc)} total />
                        {cot.totalConcPromo != null && <Fila k="Total con precio promo" v={$n(cot.totalConcPromo)} />}
                        {cot.totalCli != null && <Fila k="TOTAL patentando el cliente" v={$n(cot.totalCli)} total />}
                        {cot.totalCliPromo != null && <Fila k="Total cliente con promo" v={$n(cot.totalCliPromo)} />}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Los valores son estimativos, sujetos a disponibilidad y a la actualización vigente ({fuente.fecha}).
            Parámetros: gestoría Neuquén 2,33%/3,03% y Río Negro 2,95%/3,65% (nacional/importado) con tabla
            exacta cuando existe, sellado 1,4%/2%, prenda 2,8% del saldo, adicional gestoría {$n(5000)} y
            gastos fijos {$n(4950)}.
          </p>
        </>
      )}
    </div>
  );
}

function Dato({ k, v, destacar }: { k: string; v: string; destacar?: boolean }) {
  return (
    <div className={destacar ? "rounded-md border border-primary/30 bg-primary/5 p-2" : ""}>
      <span className="block text-xs text-muted-foreground">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}

function Fila({ k, v, total, resaltar }: { k: string; v: string; total?: boolean; resaltar?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-2 ${total ? "font-bold" : ""}`}>
      <span className={total ? "" : "text-muted-foreground"}>{k}</span>
      <span className={`tabular-nums ${resaltar ? "text-amber-700 font-semibold" : ""}`}>{v}</span>
    </div>
  );
}
