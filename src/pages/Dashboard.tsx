import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Car, Scale, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { DEPARTAMENTOS, HALLAZGOS } from "@/data/demo";
import {
  moraResumen,
  periodoAnterior,
  resumenPorDepto,
  serieMensual,
  totales,
  ultimoPeriodo,
  ventasResumen,
} from "@/data/selectors";
import { useImportaciones } from "@/data/useImportaciones";
import { gestionImportada, moraImportada } from "@/data/importedSelectors";
import type { CeldaPL } from "@/lib/oliauto";
import { money, moneyShort, num, pct, periodoLabel } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function delta(actual: number, previo: number): number {
  if (!previo) return 0;
  return ((actual - previo) / Math.abs(previo)) * 100;
}

// Departamentos para el gráfico (operativos + estructura/no operativos).
const DEPTOS_CHART: { key: string; nombre: string; color: string }[] = [
  { key: "0km", nombre: "0km", color: "#2563eb" },
  { key: "usados", nombre: "Usados", color: "#7c3aed" },
  { key: "unidades", nombre: "Unidades (comunes)", color: "#0ea5e9" },
  { key: "repuestos", nombre: "Repuestos", color: "#ca8a04" },
  { key: "posventa", nombre: "Servicios", color: "#0891b2" },
  { key: "admin", nombre: "Estructura", color: "#64748b" },
  { key: "financiero", nombre: "Financieros", color: "#db2777" },
  { key: "varios", nombre: "Varios", color: "#94a3b8" },
];

const vacia = (): CeldaPL => ({ ingresos: 0, costos: 0, gastos: 0, resultado: 0 });

