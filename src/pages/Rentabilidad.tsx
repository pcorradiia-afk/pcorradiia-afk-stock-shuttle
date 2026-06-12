import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileText, Scale, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { DEPARTAMENTOS, EMPRESAS, PERIODOS } from "@/data/demo";
import { resumenPorDepto, ultimoPeriodo } from "@/data/selectors";
import { useImportaciones } from "@/data/useImportaciones";
import { gestionImportada, moraImportada, patrimonialImportada, ventasImportada } from "@/data/importedSelectors";
import { useUnidadesPlanes, unidadesTotales } from "@/data/unidadesPlanes";
import { useCriterioProrrateo } from "@/data/criteriosCuadro";
import { UnidadesPlanesEditor } from "@/components/UnidadesPlanesEditor";
import { ConciliacionGestion } from "@/components/ConciliacionGestion";
import type { CeldaPL } from "@/lib/oliauto";
import { descargarCuadroExcel } from "@/lib/excel";
import { abrirReporteEjecutivo, type AreaReporte } from "@/lib/reporteHTML";
import { fecha, money, moneyShort, num, pct, periodoLabel } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/ui-kit";
import { Anotaciones } from "@/components/Anotaciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const OPERATIVOS: { key: string; label: string; color: string }[] = [
  { key: "0km", label: "Unidades 0km", color: "#2563eb" },
  { key: "usados", label: "Unidades usados", color: "#7c3aed" },
  { key: "planes", label: "Planes de Ahorro", color: "#16a34a" },
  { key: "unidades", label: "Unidades · g. comunes", color: "#0ea5e9" },
  { key: "repuestos", label: "Repuestos", color: "#ca8a04" },
  { key: "posventa", label: "Servicios / Taller", color: "#0891b2" },
];
// Destinos del prorrateo de los gastos comunes de Unidades (depto "unidades").
const DESTINOS_PRORRATEO = ["0km", "usados", "planes"] as const;
// Columnas que se muestran: "unidades" (comunes) se prorratea y desaparece.
const OPERATIVOS_VIEW = OPERATIVOS.filter((d) => d.key !== "unidades");
const NO_OPERATIVOS: { key: string; label: string }[] = [
  { key: "admin", label: "Gastos de estructura" },
  { key: "financiero", label: "Resultados financieros" },
  { key: "varios", label: "Resultados varios" },
];

const vacia = (): CeldaPL => ({ ingresos: 0, costos: 0, gastos: 0, resultado: 0 });

/** Cascada de un departamento (formato cuadro: costos/gastos en negativo). */
interface FilaCuadro {
  key: string;
  label: string;
  color: string;
  ventas: number;
  costos: number; // negativo
  margen: number;
  gVar: number; // negativo
  contMarg: number;
  gFijos: number; // negativo
  otrosIng: number;
  benef: number;
}

function cascada(key: string, label: string, color: string, c: CeldaPL): FilaCuadro {
  const ventas = c.ingresos;
  const costos = -c.costos;
  const margen = ventas + costos;
  const gVar = -(c.gastosVar ?? 0);
  const contMarg = margen + gVar;
  const gFijos = -(c.gastos - (c.gastosVar ?? 0));
  const otrosIng = c.otrosIng ?? 0;
  const benef = contMarg + gFijos + otrosIng;
  return { key, label, color, ventas, costos, margen, gVar, contMarg, gFijos, otrosIng, benef };
}

