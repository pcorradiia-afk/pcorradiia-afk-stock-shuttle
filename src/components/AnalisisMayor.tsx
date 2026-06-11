import { useMemo } from "react";
import { AlertTriangle, BookOpen, CalendarRange, Layers } from "lucide-react";
import { parseMayor } from "@/lib/oliauto";
import { fecha, money, num, pct } from "@/lib/format";
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

export function AnalisisMayor({ aoa, headerRow }: { aoa: unknown[][]; headerRow: number }) {
  const m = useMemo(() => parseMayor(aoa, headerRow), [aoa, headerRow]);

  if (!m.movimientos) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No detecté movimientos. Verificá que el archivo sea un libro mayor (Código cuenta, Debe, Haber)
          y revisá la fila de encabezados.
        </CardContent>
      </Card>
    );
  }

  const pctSin = m.movimientos ? (m.sinComprobante / m.movimientos) * 100 : 0;

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3 text-sm">
          <span className="font-semibold text-primary">Libro mayor procesado.</span>{" "}
          {num(m.movimientos)} movimientos en {num(m.cuentas)} cuentas
          {m.fechaMin && <> · {fecha(m.fechaMin)} a {fecha(m.fechaMax)}</>}.
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Movimientos" value={num(m.movimientos)} icon={BookOpen} />
        <KpiCard label="Total Debe" value={money(m.totalDebe)} icon={Layers} />
        <KpiCard label="Total Haber" value={money(m.totalHaber)} icon={Layers} />
        <KpiCard
          label="Sin comprobante"
          value={`${num(m.sinComprobante)}`}
          hint={`${pct(pctSin, 0)} de los movimientos`}
          icon={AlertTriangle}
          tone={pctSin > 10 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Por tipo de comprobante */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" /> Actividad por tipo de comprobante
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprobante</TableHead>
                  <TableHead className="text-right">Movim.</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.porComprobante.map((t) => (
                  <TableRow key={t.tipo}>
                    <TableCell className="font-medium">{t.tipo}</TableCell>
                    <TableCell className="text-right tabular-nums">{num(t.movimientos)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(t.debe)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(t.haber)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top cuentas por movimiento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Cuentas con más movimiento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead className="text-right">Movim.</TableHead>
                  <TableHead className="text-right">Debe + Haber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.topCuentas.map((c) => (
                  <TableRow key={c.codigo}>
                    <TableCell>
                      <div className="font-medium">{c.nombre}</div>
                      <div className="text-xs text-muted-foreground">{c.codigo}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{num(c.movimientos)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{money(c.debe + c.haber)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Los movimientos <strong>sin comprobante</strong> suelen ser asientos manuales o de ajuste:
        conviene revisarlos en auditoría. Los datos se procesan en tu navegador.
      </p>
    </div>
  );
}
