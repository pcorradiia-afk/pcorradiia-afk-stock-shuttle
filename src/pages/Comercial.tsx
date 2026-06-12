import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Car, CheckCircle2, DollarSign, Percent, Tag } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { EMPRESAS, VENTAS } from "@/data/demo";
import { ultimoPeriodo, ventasSerie } from "@/data/selectors";
import { useImportaciones } from "@/data/useImportaciones";
import { ventasImportada } from "@/data/importedSelectors";
import { fecha, money, moneyShort, num, pct, periodoLabel } from "@/lib/format";
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

export function Comercial() {
  const { empresaIdsActivos } = useAuth();
  const ids = empresaIdsActivos;
  const importaciones = useImportaciones(ids);
  const v = useMemo(() => ventasImportada(importaciones, ids), [importaciones, ids]);

  if (v.hayDatos && v.payload) {
    const p = v.payload;
    return (
      <div>
        <PageHeader
          title="Ventas y márgenes · 0km"
          description={`Resultado de unidades 0km${p.fechaMin ? ` · ${fecha(p.fechaMin)} a ${fecha(p.fechaMax)}` : ""}`}
          action={<Badge>Datos importados</Badge>}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Unidades vendidas" value={num(p.unidades)} icon={Car} />
          <KpiCard label="Facturación" value={moneyShort(p.ventas)} icon={DollarSign} />
          <KpiCard label="Precio promedio" value={moneyShort(p.precioProm)} icon={Tag} />
          <KpiCard label="Resultado / margen" value={moneyShort(p.resultado)} icon={Percent} tone="positive" hint={pct(p.margenPct)} />
        </div>

        {/* Conciliación con el balance */}
        {v.conciliacion && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Conciliación con el balance (cuentas 0km)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Reporte de ventas</TableHead>
                    <TableHead className="text-right">Balance (mayor)</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { c: "Ventas 0km", rep: p.ventas, bal: v.conciliacion.ventasBalance, dif: v.conciliacion.difVentas },
                    { c: "Costo 0km", rep: p.costo, bal: v.conciliacion.costoBalance, dif: v.conciliacion.difCosto },
                  ].map((f) => {
                    const difPct = f.bal ? (f.dif / f.bal) * 100 : 0;
                    const ok = Math.abs(difPct) < 2;
                    return (
                      <TableRow key={f.c}>
                        <TableCell className="font-medium">{f.c}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(f.rep)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.bal)}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", Math.abs(f.dif) > 1 && "text-amber-600")}>{money(f.dif)}</TableCell>
                        <TableCell className="text-right">
                          <span className={cn("inline-flex items-center gap-1 tabular-nums", ok ? "text-emerald-600" : "text-amber-600")}>
                            {ok && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {pct(difPct)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
              Diferencias &lt; 2% se consideran conciliadas. Suelen deberse a ventanas de fechas
              distintas entre el reporte y el balance, o a notas de crédito.
            </div>
          </Card>
        )}

        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Facturación por sucursal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={p.porSucursal} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                <XAxis type="number" tickFormatter={moneyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} interval={0} />
                <Tooltip formatter={(x: number) => [money(x), "Ventas"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
                <Bar dataKey="ventas" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {p.porSucursal.map((_, i) => <Cell key={i} fill="#2563eb" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Ranking de vendedores</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Facturación</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                    <TableHead className="text-right">% margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.porVendedor.map((s) => (
                    <TableRow key={s.nombre}>
                      <TableCell className="font-medium">{s.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(s.unidades)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(s.ventas)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(s.resultado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.ventas ? pct((s.resultado / s.ventas) * 100) : "—"}</TableCell>
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

  // ---- Vista demo ----
  const serie = ventasSerie(ids).map((s) => ({ ...s, label: periodoLabel(s.periodo) }));
  const mes = VENTAS.filter((x) => ids.includes(x.empresaId) && x.periodo === ultimoPeriodo);
  const unidades = mes.reduce((a, x) => a + x.unidades, 0);
  const facturacion = mes.reduce((a, x) => a + x.facturacion, 0);
  const margen = mes.reduce((a, x) => a + x.margen, 0);
  const margenPct = facturacion ? (margen / facturacion) * 100 : 0;
  const porEmpresa = ids
    .map((id) => {
      const vs = mes.filter((x) => x.empresaId === id);
      return {
        empresa: EMPRESAS.find((e) => e.id === id)?.nombre ?? id,
        unidades: vs.reduce((a, x) => a + x.unidades, 0),
        facturacion: vs.reduce((a, x) => a + x.facturacion, 0),
        margen: vs.reduce((a, x) => a + x.margen, 0),
      };
    })
    .sort((a, b) => b.facturacion - a.facturacion);

  return (
    <div>
      <PageHeader
        title="Ventas y márgenes"
        description={`Unidades 0km y usados · período ${periodoLabel(ultimoPeriodo)}`}
        action={<Badge variant="secondary">Datos demo</Badge>}
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
              <Bar dataKey="0km" stackId="u" fill="#2563eb" maxBarSize={46} name="0km" />
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