export function Dashboard() {
  const { empresaIdsActivos, seleccion, empresasVisibles, usuario } = useAuth();
  const ids = empresaIdsActivos;

  // ---- Datos importados ----
  const importaciones = useImportaciones(ids);
  const g = useMemo(() => gestionImportada(importaciones, ids), [importaciones, ids]);
  const moraImp = useMemo(() => moraImportada(importaciones, ids), [importaciones, ids]);
  const usaImport = g.hayDatos;

  // ---- Fallback demo ----
  const tActual = useMemo(() => totales(ids, ultimoPeriodo), [ids]);
  const tPrevio = useMemo(() => totales(ids, periodoAnterior), [ids]);
  const ventas = useMemo(() => ventasResumen(ids, ultimoPeriodo), [ids]);
  const ventasPrev = useMemo(() => ventasResumen(ids, periodoAnterior), [ids]);
  const moraDemo = useMemo(() => moraResumen(ids, ultimoPeriodo), [ids]);
  const serieDemo = useMemo(() => serieMensual(ids), [ids]);
  const porDeptoDemo = useMemo(() => resumenPorDepto(ids, ultimoPeriodo), [ids]);

  const hallazgosAbiertos = HALLAZGOS.filter(
    (h) => ids.includes(h.empresaId) && h.estado !== "resuelto",
  );

  const nombreVista =
    seleccion === "grupo"
      ? "Grupo Fiorasi (consolidado)"
      : empresasVisibles.find((e) => e.id === seleccion)?.nombre ?? "";

  // ---- Derivados según la fuente ----
  const periodo = usaImport ? g.periodos[g.periodos.length - 1] : ultimoPeriodo;
  const periodoAnt = usaImport ? g.periodos[g.periodos.length - 2] ?? null : periodoAnterior;

  const celda = (key: string, per: string | null): CeldaPL =>
    (per && g.porDepto[key]?.[per]) || vacia();

  const totalDe = (per: string | null) =>
    DEPTOS_CHART.reduce(
      (a, d) => {
        const c = celda(d.key, per);
        return {
          ingresos: a.ingresos + c.ingresos,
          costos: a.costos + c.costos,
          resultado: a.resultado + c.resultado,
        };
      },
      { ingresos: 0, costos: 0, resultado: 0 },
    );

  const actImp = totalDe(periodo);
  const prevImp = totalDe(periodoAnt);

  const ingresosAct = usaImport ? actImp.ingresos : tActual.ingresos;
  const ingresosPrev = usaImport ? prevImp.ingresos : tPrevio.ingresos;
  const resultadoAct = usaImport ? actImp.resultado : tActual.resultado;
  const resultadoPrev = usaImport ? prevImp.resultado : tPrevio.resultado;
  const margenAct = usaImport ? actImp.ingresos - actImp.costos : tActual.margenBruto;

  const mora = usaImport && moraImp.hayDatos
    ? { pctMora: moraImp.pctMora, vencido: moraImp.vencido }
    : { pctMora: moraDemo.pctMora, vencido: moraDemo.vencido };

  const chartSerie = usaImport
    ? g.periodos.map((per) => {
        const t = totalDe(per);
        return { label: periodoLabel(per), ingresos: t.ingresos, resultado: t.resultado };
      })
    : serieDemo.map((s) => ({ label: periodoLabel(s.periodo), ingresos: s.ingresos, resultado: s.resultado }));

  const chartDepto = usaImport
    ? DEPTOS_CHART.map((d) => ({ nombre: d.nombre, resultado: celda(d.key, periodo).resultado, color: d.color }))
        .filter((d) => Math.abs(d.resultado) > 1000)
    : porDeptoDemo.map((d) => ({
        nombre: DEPARTAMENTOS.find((x) => x.tipo === d.depto)?.nombre ?? d.depto,
        resultado: d.resultado,
        color: DEPARTAMENTOS.find((x) => x.tipo === d.depto)?.color ?? "#888",
      }));

  return (
    <div>
      <PageHeader
        title={`Hola, ${usuario?.nombre.split(" ")[0]} 👋`}
        description={`${nombreVista} · período ${periodo ? periodoLabel(periodo) : "—"}`}
        action={<Badge variant={usaImport ? "default" : "secondary"}>{usaImport ? "Datos importados" : "Datos demo"}</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Facturación del mes"
          value={moneyShort(ingresosAct)}
          icon={TrendingUp}
          delta={delta(ingresosAct, ingresosPrev)}
          hint="vs mes anterior"
        />
        <KpiCard
          label="Resultado neto"
          value={moneyShort(resultadoAct)}
          icon={Wallet}
          delta={delta(resultadoAct, resultadoPrev)}
          tone={resultadoAct >= 0 ? "positive" : "negative"}
          hint="vs mes anterior"
        />
        {usaImport ? (
          <KpiCard
            label="Margen bruto"
            value={moneyShort(margenAct)}
            icon={Scale}
            hint={ingresosAct ? pct((margenAct / ingresosAct) * 100) + " s/ ventas" : ""}
          />
        ) : (
          <KpiCard
            label="Unidades vendidas"
            value={num(ventas.unidades)}
            icon={Car}
            delta={delta(ventas.unidades, ventasPrev.unidades)}
            hint={`${num(ventas.u0km)} 0km · ${num(ventas.uUsados)} usados`}
          />
        )}
        <KpiCard
          label="Mora (cartera vencida)"
          value={pct(mora.pctMora)}
          icon={AlertTriangle}
          tone={mora.pctMora > 25 ? "warning" : "default"}
          hint={moneyShort(mora.vencido)}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolución de facturación y resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartSerie} margin={{ left: 4, right: 4, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={moneyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip
                  formatter={(v: number, n) => [money(v), n === "ingresos" ? "Facturación" : "Resultado"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
                />
                <Legend formatter={(v) => (v === "ingresos" ? "Facturación" : "Resultado neto")} />
                <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={42} />
                <Line dataKey="resultado" stroke="hsl(var(--secondary))" strokeWidth={3} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado por departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartDepto} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                <XAxis type="number" tickFormatter={moneyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} interval={0} />
                <Tooltip
                  formatter={(v: number) => [money(v), "Resultado"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
                />
                <Bar dataKey="resultado" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {chartDepto.map((d, i) => (
                    <Cell key={i} fill={d.resultado >= 0 ? d.color : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Hallazgos de auditoría abiertos</CardTitle>
            <Badge variant="secondary">{hallazgosAbiertos.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {hallazgosAbiertos.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin hallazgos abiertos para esta vista. 👍</p>
            )}
            {hallazgosAbiertos.map((h) => (
              <div key={h.id} className="flex items-start gap-3 rounded-lg border p-3">
                <span
                  className={
                    "mt-1 h-2.5 w-2.5 shrink-0 rounded-full " +
                    (h.severidad === "alta" ? "bg-destructive" : h.severidad === "media" ? "bg-amber-500" : "bg-muted-foreground")
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{h.titulo}</div>
                  <div className="text-xs text-muted-foreground">{h.descripcion}</div>
                </div>
                <Badge variant={h.estado === "abierto" ? "destructive" : "outline"} className="shrink-0 capitalize">
                  {h.estado.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
