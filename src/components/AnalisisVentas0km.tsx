import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Car, Scale, Tag, TrendingUp } from "lucide-react";
import { parseVentas0km } from "@/lib/oliauto";
import { fecha, money, moneyShort, num, pct } from "@/lib/format";
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

export function AnalisisVentas0km({ aoa, headerRow }: { aoa: unknown[][]; headerRow: number }) {
  const v = useMemo(() => parseVentas0km(aoa, headerRow), [aoa, headerRow]);

  if (!v.unidades) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No detecté ventas. Verificá que el archivo tenga columnas Venta, Costo, Vendedor y Sucursal.
        </CardContent>
      </Card>
    );
  }

  const chartSuc = v.porSucursal.map((s) => ({ nombre: s.nombre, ventas: s.ventas }));

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3 text-sm">
          <span className="font-semibold text-primary">Resultado de unidades 0km.</span>{" "}
          {num(v.unidades)} unidades
          {v.fechaMin && <> · {fecha(v.fechaMin)} a {fecha(v.fechaMax)}</>}.
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Unidades vendidas" value={num(v.unidades)} icon={Car} />
        <KpiCard label="Facturación" value={moneyShort(v.ventas)} icon={TrendingUp} />
        <KpiCard label="Precio promedio" value={moneyShort(v.precioProm)} icon={Tag} />
        <KpiCard
          label="Resultado bruto"
          value={moneyShort(v.resultado)}
          icon={Scale}
          tone={v.resultado >= 0 ? "positive" : "negative"}
          hint={pct(v.margenPct) + " s/ venta"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facturación por sucursal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartSuc} layout="vertical" margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
              <XAxis type="number" tickFormatter={moneyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} interval={0} />
              <Tooltip formatter={(x: number) => [money(x), "Ventas"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Bar dataKey="ventas" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {chartSuc.map((_, i) => <Cell key={i} fill="#2563eb" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Por sucursal</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Un.</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.porSucursal.map((s) => (
                  <TableRow key={s.nombre}>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(s.unidades)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{moneyShort(s.ventas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{moneyShort(s.resultado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Ranking de vendedores</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Un.</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {v.porVendedor.slice(0, 10).map((s) => (
                  <TableRow key={s.nombre}>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(s.unidades)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{moneyShort(s.ventas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{moneyShort(s.resultado)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
