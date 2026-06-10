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
import { AlertTriangle, Car, TrendingUp, Wallet } from "lucide-react";
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
import { money, moneyShort, num, pct, periodoLabel } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function delta(actual: number, previo: number): number {
  if (!previo) return 0;
  return ((actual - previo) / Math.abs(previo)) * 100;
}

export function Dashboard() {
  const { empresaIdsActivos, seleccion, empresasVisibles, usuario } = useAuth();
  const ids = empresaIdsActivos;

  const tActual = useMemo(() => totales(ids, ultimoPeriodo), [ids]);
  const tPrevio = useMemo(() => totales(ids, periodoAnterior), [ids]);
  const ventas = useMemo(() => ventasResumen(ids, ultimoPeriodo), [ids]);
  const ventasPrev = useMemo(() => ventasResumen(ids, periodoAnterior), [ids]);
  const mora = useMemo(() => moraResumen(ids, ultimoPeriodo), [ids]);
  const serie = useMemo(() => serieMensual(ids), [ids]);
  const porDepto = useMemo(() => resumenPorDepto(ids, ultimoPeriodo), [ids]);

  const hallazgosAbiertos = HALLAZGOS.filter(
    (h) => ids.includes(h.empresaId) && h.estado !== "resuelto",
  );

  const nombreVista =
    seleccion === "grupo"
      ? "Grupo Fiorasi (consolidado)"
      : empresasVisibles.find((e) => e.id === seleccion)?.nombre ?? "";

  const chartSerie = serie.map((s) => ({ ...s, label: periodoLabel(s.periodo) }));
  const chartDepto = porDepto.map((d) => ({
    nombre: DEPARTAMENTOS.find((x) => x.tipo === d.depto)?.nombre ?? d.depto,
    resultado: d.resultado,
    color: DEPARTAMENTOS.find((x) => x.tipo === d.depto)?.color ?? "#888",
  }));

  return (
    <div>
      <PageHeader
        title={`Hola, ${usuario?.nombre.split(" ")[0]} 👋`}
        description={`${nombreVista} · período ${periodoLabel(ultimoPeriodo)}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Facturación del mes"
          value={moneyShort(tActual.ingresos)}
          icon={TrendingUp}
          delta={delta(tActual.ingresos, tPrevio.ingresos)}
          hint="vs mes anterior"
        />
        <KpiCard
          label="Resultado neto"
          value={moneyShort(tActual.resultado)}
          icon={Wallet}
          delta={delta(tActual.resultado, tPrevio.resultado)}
          tone={tActual.resultado >= 0 ? "positive" : "negative"}
          hint="vs mes anterior"
        />
        <KpiCard
          label="Unidades vendidas"
          value={num(ventas.unidades)}
          icon={Car}
          delta={delta(ventas.unidades, ventasPrev.unidades)}
          hint={`${num(ventas.u0km)} 0km · ${num(ventas.uUsados)} usados`}
        />
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
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                <Tooltip
                  formatter={(v: number) => [money(v), "Resultado"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
                />
                <Bar dataKey="resultado" radius={[0, 6, 6, 0]} maxBarSize={28}>
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
