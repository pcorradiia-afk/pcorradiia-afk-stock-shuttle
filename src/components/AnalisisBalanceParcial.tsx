import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, Wallet } from "lucide-react";
import { DEPTOS_OLIAUTO, parseBalanceParcial } from "@/lib/oliauto";
import { money, moneyShort, pct, periodoLabel } from "@/lib/format";
import { KpiCard } from "@/components/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

// Departamentos no operativos: el margen "% s/ ingresos" no es representativo.
const NO_OPERATIVO = new Set(["admin", "financiero", "varios"]);

const COLORS: Record<string, string> = {
  "0km": "#2563eb",
  usados: "#7c3aed",
  planes_susc: "#16a34a",
  planes_ent: "#059669",
  unidades: "#0ea5e9",
  repuestos: "#ca8a04",
  posventa: "#0891b2",
  admin: "#64748b",
  financiero: "#db2777",
  varios: "#94a3b8",
};

export function AnalisisBalanceParcial({ aoa, headerRow }: { aoa: unknown[][]; headerRow: number }) {
  const bp = useMemo(() => parseBalanceParcial(aoa, headerRow), [aoa, headerRow]);
  const [periodo, setPeriodo] = useState(bp.periodos[bp.periodos.length - 1] ?? "");

  if (bp.periodos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No detecté columnas mensuales en este archivo. Verificá la fila de encabezados.
        </CardContent>
      </Card>
    );
  }

  const filas = DEPTOS_OLIAUTO.map((d) => ({
    ...d,
    pl: bp.porDepto[d.key]?.[periodo] ?? { ingresos: 0, costos: 0, gastos: 0, resultado: 0 },
  })).filter((f) => f.pl.ingresos || f.pl.costos || f.pl.gastos || f.pl.resultado);

  const tot = bp.totales[periodo] ?? { ingresos: 0, costos: 0, gastos: 0, resultado: 0 };
  const chart = filas.map((f) => ({ label: f.label, resultado: f.pl.resultado, color: COLORS[f.key] }));

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="text-sm">
            <span className="font-semibold text-primary">Rentabilidad calculada de tu archivo.</span>{" "}
            {bp.cuentasProcesadas} cuentas de resultado · {bp.periodos.length} períodos.
          </div>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[...bp.periodos].reverse().map((p) => (
                <SelectItem key={p} value={p}>{periodoLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard label="Facturación del mes" value={moneyShort(tot.ingresos)} icon={TrendingUp} />
        <KpiCard
          label="Resultado del mes"
          value={moneyShort(tot.resultado)}
          icon={Wallet}
          tone={tot.resultado >= 0 ? "positive" : "negative"}
          hint={tot.ingresos ? pct((tot.resultado / tot.ingresos) * 100) + " s/ facturación" : ""}
        />
        <KpiCard label="Departamentos" value={String(filas.length)} hint="con movimiento" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultado por departamento · {periodoLabel(periodo)}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
              <XAxis type="number" tickFormatter={moneyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={150} interval={0} />
              <Tooltip formatter={(v: number) => [money(v), "Resultado"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Bar dataKey="resultado" radius={[0, 6, 6, 0]} maxBarSize={26}>
                {chart.map((c, i) => (
                  <Cell key={i} fill={c.resultado >= 0 ? c.color : "hsl(var(--destructive))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado de resultados departamental</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Costos</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">% s/ ingr.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.key}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[f.key] }} />
                        {f.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.pl.ingresos)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.pl.costos)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.pl.gastos)}</TableCell>
                    <TableCell className={cn("text-right font-semibold tabular-nums", f.pl.resultado < 0 && "text-destructive")}>
                      {money(f.pl.resultado)}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", f.pl.resultado < 0 && "text-destructive")}>
                      {NO_OPERATIVO.has(f.key) || f.pl.ingresos < 1_000_000
                        ? "—"
                        : pct((f.pl.resultado / f.pl.ingresos) * 100)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tot.ingresos)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tot.costos)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tot.gastos)}</TableCell>
                  <TableCell className={cn("text-right font-bold tabular-nums", tot.resultado < 0 && "text-destructive")}>
                    {money(tot.resultado)}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {tot.ingresos ? pct((tot.resultado / tot.ingresos) * 100) : "—"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        El <strong>resultado por departamento</strong> sale exacto del saldo de las cuentas (clase 5,
        clasificadas por código). La apertura Ingresos/Costos/Gastos es orientativa y se afina en la Fase 2.
        Los datos se procesan en tu navegador; no se guardan en ningún lado todavía.
      </p>
    </div>
  );
}
