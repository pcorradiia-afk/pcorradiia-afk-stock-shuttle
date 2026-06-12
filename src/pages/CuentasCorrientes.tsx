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
import { AlertTriangle, RotateCcw, Wallet } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { CUENTAS_CORRIENTES, EMPRESAS } from "@/data/demo";
import { moraResumen, ultimoPeriodo } from "@/data/selectors";
import { useImportaciones } from "@/data/useImportaciones";
import {
  bucketsDeHistograma,
  guardarTramos,
  histogramaDe,
  resetTramos,
  sumarHistogramas,
  TRAMOS_DEFECTO,
  useTramos,
} from "@/data/aging";
import type { Composicion } from "@/lib/oliauto";
import { fecha, money, moneyShort, pct, periodoLabel } from "@/lib/format";
import { KpiCard, PageHeader } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const DEMO_TRAMOS = [
  { label: "Al día", color: "#16a34a", key: "alDia" },
  { label: "1-30 días", color: "#84cc16", key: "d30" },
  { label: "31-60 días", color: "#eab308", key: "d60" },
  { label: "61-90 días", color: "#f97316", key: "d90" },
  { label: "+90 días", color: "#dc2626", key: "mas90" },
] as const;

/** Tabla editable de los tramos de antigüedad (límites en días). */
function TramosEditor({ tramos }: { tramos: number[] }) {
  function setLimite(i: number, valor: number) {
    const copia = [...tramos];
    copia[i] = valor;
    guardarTramos(copia);
  }
  function quitar(i: number) {
    guardarTramos(tramos.filter((_, j) => j !== i));
  }
  function agregar() {
    const ult = tramos[tramos.length - 1] ?? 30;
    guardarTramos([...tramos, ult + 30]);
  }

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Tramos de antigüedad (días)</CardTitle>
        <Button variant="ghost" size="sm" onClick={resetTramos}>
          <RotateCcw className="mr-1 h-4 w-4" /> Restablecer
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Definí los cortes en días. El primero es el límite de lo <strong>corriente</strong> (por
          defecto 30). El último tramo agrupa todo lo que supere ese valor.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          {tramos.map((t, i) => (
            <div key={i} className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {i === 0 ? "Corriente hasta" : `Corte ${i + 1}`}
              </label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={t}
                  min={1}
                  max={365}
                  className="h-9 w-24 tabular-nums"
                  onChange={(e) => setLimite(i, Number(e.target.value))}
                />
                {tramos.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => quitar(i)}>
                    ×
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={agregar}>+ Tramo</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CuentasCorrientes() {
  const { empresaIdsActivos } = useAuth();
  const ids = empresaIdsActivos;
  const importaciones = useImportaciones(ids);
  const tramos = useTramos();

  // Última composición por empresa, con su histograma de antigüedad.
  const fuentes = useMemo(() => {
    const vistos = new Set<string>();
    const out: { empresaId: string; comp: Composicion }[] = [];
    for (const imp of importaciones) {
      if (imp.tipo !== "composicion" || !ids.includes(imp.empresa_id) || vistos.has(imp.empresa_id)) continue;
      vistos.add(imp.empresa_id);
      out.push({ empresaId: imp.empresa_id, comp: imp.payload as Composicion });
    }
    return out;
  }, [importaciones, ids]);

  const usaImport = fuentes.length > 0;

  // ---- Aging configurable desde lo importado ----
  const histoTotal = useMemo(() => sumarHistogramas(fuentes.map((f) => histogramaDe(f.comp))), [fuentes]);
  const buckets = useMemo(() => bucketsDeHistograma(histoTotal, tramos), [histoTotal, tramos]);

  const corteMax = fuentes.reduce<string | null>((a, f) => (f.comp.corte && (!a || f.comp.corte > a) ? f.comp.corte : a), null);
  const total = buckets.reduce((a, b) => a + b.monto, 0);
  const corriente = buckets[0]?.monto ?? 0;
  const vencido = total - corriente;
  const ultimoTramo = buckets[buckets.length - 1]?.monto ?? 0;
  const pctMora = total ? (vencido / total) * 100 : 0;

  // ---- Demo ----
  const demo = useMemo(() => moraResumen(ids, ultimoPeriodo), [ids]);

  const chart = usaImport
    ? buckets.map((b) => ({ label: b.label, monto: b.monto, color: b.color }))
    : DEMO_TRAMOS.map((t) => ({ label: t.label, monto: demo[t.key], color: t.color }));

  const porEmpresa = usaImport
    ? fuentes
        .map((f) => {
          const bs = bucketsDeHistograma(histogramaDe(f.comp), tramos);
          const tot = bs.reduce((a, b) => a + b.monto, 0);
          const venc = tot - (bs[0]?.monto ?? 0);
          return {
            empresa: EMPRESAS.find((e) => e.id === f.empresaId)?.nombre ?? f.empresaId,
            total: tot,
            vencido: venc,
            ultimo: bs[bs.length - 1]?.monto ?? 0,
            pctMora: tot ? (venc / tot) * 100 : 0,
          };
        })
        .sort((a, b) => b.pctMora - a.pctMora)
    : ids
        .map((id) => {
          const cc = CUENTAS_CORRIENTES.find((x) => x.empresaId === id && x.periodo === ultimoPeriodo);
          const tot = cc ? cc.alDia + cc.d30 + cc.d60 + cc.d90 + cc.mas90 : 0;
          const venc = cc ? cc.d30 + cc.d60 + cc.d90 + cc.mas90 : 0;
          return {
            empresa: EMPRESAS.find((e) => e.id === id)?.nombre ?? id,
            total: tot,
            vencido: venc,
            ultimo: cc?.mas90 ?? 0,
            pctMora: tot ? (venc / tot) * 100 : 0,
          };
        })
        .sort((a, b) => b.pctMora - a.pctMora);

  const totalKpi = usaImport ? total : demo.total;
  const vencidoKpi = usaImport ? vencido : demo.vencido;
  const corrienteKpi = usaImport ? corriente : demo.alDia;
  const ultimoKpi = usaImport ? ultimoTramo : demo.mas90;
  const pctMoraKpi = usaImport ? pctMora : demo.pctMora;
  const ultimoLabel = buckets[buckets.length - 1]?.label ?? "+90 días";

  return (
    <div>
      <PageHeader
        title="Cuentas corrientes y mora"
        description={
          usaImport
            ? `Antigüedad de saldos deudores · datos importados${corteMax ? ` al ${fecha(corteMax)}` : ""}`
            : `Antigüedad de saldos deudores · período ${periodoLabel(ultimoPeriodo)}`
        }
        action={<Badge variant={usaImport ? "default" : "secondary"}>{usaImport ? "Datos importados" : "Datos demo"}</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Cartera total" value={moneyShort(totalKpi)} icon={Wallet} />
        <KpiCard label="Cartera vencida" value={moneyShort(vencidoKpi)} icon={AlertTriangle} tone="warning" hint={pct(pctMoraKpi)} />
        <KpiCard label={usaImport ? ultimoLabel : "Vencido +90 días"} value={moneyShort(ultimoKpi)} icon={AlertTriangle} tone="negative" />
        <KpiCard label={usaImport ? buckets[0]?.label ?? "Corriente" : "Al día"} value={moneyShort(corrienteKpi)} tone="positive" />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Distribución por antigüedad</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis tickFormatter={moneyShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
              <Tooltip formatter={(v: number) => [money(v), "Monto"]} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Bar dataKey="monto" radius={[6, 6, 0, 0]} maxBarSize={70}>
                {chart.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {usaImport && <TramosEditor tramos={tramos} />}

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
                  <TableHead className="text-right">{ultimoLabel}</TableHead>
                  <TableHead className="text-right">% mora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porEmpresa.map((r) => (
                  <TableRow key={r.empresa}>
                    <TableCell className="font-medium">{r.empresa}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.total)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.vencido)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{money(r.ultimo)}</TableCell>
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
