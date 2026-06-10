import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Car, DollarSign, Percent } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { EMPRESAS, VENTAS } from "@/data/demo";
import { ultimoPeriodo, ventasSerie } from "@/data/selectors";
import { money, moneyShort, num, pct, periodoLabel } from "@/lib/format";
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

export function Comercial() {
  const { empresaIdsActivos } = useAuth();
  const ids = empresaIdsActivos;
  const serie = useMemo(() => ventasSerie(ids).map((s) => ({ ...s, label: periodoLabel(s.periodo) })), [ids]);

  const mes = VENTAS.filter((v) => ids.includes(v.empresaId) && v.periodo === ultimoPeriodo);
  const unidades = mes.reduce((a, v) => a + v.unidades, 0);
  const facturacion = mes.reduce((a, v) => a + v.facturacion, 0);
  const margen = mes.reduce((a, v) => a + v.margen, 0);
  const margenPct = facturacion ? (margen / facturacion) * 100 : 0;

  // Ranking por empresa visible.
  const porEmpresa = ids
    .map((id) => {
      const vs = mes.filter((v) => v.empresaId === id);
      return {
        empresa: EMPRESAS.find((e) => e.id === id)?.nombre ?? id,
        unidades: vs.reduce((a, v) => a + v.unidades, 0),
        facturacion: vs.reduce((a, v) => a + v.facturacion, 0),
        margen: vs.reduce((a, v) => a + v.margen, 0),
      };
    })
    .sort((a, b) => b.facturacion - a.facturacion);

  return (
    <div>
      <PageHeader
        title="Ventas y márgenes"
        description={`Unidades 0km y usados · período ${periodoLabel(ultimoPeriodo)}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Unidades vendidas" value={num(unidades)} icon={Car} />
        <KpiCard label="Facturación" value={moneyShort(facturacion)} icon={DollarSign} />
        <KpiCard label="Margen total" value={moneyShort(margen)} icon={DollarSign} tone="positive" />
        <KpiCard label="Margen %" value={pct(margenPct)} icon={Percent} />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Unidades por mes (0km vs usados)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={serie} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Legend />
              <Bar dataKey="0km" stackId="u" fill="#2563eb" radius={[0, 0, 0, 0]} maxBarSize={46} name="0km" />
              <Bar dataKey="usados" stackId="u" fill="#7c3aed" radius={[6, 6, 0, 0]} maxBarSize={46} name="Usados" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Detalle por empresa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Facturación</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead className="text-right">Margen %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porEmpresa.map((r) => (
                  <TableRow key={r.empresa}>
                    <TableCell className="font-medium">{r.empresa}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(r.unidades)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.facturacion)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.margen)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.facturacion ? pct((r.margen / r.facturacion) * 100) : "—"}
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
