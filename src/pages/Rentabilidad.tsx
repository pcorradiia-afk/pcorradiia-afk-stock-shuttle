import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { DEPARTAMENTOS, PERIODOS } from "@/data/demo";
import { resumenPorDepto, ultimoPeriodo } from "@/data/selectors";
import { money, pct, periodoLabel } from "@/lib/format";
import { PageHeader } from "@/components/ui-kit";
import { Card, CardContent } from "@/components/ui/card";
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

export function Rentabilidad() {
  const { empresaIdsActivos } = useAuth();
  const [periodo, setPeriodo] = useState(ultimoPeriodo);
  const filas = useMemo(() => resumenPorDepto(empresaIdsActivos, periodo), [empresaIdsActivos, periodo]);

  const tot = filas.reduce(
    (a, f) => ({
      ingresos: a.ingresos + f.ingresos,
      costos: a.costos + f.costos,
      margenBruto: a.margenBruto + f.margenBruto,
      gastos: a.gastos + f.gastos,
      resultado: a.resultado + f.resultado,
    }),
    { ingresos: 0, costos: 0, margenBruto: 0, gastos: 0, resultado: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Rentabilidad por departamento"
        description="Estado de resultados departamental (0km, usados, posventa, repuestos y administración)."
        action={
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...PERIODOS].reverse().map((p) => (
                <SelectItem key={p} value={p}>{periodoLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Costos</TableHead>
                  <TableHead className="text-right">Margen bruto</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead className="text-right">% s/ ingr.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => {
                  const depto = DEPARTAMENTOS.find((d) => d.tipo === f.depto);
                  const margenPct = f.ingresos ? (f.resultado / f.ingresos) * 100 : 0;
                  return (
                    <TableRow key={f.depto}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: depto?.color }} />
                          {depto?.nombre}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{money(f.ingresos)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.costos)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(f.margenBruto)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{money(f.gastos)}</TableCell>
                      <TableCell className={cn("text-right font-semibold tabular-nums", f.resultado < 0 && "text-destructive")}>
                        {money(f.resultado)}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", f.resultado < 0 && "text-destructive")}>
                        {f.ingresos ? pct(margenPct) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total {empresaIdsActivos.length > 1 ? "consolidado" : ""}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tot.ingresos)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tot.costos)}</TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{money(tot.margenBruto)}</TableCell>
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
    </div>
  );
}
