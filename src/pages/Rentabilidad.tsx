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
import { Scale, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { DEPARTAMENTOS, PERIODOS } from "@/data/demo";
import { resumenPorDepto, ultimoPeriodo } from "@/data/selectors";
import { useImportaciones } from "@/data/useImportaciones";
import { gestionImportada } from "@/data/importedSelectors";
import type { CeldaPL } from "@/lib/oliauto";
import { money, moneyShort, pct, periodoLabel } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

// Líneas de negocio (operativas) y no operativas, según el plan de Oliauto.
const OPERATIVOS: { key: string; label: string; color: string }[] = [
  { key: "0km", label: "Unidades 0km", color: "#2563eb" },
  { key: "usados", label: "Unidades usados", color: "#7c3aed" },
  { key: "unidades", label: "Unidades (gastos comunes)", color: "#0ea5e9" },
  { key: "repuestos", label: "Repuestos", color: "#ca8a04" },
  { key: "posventa", label: "Servicios / Taller", color: "#0891b2" },
];
const NO_OPERATIVOS: { key: string; label: string }[] = [
  { key: "admin", label: "Gastos de estructura (administración)" },
  { key: "financiero", label: "Resultados financieros" },
  { key: "varios", label: "Resultados varios" },
];

const vacia = (): CeldaPL => ({ ingresos: 0, costos: 0, gastos: 0, resultado: 0 });

function DeltaCell({ value }: { value: number | null }) {
  if (value === null) return <TableCell className="text-right text-muted-foreground">—</TableCell>;
  return (
    <TableCell className={cn("text-right tabular-nums text-sm", value >= 0 ? "text-emerald-600" : "text-destructive")}>
      {value >= 0 ? "+" : ""}
      {moneyShort(value)}
    </TableCell>
  );
}

export function Rentabilidad() {
  const { empresaIdsActivos } = useAuth();
  const importaciones = useImportaciones(empresaIdsActivos);
  const g = useMemo(() => gestionImportada(importaciones, empresaIdsActivos), [importaciones, empresaIdsActivos]);

  const ultimo = g.periodos[g.periodos.length - 1] ?? "";
  const [periodoSel, setPeriodoSel] = useState<string>("");
  const periodo = periodoSel && g.periodos.includes(periodoSel) ? periodoSel : ultimo;
  const anterior = g.periodos[g.periodos.indexOf(periodo) - 1] ?? null;

  // ---- Vista demo si todavía no hay importaciones ----
  const [periodoDemo, setPeriodoDemo] = useState(ultimoPeriodo);
  const filasDemo = useMemo(
    () => resumenPorDepto(empresaIdsActivos, periodoDemo),
    [empresaIdsActivos, periodoDemo],
  );

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
  const celda = (key: string, per: string | null): CeldaPL =>
    (per && g.porDepto[key]?.[per]) || vacia();

  const filas = OPERATIVOS.map((d) => {
    const c = celda(d.key, periodo);
    const prev = anterior ? celda(d.key, anterior) : null;
    return {
      ...d,
      ...c,
      margen: c.ingresos - c.costos,
      delta: prev ? c.resultado - prev.resultado : null,
      conMov: c.ingresos || c.costos || c.gastos || c.resultado,
    };
  }).filter((f) => f.conMov);

  const op = filas.reduce(
    (a, f) => ({
      ingresos: a.ingresos + f.ingresos,
      costos: a.costos + f.costos,
      gastos: a.gastos + f.gastos,
      margen: a.margen + f.margen,
      resultado: a.resultado + f.resultado,
    }),
    { ingresos: 0, costos: 0, gastos: 0, margen: 0, resultado: 0 },
  );

  const noOp = NO_OPERATIVOS.map((d) => {
    const c = celda(d.key, periodo);
    const prev = anterior ? celda(d.key, anterior) : null;
    return { ...d, ...c, delta: prev ? c.resultado - prev.resultado : null };
  }).filter((f) => f.ingresos || f.gastos || f.resultado);

  const resultadoFinal = op.resultado + noOp.reduce((a, f) => a + f.resultado, 0);
  const estructura = celda("admin", periodo).gastos;

  // Punto de equilibrio aproximado: gastos fijos / % de margen bruto.
  const gastosFijos = op.gastos + estructura;
  const margenPct = op.ingresos ? op.margen / op.ingresos : 0;
  const puntoEq = margenPct > 0 ? gastosFijos / margenPct : 0;
  const margenSeguridad = op.ingresos && puntoEq ? ((op.ingresos - puntoEq) / op.ingresos) * 100 : 0;

  const serie = g.periodos.map((per) => {
    const tot = [...OPERATIVOS, ...NO_OPERATIVOS].reduce(
      (a, d) => {
        const c = celda(d.key, per);
        return { ingresos: a.ingresos + c.ingresos, resultado: a.resultado + c.resultado };
      },
      { ingresos: 0, resultado: 0 },
    );
    return { periodo: periodoLabel(per), ...tot };
  });

  return (
    <div>
      <PageHeader
        title="Análisis de gestión"
        description="Cuadro de situación económica: contribución por departamento, estructura y punto de equilibrio."
        action={
          <div className="flex items-center gap-2">
            <Badge>Datos importados</Badge>
            <Select value={periodo} onValueChange={setPeriodoSel}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...g.periodos].reverse().map((p) => (
                  <SelectItem key={p} value={p}>{periodoLabel(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Facturación del mes" value={moneyShort(op.ingresos)} icon={TrendingUp} />
        <KpiCard
          label="Margen bruto"
          value={moneyShort(op.margen)}
          icon={Scale}
          hint={op.ingresos ? pct(margenPct * 100) + " s/ ventas" : ""}
        />
        <KpiCard
          label="Resultado final"
          value={moneyShort(resultadoFinal)}
          icon={Wallet}
          tone={resultadoFinal >= 0 ? "positive" : "negative"}
          hint={op.ingresos ? pct((resultadoFinal / op.ingresos) * 100) + " s/ ventas" : ""}
        />
        <KpiCard
          label="Punto de equilibrio"
          value={moneyShort(puntoEq)}
          icon={ShieldCheck}
          tone={margenSeguridad >= 0 ? "positive" : "negative"}
          hint={`margen de seguridad ${pct(margenSeguridad)}`}
        />
      </div>

      {/* Cascada departamental */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Contribución por departamento · {periodoLabel(periodo)}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Costos</TableHead>
                  <TableHead className="text-right">Margen bruto</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">% s/ ventas</TableHead>
                  <TableHead className="text-right">vs. {anterior ? periodoLabel(anterior) : "mes ant."}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.key}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: f.color }} />
                        {f.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.ingresos)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.costos)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.margen)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.gastos)}</TableCell>
                    <TableCell className={cn("text-right font-semibold tabular-nums", f.resultado < 0 && "text-destructive")}>
                      {money(f.resultado)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.ingresos > 1_000_000 ? pct((f.resultado / f.ingresos) * 100) : "—"}
                    </TableCell>
                    <DeltaCell value={f.delta} />
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total operativo</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(op.ingresos)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(op.costos)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(op.margen)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(op.gastos)}</TableCell>
                  <TableCell className={cn("text-right font-bold tabular-nums", op.resultado < 0 && "text-destructive")}>
                    {money(op.resultado)}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {op.ingresos ? pct((op.resultado / op.ingresos) * 100) : "—"}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Estructura y no operativos → resultado final */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Del resultado operativo al resultado final</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Resultado operativo (contribución departamental)</TableCell>
                <TableCell className={cn("text-right font-semibold tabular-nums", op.resultado < 0 && "text-destructive")}>
                  {money(op.resultado)}
                </TableCell>
                <TableCell className="w-32" />
              </TableRow>
              {noOp.map((f) => (
                <TableRow key={f.key}>
                  <TableCell className="text-muted-foreground">{f.label}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", f.resultado < 0 && "text-destructive")}>
                    {money(f.resultado)}
                  </TableCell>
                  <DeltaCell value={f.delta} />
                </TableRow>
              ))}
              <TableRow className="border-t-2">
                <TableCell className="font-bold">Resultado final del mes</TableCell>
                <TableCell className={cn("text-right font-bold tabular-nums", resultadoFinal < 0 && "text-destructive")}>
                  {money(resultadoFinal)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Evolución mensual */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Evolución mensual · facturación y resultado</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={serie} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={moneyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip formatter={(v: number, name: string) => [money(v), name === "ingresos" ? "Facturación" : "Resultado"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Legend formatter={(v) => (v === "ingresos" ? "Facturación" : "Resultado")} />
              <Bar dataKey="ingresos" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={48} />
              <Line dataKey="resultado" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        El <strong>punto de equilibrio</strong> es aproximado: toma los gastos (departamentales + estructura)
        como fijos y el margen bruto como contribución. Para replicar exactamente la apertura
        variable/fijo de tu EEFF se carga la tabla de clasificación de cuentas (próximo paso).
      </p>
    </div>
  );
}
