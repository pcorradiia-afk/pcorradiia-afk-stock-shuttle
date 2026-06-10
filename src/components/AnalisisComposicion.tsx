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
import { AlertTriangle, Users, Wallet } from "lucide-react";
import { parseComposicionSaldos } from "@/lib/oliauto";
import { fecha, money, moneyShort, pct } from "@/lib/format";
import { KpiCard } from "@/components/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function AnalisisComposicion({ aoa, headerRow }: { aoa: unknown[][]; headerRow: number }) {
  const cc = useMemo(() => parseComposicionSaldos(aoa, headerRow), [aoa, headerRow]);

  const reciente = cc.buckets.alDia + cc.buckets.d30; // 0-30 días
  const pctMas90 = cc.totalDeudor ? (cc.buckets.mas90 / cc.totalDeudor) * 100 : 0;
  const chart = [
    { label: "0-30 días", monto: reciente, color: "#84cc16" },
    { label: "31-60 días", monto: cc.buckets.d60, color: "#eab308" },
    { label: "61-90 días", monto: cc.buckets.d90, color: "#f97316" },
    { label: "+90 días", monto: cc.buckets.mas90, color: "#dc2626" },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3 text-sm">
          <span className="font-semibold text-primary">Cuentas corrientes calculadas de tu archivo.</span>{" "}
          {cc.clientesDeudores} clientes deudores · corte al {cc.corte ? fecha(cc.corte) : "—"} · pagos imputados FIFO.
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Cartera deudora" value={moneyShort(cc.totalDeudor)} icon={Wallet} hint={`${cc.clientesDeudores} clientes`} />
        <KpiCard label="0-30 días (reciente)" value={moneyShort(reciente)} tone="positive" hint={pct(cc.totalDeudor ? (reciente / cc.totalDeudor) * 100 : 0)} />
        <KpiCard label="+90 días" value={moneyShort(cc.buckets.mas90)} icon={AlertTriangle} tone="negative" hint={pct(pctMas90)} />
        <KpiCard label="Saldos a favor" value={moneyShort(cc.totalAcreedor)} icon={Users} tone="positive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Antigüedad de la cartera deudora</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 deudores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Ficha</TableHead>
                  <TableHead className="text-right">Saldo deudor</TableHead>
                  <TableHead className="text-right">% cartera</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cc.topDeudores.map((d) => (
                  <TableRow key={d.codigo}>
                    <TableCell className="font-medium">{d.nombre}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.codigo}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(d.saldo)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {cc.totalDeudor ? pct((d.saldo / cc.totalDeudor) * 100) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Antigüedad por fecha del comprobante, con pagos imputados a las facturas más viejas (FIFO).
        Los datos se procesan en tu navegador; no se guardan en ningún lado todavía.
      </p>
    </div>
  );
}
