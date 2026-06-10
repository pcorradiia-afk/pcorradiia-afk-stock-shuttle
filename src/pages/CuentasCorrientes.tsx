import { useMemo } from "react";
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
import { AlertTriangle, Wallet } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { CUENTAS_CORRIENTES, EMPRESAS } from "@/data/demo";
import { moraResumen, ultimoPeriodo } from "@/data/selectors";
import { money, moneyShort, pct, periodoLabel } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const TRAMOS = [
  { key: "alDia", label: "Al día", color: "#16a34a" },
  { key: "d30", label: "1-30 días", color: "#84cc16" },
  { key: "d60", label: "31-60 días", color: "#eab308" },
  { key: "d90", label: "61-90 días", color: "#f97316" },
  { key: "mas90", label: "+90 días", color: "#dc2626" },
] as const;

export function CuentasCorrientes() {
  const { empresaIdsActivos } = useAuth();
  const ids = empresaIdsActivos;
  const r = useMemo(() => moraResumen(ids, ultimoPeriodo), [ids]);

  const chart = TRAMOS.map((t) => ({ label: t.label, monto: r[t.key], color: t.color }));

  const porEmpresa = ids.map((id) => {
    const cc = CUENTAS_CORRIENTES.find((x) => x.empresaId === id && x.periodo === ultimoPeriodo);
    const total = cc ? cc.alDia + cc.d30 + cc.d60 + cc.d90 + cc.mas90 : 0;
    const vencido = cc ? cc.d30 + cc.d60 + cc.d90 + cc.mas90 : 0;
    return {
      empresa: EMPRESAS.find((e) => e.id === id)?.nombre ?? id,
      total,
      vencido,
      mas90: cc?.mas90 ?? 0,
      pctMora: total ? (vencido / total) * 100 : 0,
    };
  }).sort((a, b) => b.pctMora - a.pctMora);

  return (
    <div>
      <PageHeader
        title="Cuentas corrientes y mora"
        description={`Antigüedad de saldos deudores · período ${periodoLabel(ultimoPeriodo)}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Cartera total" value={moneyShort(r.total)} icon={Wallet} />
        <KpiCard label="Cartera vencida" value={moneyShort(r.vencido)} icon={AlertTriangle} tone="warning" hint={pct(r.pctMora)} />
        <KpiCard label="Vencido +90 días" value={moneyShort(r.mas90)} icon={AlertTriangle} tone="negative" />
        <KpiCard label="Al día" value={moneyShort(r.alDia)} tone="positive" />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Distribución por antigüedad</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={moneyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
              <Tooltip formatter={(v: number) => [money(v), "Monto"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Bar dataKey="monto" radius={[6, 6, 0, 0]} maxBarSize={70}>
                {chart.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Mora por empresa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Cartera total</TableHead>
                  <TableHead className="text-right">Vencido</TableHead>
                  <TableHead className="text-right">+90 días</TableHead>
                  <TableHead className="text-right">% mora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porEmpresa.map((r) => (
                  <TableRow key={r.empresa}>
                    <TableCell className="font-medium">{r.empresa}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.vencido)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{money(r.mas90)}</TableCell>
                    <TableCell className={cn("text-right font-semibold tabular-nums", r.pctMora > 25 && "text-destructive")}>
                      {pct(r.pctMora)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
