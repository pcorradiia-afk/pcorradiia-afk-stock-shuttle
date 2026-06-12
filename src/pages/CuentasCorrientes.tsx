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
import { useImportaciones } from "@/data/useImportaciones";
import { moraImportada } from "@/data/importedSelectors";
import { fecha, money, moneyShort, pct, periodoLabel } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
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
  const importaciones = useImportaciones(ids);

  const imp = useMemo(() => moraImportada(importaciones, ids), [importaciones, ids]);
  const demo = useMemo(() => moraResumen(ids, ultimoPeriodo), [ids]);
  const usaImport = imp.hayDatos;

  const tramos = usaImport
    ? imp.buckets
    : { alDia: demo.alDia, d30: demo.d30, d60: demo.d60, d90: demo.d90, mas90: demo.mas90 };
  const total = usaImport ? imp.total : demo.total;
  const vencido = usaImport ? imp.vencido : demo.vencido;
  const mas90 = usaImport ? imp.mas90 : demo.mas90;
  const alDia = usaImport ? imp.alDia : demo.alDia;
  const pctMora = usaImport ? imp.pctMora : demo.pctMora;

  const chart = TRAMOS.map((t) => ({ label: t.label, monto: tramos[t.key], color: t.color }));

  const porEmpresa = usaImport
    ? imp.porEmpresa.map((e) => ({
        empresa: EMPRESAS.find((x) => x.id === e.empresaId)?.nombre ?? e.empresaId,
        total: e.total,
        vencido: e.vencido,
        mas90: e.mas90,
        pctMora: e.pctMora,
      }))
    : ids
        .map((id) => {
          const cc = CUENTAS_CORRIENTES.find((x) => x.empresaId === id && x.periodo === ultimoPeriodo);
          const tot = cc ? cc.alDia + cc.d30 + cc.d60 + cc.d90 + cc.mas90 : 0;
          const venc = cc ? cc.d30 + cc.d60 + cc.d90 + cc.mas90 : 0;
          return {
            empresa: EMPRESAS.find((e) => e.id === id)?.nombre ?? id,
            total: tot,
            vencido: venc,
            mas90: cc?.mas90 ?? 0,
            pctMora: tot ? (venc / tot) * 100 : 0,
          };
        })
        .sort((a, b) => b.pctMora - a.pctMora);

  const descripcion = usaImport
    ? `Antigüedad de saldos deudores · datos importados${imp.corte ? ` al ${fecha(imp.corte)}` : ""}`
    : `Antigüedad de saldos deudores · período ${periodoLabel(ultimoPeriodo)}`;

  return (
    <div>
      <PageHeader
        title="Cuentas corrientes y mora"
        description={descripcion}
        action={
          <Badge variant={usaImport ? "default" : "secondary"}>
            {usaImport ? "Datos importados" : "Datos demo"}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Cartera total" value={moneyShort(total)} icon={Wallet} />
        <KpiCard
          label={usaImport ? "Vencida (+30 días de facturada)" : "Cartera vencida"}
          value={moneyShort(vencido)}
          icon={AlertTriangle}
          tone="warning"
          hint={pct(pctMora)}
        />
        <KpiCard label="Vencido +90 días" value={moneyShort(mas90)} icon={AlertTriangle} tone="negative" />
        <KpiCard label={usaImport ? "Corriente (≤30 días)" : "Al día"} value={moneyShort(alDia)} tone="positive" />
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
                {porEmpresa.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      Sin datos para esta vista.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