export function Rentabilidad() {
  const { empresaIdsActivos, seleccion, empresasVisibles } = useAuth();
  const importaciones = useImportaciones(empresaIdsActivos);
  const g = useMemo(() => gestionImportada(importaciones, empresaIdsActivos), [importaciones, empresaIdsActivos]);
  const ventas = useMemo(() => ventasImportada(importaciones, empresaIdsActivos), [importaciones, empresaIdsActivos]);
  const mora = useMemo(() => moraImportada(importaciones, empresaIdsActivos), [importaciones, empresaIdsActivos]);
  const patr = useMemo(() => patrimonialImportada(importaciones, empresaIdsActivos), [importaciones, empresaIdsActivos]);

  const ultimo = g.periodos[g.periodos.length - 1] ?? "";
  const nMeses = g.periodos.length;
  const [vista, setVista] = useState<string>("");
  const [detalle, setDetalle] = useState<{ linea: string; get: (f: FilaCuadro) => number; lineas: string[] } | null>(null);
  const modo = vista === "acum" || vista === "prom" || g.periodos.includes(vista) ? vista : ultimo;
  const esEspecial = modo === "acum" || modo === "prom";
  const periodo = modo;
  const anterior = esEspecial ? null : (g.periodos[g.periodos.indexOf(modo) - 1] ?? null);

  // Unidades de Planes de Ahorro (carga manual) para el período/modo mostrado.
  const mapaUnidades = useUnidadesPlanes();
  const criterio = useCriterioProrrateo();
  const periodosView = esEspecial ? g.periodos : [periodo];
  const uPlanesRaw = unidadesTotales(mapaUnidades, empresaIdsActivos, periodosView);
  const uPlanes =
    modo === "prom" && nMeses > 0
      ? { suscripciones: Math.round(uPlanesRaw.suscripciones / nMeses), entregas: Math.round(uPlanesRaw.entregas / nMeses) }
      : uPlanesRaw;

  // Cantidades y precio promedio para el encabezado de cada columna del cuadro.
  const unidadesCol = (key: string): string => {
    if (key === "0km" && ventas.payload?.unidades) {
      return `${num(ventas.payload.unidades)} un · ${moneyShort(ventas.payload.precioProm)} prom`;
    }
    if (key === "planes" && (uPlanes.suscripciones || uPlanes.entregas)) {
      return `${uPlanes.suscripciones} susc · ${uPlanes.entregas} entr`;
    }
    return "";
  };

  const etiqueta = (p: string) =>
    p === "acum" ? `Acumulado · ${nMeses} meses` : p === "prom" ? "Promedio mensual" : periodoLabel(p);
  const sufijo = modo === "acum" ? "acumulada" : modo === "prom" ? "prom. mensual" : "del mes";

  // ---- Vista demo si todavía no hay importaciones ----
  const [periodoDemo, setPeriodoDemo] = useState(ultimoPeriodo);
  const filasDemo = useMemo(() => resumenPorDepto(empresaIdsActivos, periodoDemo), [empresaIdsActivos, periodoDemo]);

  if (!g.hayDatos) {
    const tot = filasDemo.reduce(
      (a, f) => ({ ingresos: a.ingresos + f.ingresos, costos: a.costos + f.costos, gastos: a.gastos + f.gastos, resultado: a.resultado + f.resultado }),
      { ingresos: 0, costos: 0, gastos: 0, resultado: 0 },
    );
    return (
      <div>
        <PageHeader
          title="Análisis de gestión"
          description="Importá un balance parcial de Oliauto para ver el cuadro de situación económica real."
          action={
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Datos demo</Badge>
              <Select value={periodoDemo} onValueChange={setPeriodoDemo}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[...PERIODOS].reverse().map((p) => (
                    <SelectItem key={p} value={p}>{periodoLabel(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Costos</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filasDemo.map((f) => (
                  <TableRow key={f.depto}>
                    <TableCell className="font-medium">{DEPARTAMENTOS.find((d) => d.tipo === f.depto)?.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.ingresos)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.costos)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.gastos)}</TableCell>
                    <TableCell className={cn("text-right font-semibold tabular-nums", f.resultado < 0 && "text-destructive")}>{money(f.resultado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tot.ingresos)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tot.costos)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tot.gastos)}</TableCell>
                  <TableCell className={cn("text-right font-bold tabular-nums", tot.resultado < 0 && "text-destructive")}>{money(tot.resultado)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Cuadro real desde lo importado ----
  const celda = (key: string, per: string | null): CeldaPL => {
    if (per === "acum" || per === "prom") {
      const porPer = g.porDepto[key] ?? {};
      const acc = vacia();
      let split = false, otros = false;
      for (const c of Object.values(porPer)) {
        acc.ingresos += c.ingresos; acc.costos += c.costos; acc.gastos += c.gastos; acc.resultado += c.resultado;
        if (c.gastosVar !== undefined) { acc.gastosVar = (acc.gastosVar ?? 0) + c.gastosVar; split = true; }
        if (c.otrosIng !== undefined) { acc.otrosIng = (acc.otrosIng ?? 0) + c.otrosIng; otros = true; }
      }
      if (!split) acc.gastosVar = undefined;
      if (!otros) acc.otrosIng = undefined;
      if (per === "prom" && nMeses > 0) {
        acc.ingresos /= nMeses; acc.costos /= nMeses; acc.gastos /= nMeses; acc.resultado /= nMeses;
        if (acc.gastosVar !== undefined) acc.gastosVar /= nMeses;
        if (acc.otrosIng !== undefined) acc.otrosIng /= nMeses;
      }
      return acc;
    }
    return (per && g.porDepto[key]?.[per]) || vacia();
  };

  // Pesos del prorrateo de los gastos comunes de Unidades hacia 0km/usados/planes.
  const pesos = (per: string | null): Record<string, number> => {
    if (criterio.modo === "manual") {
      const t = criterio.pct["0km"] + criterio.pct.usados + criterio.pct.planes || 1;
      return { "0km": criterio.pct["0km"] / t, usados: criterio.pct.usados / t, planes: criterio.pct.planes / t };
    }
    const v = DESTINOS_PRORRATEO.map((k) => Math.max(0, celda(k, per).ingresos));
    const tot = v[0] + v[1] + v[2];
    if (!tot) return { "0km": 1, usados: 0, planes: 0 };
    return { "0km": v[0] / tot, usados: v[1] / tot, planes: v[2] / tot };
  };

  // Celda con el prorrateo aplicado: "unidades" (comunes) se reparte y queda en 0.
  const celdaAjustada = (key: string, per: string | null): CeldaPL => {
    const base = celda(key, per);
    if (key === "unidades") return vacia();
    if (key === "0km" || key === "usados" || key === "planes") {
      const comun = celda("unidades", per);
      const w = pesos(per)[key] ?? 0;
      return {
        ingresos: base.ingresos + comun.ingresos * w,
        costos: base.costos + comun.costos * w,
        gastos: base.gastos + comun.gastos * w,
        resultado: base.resultado + comun.resultado * w,
        gastosVar: (base.gastosVar ?? 0) + (comun.gastosVar ?? 0) * w,
        otrosIng: (base.otrosIng ?? 0) + (comun.otrosIng ?? 0) * w,
      };
    }
    return base;
  };

  const filas = OPERATIVOS_VIEW.map((d) => cascada(d.key, d.label, d.color, celdaAjustada(d.key, periodo)))
    .filter((f) => f.ventas || f.costos || f.gFijos || f.gVar || f.otrosIng || f.benef);

  const T = filas.reduce(
    (a, f) => ({
      ventas: a.ventas + f.ventas, costos: a.costos + f.costos, margen: a.margen + f.margen,
      gVar: a.gVar + f.gVar, contMarg: a.contMarg + f.contMarg, gFijos: a.gFijos + f.gFijos,
      otrosIng: a.otrosIng + f.otrosIng, benef: a.benef + f.benef,
    }),
    { ventas: 0, costos: 0, margen: 0, gVar: 0, contMarg: 0, gFijos: 0, otrosIng: 0, benef: 0 },
  );

  const noOp = NO_OPERATIVOS.map((d) => {
    const c = celda(d.key, periodo);
    const prev = anterior ? celda(d.key, anterior) : null;
    return { ...d, resultado: c.resultado, delta: prev ? c.resultado - prev.resultado : null };
  }).filter((f) => f.resultado);
  const noOpResultado = noOp.reduce((a, f) => a + f.resultado, 0);
  const resultadoFinal = T.benef + noOpResultado;

  // Punto de equilibrio (metodología EEFF): contribución marginal sobre ventas,
  // costos fijos netos de otros ingresos y de los resultados no operativos.
  const cmRatio = T.ventas ? T.contMarg / T.ventas : 0;
  const fijosNetos = -(T.gFijos + T.otrosIng + noOpResultado);
  const puntoEq = cmRatio > 0 ? fijosNetos / cmRatio : 0;
  const margenSeguridad = T.ventas && puntoEq ? ((T.ventas - puntoEq) / T.ventas) * 100 : 0;

  // delta del resultado operativo vs período anterior
  const benefPrev = anterior
    ? OPERATIVOS_VIEW.reduce((a, d) => a + cascada(d.key, "", "", celdaAjustada(d.key, anterior)).benef, 0)
    : null;

  const serie = g.periodos.map((per) => {
    const f = OPERATIVOS_VIEW.reduce((a, d) => {
      const x = cascada(d.key, "", "", celdaAjustada(d.key, per));
      return { ventas: a.ventas + x.ventas, benef: a.benef + x.benef };
    }, { ventas: 0, benef: 0 });
    const no = NO_OPERATIVOS.reduce((a, d) => a + celda(d.key, per).resultado, 0);
    return { periodo: periodoLabel(per), ventas: f.ventas, resultado: f.benef + no };
  });

  // Proyección anual: acumulado del año + promedio mensual × meses restantes
  // hasta diciembre (con 5 meses a mayo, proyecta 7 meses más).
  const acumAnual = serie.reduce((a, s) => a + s.resultado, 0);
  const mesUltimo = Number(ultimo.slice(5, 7)) || nMeses;
  const anioProy = ultimo.slice(0, 4);
  const mesesRestantes = Math.max(0, 12 - mesUltimo);
  const proyeccionAnual = nMeses > 0 ? acumAnual + (acumAnual / nMeses) * mesesRestantes : 0;


  const empresaNombre = seleccion === "grupo"
    ? "Grupo Fiorasi"
    : empresasVisibles.find((e) => e.id === seleccion)?.nombre ?? EMPRESAS.find((e) => e.id === seleccion)?.nombre ?? "";

  // ---- Exportar a Excel (con formato) ----
  function exportar() {
    const slug = empresaNombre.replace(/[^a-zA-Z0-9]+/g, "_");
    descargarCuadroExcel(
      {
        titulo: `Cuadro de gestión · ${empresaNombre}`,
        subtitulo: `Período: ${etiqueta(periodo)} · generado ${new Date().toLocaleDateString("es-AR")}`,
        columnas: filas.map((f) => f.label),
        basesPct: filas.map((f) => f.ventas),
        baseTotal: T.ventas,
        filas: [
          { concepto: "Ventas", valores: filas.map((f) => f.ventas), total: T.ventas },
          { concepto: "Costos", valores: filas.map((f) => f.costos), total: T.costos },
          { concepto: "Margen bruto", valores: filas.map((f) => f.margen), total: T.margen, tipo: "subtotal" },
          { concepto: "Gastos variables", valores: filas.map((f) => f.gVar), total: T.gVar },
          { concepto: "Contribución marginal", valores: filas.map((f) => f.contMarg), total: T.contMarg, tipo: "subtotal" },
          { concepto: "Gastos fijos asignados", valores: filas.map((f) => f.gFijos), total: T.gFijos },
          { concepto: "Otros ing./egr. x depto.", valores: filas.map((f) => f.otrosIng), total: T.otrosIng },
          { concepto: "Beneficio por depto.", valores: filas.map((f) => f.benef), total: T.benef, tipo: "benef" },
        ],
        puente: [
          { label: "Beneficio total departamentos", valor: T.benef, tipo: "head" },
          ...noOp.map((f) => ({ label: f.label, valor: f.resultado })),
          { label: "Resultado final", valor: resultadoFinal, tipo: "final" as const },
        ],
        extras: [
          ["Punto de equilibrio", money(puntoEq)],
          ["Margen de seguridad", pct(margenSeguridad)],
          ["Contribución marginal s/ ventas", T.ventas ? pct((T.contMarg / T.ventas) * 100) : "—"],
        ],
      },
      `cuadro_gestion_${slug}_${periodo}.xls`,
    );
  }

  // ---- Reporte ejecutivo (PDF) ----
  function reporte() {
    const areas: AreaReporte[] = filas.map((f) => ({
      nombre: f.label,
      ventas: f.ventas,
      costos: f.costos,
      margen: f.margen,
      gVar: f.gVar,
      contMarg: f.contMarg,
      gFijos: f.gFijos,
      otrosIng: f.otrosIng,
      benef: f.benef,
      partBenef: T.benef ? (f.benef / T.benef) * 100 : 0,
      deltaResultado: anterior ? f.benef - cascada(f.key, "", "", celdaAjustada(f.key, anterior)).benef : null,
    }));
    abrirReporteEjecutivo({
      empresa: empresaNombre,
      periodoLabel: etiqueta(periodo),
      modoLabel: esEspecial ? "" : "cifras mensuales",
      ventasTot: T.ventas,
      margenTot: T.margen,
      contMargTot: T.contMarg,
      resultadoFinal,
      puntoEq,
      margenSeg: margenSeguridad,
      areas,
      noOp: noOp.map((n) => ({ label: n.label, resultado: n.resultado })),
      unidades0km: ventas.payload ? { unidades: ventas.payload.unidades, precioProm: ventas.payload.precioProm } : undefined,
      mora: mora.hayDatos ? { total: mora.total, pctMora: mora.pctMora, mas90: mora.mas90 } : undefined,
      patrimonial: patr.hayDatos
        ? { activo: patr.activo, pasivo: patr.pasivo, pn: patr.pn, liquidez: patr.liquidez, solvencia: patr.solvencia, endeudamiento: patr.endeudamiento }
        : undefined,
    });
  }

  /** Celda compacta: valor y % s/ventas del depto. Solo el beneficio se pinta en rojo si es negativo. */
  const Cel = ({ v, base, strong, total, rojoSiNeg }: { v: number; base: number; strong?: boolean; total?: boolean; rojoSiNeg?: boolean }) => (
    <TableCell className={cn("whitespace-nowrap px-1.5 py-1 text-right text-xs tabular-nums", total && "bg-muted/40 font-bold", strong && "font-semibold", rojoSiNeg && v < 0 && "text-destructive")}>
      {money(v)}
      <span className="ml-1 text-[9px] font-normal text-muted-foreground">{base ? pct((v / base) * 100, 0) : ""}</span>
    </TableCell>
  );

  const FILAS_DEF: { lbl: string; get: (f: FilaCuadro) => number; tot: number; sub?: boolean; benef?: boolean; lineas: string[] }[] = [
    { lbl: "Ventas", get: (f) => f.ventas, tot: T.ventas, lineas: ["venta"] },
    { lbl: "Costos", get: (f) => f.costos, tot: T.costos, lineas: ["costo"] },
    { lbl: "Margen bruto", get: (f) => f.margen, tot: T.margen, sub: true, lineas: ["venta", "costo"] },
    { lbl: "Gastos variables", get: (f) => f.gVar, tot: T.gVar, lineas: ["gvar"] },
    { lbl: "Contribución marginal", get: (f) => f.contMarg, tot: T.contMarg, sub: true, lineas: ["venta", "costo", "gvar"] },
    { lbl: "Gastos fijos asignados", get: (f) => f.gFijos, tot: T.gFijos, lineas: ["gfijo"] },
    { lbl: "Otros ing./egr. x depto.", get: (f) => f.otrosIng, tot: T.otrosIng, lineas: ["otros"] },
    { lbl: "Beneficio por depto.", get: (f) => f.benef, tot: T.benef, benef: true, lineas: ["venta", "costo", "gvar", "gfijo", "otros"] },
  ];

  // Cuentas contables de las líneas seleccionadas, valuadas según el modo (mes/acum/prom).
  const cuentasDe = (lineas: string[]) => {
    const sumar = (vals: Record<string, number>) => {
      const t = periodosView.reduce((a, per) => a + (vals[per] ?? 0), 0);
      return modo === "prom" && nMeses > 0 ? t / nMeses : t;
    };
    return g.cuentas
      .filter((c) => lineas.includes(c.linea))
      .map((c) => ({ ...c, saldo: sumar(c.valores) }))
      .filter((c) => Math.abs(c.saldo) > 0.5)
      .sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
  };

  return (
    <div>
      <PageHeader
        title="Análisis de gestión"
        description={`Cuadro de situación económica · ${empresaNombre}`}
        action={
          <div className="flex items-center gap-2">
            <Badge>Datos importados</Badge>
            <Button variant="outline" size="sm" onClick={reporte}>
              <FileText className="mr-1.5 h-4 w-4" /> Reporte PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportar}>
              <Download className="mr-1.5 h-4 w-4" /> Excel
            </Button>
            <Select value={modo} onValueChange={setVista}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {nMeses > 1 && <SelectItem value="acum">Acumulado · {nMeses} meses</SelectItem>}
                {nMeses > 1 && <SelectItem value="prom">Promedio mensual</SelectItem>}
                {[...g.periodos].reverse().map((p) => (
                  <SelectItem key={p} value={p}>{periodoLabel(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label={`Facturación ${sufijo}`} value={moneyShort(T.ventas)} icon={TrendingUp}
          hint={ventas.payload ? `${num(ventas.payload.unidades)} u. 0km · $${moneyShort(ventas.payload.precioProm)} prom.` : undefined} />
        <KpiCard label="Margen bruto" value={moneyShort(T.margen)} icon={Scale}
          hint={T.ventas ? pct((T.margen / T.ventas) * 100) + " s/ ventas" : ""} />
        <KpiCard label="Contribución marg." value={moneyShort(T.contMarg)} icon={Scale}
          hint={T.ventas ? pct((T.contMarg / T.ventas) * 100) + " s/ ventas" : ""} />
        <KpiCard label={`Resultado ${sufijo}`} value={moneyShort(resultadoFinal)} icon={Wallet}
          tone={resultadoFinal >= 0 ? "positive" : "negative"}
          delta={benefPrev !== null && benefPrev ? ((T.benef - benefPrev) / Math.abs(benefPrev)) * 100 : undefined}
          hint={T.ventas ? pct((resultadoFinal / T.ventas) * 100) + " s/ ventas" : ""} />
        <KpiCard label="Punto de equilibrio" value={moneyShort(puntoEq)} icon={ShieldCheck}
          tone={margenSeguridad >= 0 ? "positive" : "negative"}
          hint={`margen seg. ${pct(margenSeguridad)}`} />
      </div>

      {/* Cuadro por centro de costo */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cuadro por centro de costo</CardTitle>
          <p className="text-xs text-muted-foreground">valor · % sobre ventas del depto. · clic en un concepto para ver su composición</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="border-b-primary/20 bg-primary/[0.07] hover:bg-primary/[0.07]">
                  <TableHead className="min-w-[120px] px-1.5 py-2 font-semibold text-primary">Concepto</TableHead>
                  {filas.map((f) => {
                    const u = unidadesCol(f.key);
                    return (
                      <TableHead key={f.key} className="px-1.5 py-2 text-right font-semibold text-primary">
                        {f.label}
                        <span className="block text-[9px] font-normal text-muted-foreground">{u || " "}</span>
                      </TableHead>
                    );
                  })}
                  <TableHead className="px-1.5 py-2 text-right font-semibold text-primary">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FILAS_DEF.map((rd) => {
                  const linea = rd.sub || rd.benef; // sumatorias: Margen / Cont. marg. / Beneficio
                  return (
                    <TableRow
                      key={rd.lbl}
                      className={cn(
                        "cursor-pointer",
                        rd.sub && "bg-muted/30",
                        rd.benef && "bg-primary/5",
                        linea && "border-t-2 border-double border-primary/30",
                      )}
                      onClick={() => setDetalle({ linea: rd.lbl, get: rd.get, lineas: rd.lineas })}
                    >
                      <TableCell className={cn("whitespace-nowrap px-1.5 py-1 font-medium underline-offset-2 hover:underline", linea && "font-bold")}>{rd.lbl}</TableCell>
                      {filas.map((f) => (
                        <Cel key={f.key} v={rd.get(f)} base={f.ventas} strong={linea} rojoSiNeg={rd.benef} />
                      ))}
                      <Cel v={rd.tot} base={T.ventas} total strong={linea} rojoSiNeg={rd.benef} />
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="px-2 py-1 text-muted-foreground">Participación s/ contribución</TableCell>
                  {filas.map((f) => (
                    <TableCell key={f.key} className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                      {T.benef ? pct((f.benef / T.benef) * 100, 0) : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="bg-muted/40 px-2 py-1 text-right font-bold tabular-nums">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Del beneficio operativo al resultado */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Del beneficio operativo al resultado</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableBody>
              <TableRow className="bg-primary/[0.07] hover:bg-primary/[0.07]">
                <TableCell className="px-1.5 py-1 font-semibold text-primary">Beneficio total departamentos</TableCell>
                <TableCell className="px-1.5 py-1 text-right font-semibold tabular-nums text-primary">{money(T.benef)}</TableCell>
                <TableCell className="w-24 px-1.5 py-1 text-right text-[10px] text-muted-foreground">{T.ventas ? pct((T.benef / T.ventas) * 100) : ""}</TableCell>
              </TableRow>
              {noOp.map((f) => (
                <TableRow key={f.key}>
                  <TableCell className="px-1.5 py-1 text-muted-foreground">{f.label}</TableCell>
                  <TableCell className="px-1.5 py-1 text-right tabular-nums">{money(f.resultado)}</TableCell>
                  <TableCell className="px-1.5 py-1 text-right text-[10px] text-muted-foreground">{T.ventas ? pct((f.resultado / T.ventas) * 100) : ""}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-double border-primary/30 bg-primary/5">
                <TableCell className="px-1.5 py-1 font-bold">Resultado final {modo === "prom" ? "(prom. mensual)" : modo === "acum" ? "(acumulado)" : "del mes"}</TableCell>
                <TableCell className={cn("px-1.5 py-1 text-right font-bold tabular-nums", resultadoFinal < 0 && "text-destructive")}>{money(resultadoFinal)}</TableCell>
                <TableCell className="px-1.5 py-1 text-right text-[10px] font-bold">{T.ventas ? pct((resultadoFinal / T.ventas) * 100) : ""}</TableCell>
              </TableRow>
              <TableRow className="hover:bg-transparent">
                <TableCell className="px-1.5 py-1.5 font-semibold text-primary">
                  Proyección anual {anioProy}
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                    acum. {nMeses} meses + prom. mensual × {mesesRestantes} restantes
                  </span>
                </TableCell>
                <TableCell className={cn("px-1.5 py-1.5 text-right font-bold tabular-nums text-primary", proyeccionAnual < 0 && "text-destructive")}>
                  {money(proyeccionAnual)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Evolución */}
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Evolución mensual · facturación y resultado</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={serie} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={moneyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip formatter={(v: number, n: string) => [money(v), n === "ventas" ? "Facturación" : "Resultado"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Legend formatter={(v) => (v === "ventas" ? "Facturación" : "Resultado")} />
              <Bar dataKey="ventas" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={46} />
              <Line dataKey="resultado" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <ConciliacionGestion
        empresaId={seleccion === "grupo" ? "" : seleccion}
        esGrupo={seleccion === "grupo"}
        periodo={esEspecial ? (g.periodos[g.periodos.length - 1] ?? "") : periodo}
        modo={modo}
        periodos={g.periodos}
        resultadoCuadro={resultadoFinal}
        resultadoAcum={serie.reduce((a, s) => a + s.resultado, 0)}
        balanceResultado={patr.hayDatos ? patr.resultadoEjercicio : null}
      />

      <UnidadesPlanesEditor
        empresaId={seleccion === "grupo" ? "" : seleccion}
        empresaNombre={empresaNombre}
        periodos={g.periodos}
        esGrupo={seleccion === "grupo"}
      />

      {/* Composición de un concepto: cuentas contables involucradas */}
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Composición · {detalle?.linea} · {etiqueta(periodo)}</DialogTitle>
          </DialogHeader>
          {detalle && (() => {
            const cuentas = cuentasDe(detalle.lineas);
            const totalCtas = cuentas.reduce((a, c) => a + c.saldo, 0);
            if (cuentas.length === 0) {
              return (
                <p className="py-4 text-sm text-muted-foreground">
                  Esta importación no tiene el detalle por cuenta. Reimportá el balance parcial para verlo.
                </p>
              );
            }
            return (
              <div className="max-h-[55vh] overflow-y-auto">
                <Table className="text-xs">
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow className="bg-primary/[0.07] hover:bg-primary/[0.07]">
                      <TableHead className="px-1.5 py-1.5 font-semibold text-primary">Cuenta</TableHead>
                      <TableHead className="px-1.5 py-1.5 font-semibold text-primary">Descripción</TableHead>
                      <TableHead className="px-1.5 py-1.5 font-semibold text-primary">Depto</TableHead>
                      <TableHead className="px-1.5 py-1.5 text-right font-semibold text-primary">Saldo</TableHead>
                      <TableHead className="px-1.5 py-1.5 text-right font-semibold text-primary">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuentas.map((c) => (
                      <TableRow key={c.codigo}>
                        <TableCell className="px-1.5 py-1 font-mono">{c.codigo}</TableCell>
                        <TableCell className="max-w-[280px] truncate px-1.5 py-1" title={c.nombre}>{c.nombre}</TableCell>
                        <TableCell className="whitespace-nowrap px-1.5 py-1 text-muted-foreground">
                          {OPERATIVOS.find((d) => d.key === c.depto)?.label ?? NO_OPERATIVOS.find((d) => d.key === c.depto)?.label ?? c.depto}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-1.5 py-1 text-right tabular-nums">{money(c.saldo)}</TableCell>
                        <TableCell className="px-1.5 py-1 text-right tabular-nums text-muted-foreground">
                          {totalCtas ? pct((c.saldo / totalCtas) * 100, 0) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-double border-primary/30 bg-muted/40">
                      <TableCell className="px-1.5 py-1.5 font-bold" colSpan={3}>Total · {cuentas.length} cuentas</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-right font-bold tabular-nums">{money(totalCtas)}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-right font-bold tabular-nums">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            );
          })()}
          <p className="text-xs text-muted-foreground">
            Cuentas contables que componen «{detalle?.linea}» en {etiqueta(periodo).toLowerCase()}, como figuran en el balance de Oliauto.
            Los gastos comunes de Unidades figuran con su cuenta original (antes del prorrateo).
          </p>
        </DialogContent>
      </Dialog>

      <Anotaciones contexto="rentabilidad" />
    </div>
  );
}
