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
  const nMeses = g.periodos.length;
  // vista: "" (último mes) · un período 'YYYY-MM' · "acum" · "prom"
  const [vista, setVista] = useState<string>("");
  const modo = vista === "acum" || vista === "prom" || g.periodos.includes(vista) ? vista : ultimo;
  const esEspecial = modo === "acum" || modo === "prom";
  const periodo = modo;
  const anterior = esEspecial ? null : (g.periodos[g.periodos.indexOf(modo) - 1] ?? null);

  const etiqueta = (p: string) =>
    p === "acum" ? `Acumulado · ${nMeses} meses` : p === "prom" ? "Promedio mensual" : periodoLabel(p);
  const sufijo = modo === "acum" ? "acumulada" : modo === "prom" ? "prom. mensual" : "del mes";

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
  // Soporta un período puntual, "acum" (suma de meses) y "prom" (promedio mensual).
  const celda = (key: string, per: string | null): CeldaPL => {
    if (per === "acum" || per === "prom") {
      const porPer = g.porDepto[key] ?? {};
      const acc = vacia();
      let split = false;
      for (const c of Object.values(porPer)) {
        acc.ingresos += c.ingresos;
        acc.costos += c.costos;
        acc.gastos += c.gastos;
        acc.resultado += c.resultado;
        if (c.gastosVar !== undefined) {
          acc.gastosVar = (acc.gastosVar ?? 0) + c.gastosVar;
          split = true;
        }
      }
      if (!split) acc.gastosVar = undefined;
      if (per === "prom" && nMeses > 0) {
        acc.ingresos /= nMeses;
        acc.costos /= nMeses;
        acc.gastos /= nMeses;
        acc.resultado /= nMeses;
        if (acc.gastosVar !== undefined) acc.gastosVar /= nMeses;
      }
      return acc;
    }
    return (per && g.porDepto[key]?.[per]) || vacia();
  };

  // ¿La importación trae la apertura variable/fijo? (solo en importaciones nuevas)
  const tieneSplit = OPERATIVOS.some((d) => celda(d.key, periodo).gastosVar !== undefined);

  const filas = OPERATIVOS.map((d) => {
    const c = celda(d.key, periodo);
    const prev = anterior ? celda(d.key, anterior) : null;
    const gVar = c.gastosVar ?? 0;
    const margen = c.ingresos - c.costos;
    return {
      ...d,
      ...c,
      margen,
      gVar,
      gFijos: c.gastos - gVar,
      contMarg: margen - gVar,
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
      gVar: a.gVar + f.gVar,
      gFijos: a.gFijos + f.gFijos,
      contMarg: a.contMarg + f.contMarg,
      resultado: a.resultado + f.resultado,
    }),
    { ingresos: 0, costos: 0, gastos: 0, margen: 0, gVar: 0, gFijos: 0, contMarg: 0, resultado: 0 },
  );

  const noOp = NO_OPERATIVOS.map((d) => {
    const c = celda(d.key, periodo);
    const prev = anterior ? celda(d.key, anterior) : null;
    return { ...d, ...c, delta: prev ? c.resultado - prev.resultado : null };
  }).filter((f) => f.ingresos || f.gastos || f.resultado);

  const resultadoFinal = op.resultado + noOp.reduce((a, f) => a + f.resultado, 0);

  // Punto de equilibrio según la metodología del EEFF: la clasificación
  // variable/fijo se aplica sobre TODOS los gastos (incluye estructura y los
  // variables que viven en financieros/varios, ej. imp. a débitos y créditos).
  const todos = [...OPERATIVOS, ...NO_OPERATIVOS].map((d) => celda(d.key, periodo));
  const gastosTotales = todos.reduce((a, c) => a + c.gastos, 0);
  const gVarTotal = todos.reduce((a, c) => a + (c.gastosVar ?? 0), 0);
  const contribucion = tieneSplit ? op.margen - gVarTotal : op.margen;
  const gastosFijos = gastosTotales - (tieneSplit ? gVarTotal : 0);
  const contribPct = op.ingresos ? contribucion / op.ingresos : 0;
  const puntoEq = contribPct > 0 ? gastosFijos / contribPct : 0;
  const margenSeguridad = op.ingresos && puntoEq ? ((op.ingresos - puntoEq) / op.ingresos) * 100 : 0;
  const margenPct = contribPct;

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
            <Select value={modo} onValueChange={setVista}>
              <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {nMeses > 1 && <SelectItem value="acum">Acumulado · {nMeses} meses</SelectItem>}
                {nMeses > 1 && <SelectItem value="prom">Promedio mensual</SelectItem>}
                {[...g.periodos].reverse().map((p) => (
                  <SelectItem key={p} value={p}>{periodoLabel(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label={`Facturación ${sufijo}`} value={moneyShort(op.ingresos)} icon={TrendingUp} />
        <KpiCard
          label={tieneSplit ? "Contribución marginal" : "Margen bruto"}
          value={moneyShort(contribucion)}
          icon={Scale}
          hint={op.ingresos ? pct(margenPct * 100) + " s/ ventas" : ""}
        />
        <KpiCard
          label={`Resultado ${sufijo}`}
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
          <CardTitle className="text-base">Contribución por departamento · {etiqueta(periodo)}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Ventas</TableHead>
                  <TableHead className="text-right">Costos</TableHead>
                  {tieneSplit && <TableHead className="text-right">G. variables</TableHead>}
                  <TableHead className="text-right">{tieneSplit ? "Cont. marginal" : "Margen bruto"}</TableHead>
                  <TableHead className="text-right">{tieneSplit ? "G. fijos" : "Gastos"}</TableHead>
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
                    {tieneSplit && (
                      <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.gVar)}</TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">{money(tieneSplit ? f.contMarg : f.margen)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {money(tieneSplit ? f.gFijos : f.gastos)}
                    </TableCell>
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
                  {tieneSplit && <TableCell className="text-right font-bold tabular-nums">{money(op.gVar)}</TableCell>}
                  <TableCell className="text-right font-bold tabular-nums">{money(tieneSplit ? op.contMarg : op.margen)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tieneSplit ? op.gFijos : op.gastos)}</TableCell>
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
                <TableCell className="font-bold">Resultado final {modo === "prom" ? "(prom. mensual)" : modo === "acum" ? "(acumulado)" : "del mes"}</TableCell>
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
        {tieneSplit ? (
          <>
            El <strong>punto de equilibrio</strong> usa la clasificación variable/fijo del EEFF del
            grupo (extraída del libro mensual): PE = gastos fijos (asignados + estructura) ÷ % de
            contribución marginal.
          </>
        ) : (
          <>
            El <strong>punto de equilibrio</strong> es aproximado (esta importación no tiene la
            apertura variable/fijo). Reimportá el balance parcial para calcularlo con la
            clasificación exacta del EEFF.
          </>
        )}
      </p>
    </div>
  );
}
