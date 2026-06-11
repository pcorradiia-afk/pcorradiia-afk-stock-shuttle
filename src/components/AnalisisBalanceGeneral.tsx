import { useMemo } from "react";
import { Building2, Coins, Scale, Wallet } from "lucide-react";
import { parseBalanceGeneral, type RubroBG } from "@/lib/oliauto";
import { money, moneyShort, num, pct } from "@/lib/format";
import { KpiCard } from "@/components/ui-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function BloqueRubros({ titulo, total, rubros }: { titulo: string; total: number; rubros: RubroBG[] }) {
  const visibles = rubros.filter((r) => Math.abs(r.saldo) > 0.5);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between border-b pb-1">
        <span className="text-sm font-semibold">{titulo}</span>
        <span className="text-sm font-bold tabular-nums">{money(total)}</span>
      </div>
      <Table>
        <TableBody>
          {visibles.map((r) => (
            <TableRow key={r.codigo}>
              <TableCell className="py-1.5 text-sm">{r.nombre}</TableCell>
              <TableCell className="py-1.5 text-right text-sm tabular-nums text-muted-foreground">
                {money(r.saldo)}
              </TableCell>
              <TableCell className="w-12 py-1.5 text-right text-xs tabular-nums text-muted-foreground">
                {total ? pct((r.saldo / total) * 100, 0) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AnalisisBalanceGeneral({ aoa, headerRow }: { aoa: unknown[][]; headerRow: number }) {
  const bg = useMemo(() => parseBalanceGeneral(aoa, headerRow), [aoa, headerRow]);

  if (!bg.activo) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No pude leer el balance. Verificá que el archivo tenga columnas Código, Descripción y Saldo,
          y revisá la fila de encabezados.
        </CardContent>
      </Card>
    );
  }

  const totalFin = bg.pasivo + bg.patrimonioNeto + bg.resultadoEjercicio;
  const pesoAC = bg.activo ? (bg.activoCorriente / bg.activo) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3 text-sm">
          <span className="font-semibold text-primary">Situación patrimonial calculada de tu balance.</span>{" "}
          {num(bg.cuentasProcesadas)} cuentas procesadas.
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Activo total" value={moneyShort(bg.activo)} icon={Building2} />
        <KpiCard label="Pasivo total" value={moneyShort(bg.pasivo)} icon={Coins} />
        <KpiCard label="Patrimonio neto" value={moneyShort(bg.patrimonioNeto)} icon={Wallet} />
        <KpiCard
          label="Resultado del ejercicio"
          value={moneyShort(bg.resultadoEjercicio)}
          icon={Scale}
          tone={bg.resultadoEjercicio >= 0 ? "positive" : "negative"}
        />
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Liquidez corriente"
          value={bg.liquidezCorriente.toFixed(2).replace(".", ",")}
          hint="Activo cte. / Pasivo cte."
          tone={bg.liquidezCorriente >= 1 ? "positive" : "warning"}
        />
        <KpiCard label="Capital de trabajo" value={moneyShort(bg.capitalTrabajo)} hint="AC − PC" tone={bg.capitalTrabajo >= 0 ? "positive" : "negative"} />
        <KpiCard
          label="Endeudamiento"
          value={bg.endeudamiento.toFixed(2).replace(".", ",")}
          hint="Pasivo / Patrimonio neto"
          tone={bg.endeudamiento <= 1 ? "positive" : "warning"}
        />
        <KpiCard label="Solvencia" value={bg.solvencia.toFixed(2).replace(".", ",")} hint="Activo / Pasivo" tone={bg.solvencia >= 1 ? "positive" : "warning"} />
      </div>

      {/* Estado de situación patrimonial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado de situación patrimonial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <BloqueRubros titulo="ACTIVO" total={bg.activo} rubros={bg.rubrosActivo} />
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Activo corriente</span>
                <span>{pct(pesoAC, 0)} del activo</span>
              </div>
              <Progress value={pesoAC} className="h-2" />
            </div>
          </div>
          <div className="space-y-4">
            <BloqueRubros titulo="PASIVO" total={bg.pasivo} rubros={bg.rubrosPasivo} />
            <BloqueRubros titulo="PATRIMONIO NETO" total={bg.patrimonioNeto} rubros={bg.rubrosPN} />
            <div className="flex items-baseline justify-between border-t pt-2 text-sm">
              <span className="font-medium">Resultado del ejercicio</span>
              <span className={cn("font-semibold tabular-nums", bg.resultadoEjercicio < 0 && "text-destructive")}>
                {money(bg.resultadoEjercicio)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t pt-2 text-sm font-bold">
              <span>Total Pasivo + PN + Resultado</span>
              <span className="tabular-nums">{money(totalFin)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Calculado del saldo de las cuentas (1 Activo · 2 Pasivo · 3 Patrimonio neto · 5 Resultados).
        {Math.abs(bg.descuadre) > 1 && (
          <> Diferencia de cuadre: {money(bg.descuadre)} (cuentas de orden / ajustes).</>
        )}{" "}
        Los datos se procesan en tu navegador.
      </p>
    </div>
  );
}
