import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, FileWarning, ShieldCheck } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { EMPRESAS } from "@/data/demo";
import { useImportaciones } from "@/data/useImportaciones";
import { conciliacionPorEmpresa, type ConciliacionEmpresa } from "@/data/importedSelectors";
import { fecha, money, periodoLabel } from "@/lib/format";
import { PageHeader } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function EstadoBadge({ estado }: { estado: ConciliacionEmpresa["estado"] }) {
  if (estado === "ok")
    return (
      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600" variant="outline">
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Concilia
      </Badge>
    );
  if (estado === "alerta")
    return (
      <Badge variant="outline" className="border-destructive text-destructive">
        <AlertTriangle className="mr-1 h-3.5 w-3.5" /> No concilia
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <FileWarning className="mr-1 h-3.5 w-3.5" /> Faltan reportes
    </Badge>
  );
}

function TarjetaEmpresa({ c }: { c: ConciliacionEmpresa }) {
  const nombre = EMPRESAS.find((e) => e.id === c.empresaId)?.nombre ?? c.empresaId;
  const faltan = [
    !c.tieneMayor && "mayor",
    !c.tieneParcial && "balance parcial",
    !c.tieneGeneral && "balance general",
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{nombre}</CardTitle>
          <div className="mt-1 text-xs text-muted-foreground">
            {c.fechaMayor && <>Mayor al {fecha(c.fechaMayor)} · </>}
            {c.periodoParcial && <>Balance parcial a {periodoLabel(c.periodoParcial)}</>}
          </div>
        </div>
        <EstadoBadge estado={c.estado} />
      </CardHeader>
      <CardContent className="space-y-3">
        {c.estado === "incompleto" ? (
          <p className="text-sm text-muted-foreground">
            Para controlar la consistencia hace falta importar al menos el <strong>mayor</strong> y el{" "}
            <strong>balance parcial</strong> de esta empresa. Faltan: {faltan.join(", ")}.
          </p>
        ) : (
          <>
            {/* Mayor vs Balance parcial, mes a mes */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Mayor</TableHead>
                    <TableHead className="text-right">Balance parcial</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.porMes.map((m) => (
                    <TableRow key={m.mes}>
                      <TableCell className="font-medium">{periodoLabel(m.mes)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(m.mayor)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(m.parcial)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", !m.ok && "font-semibold text-destructive")}>
                        {money(m.diferencia)}
                      </TableCell>
                      <TableCell className="text-center">
                        {m.ok ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="mx-auto h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">Acumulado</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">{money(c.totalMayor)}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">{money(c.totalParcial)}</TableCell>
                    <TableCell className={cn("text-right font-bold tabular-nums", Math.abs(c.difParcialMayor) > 1 && "text-destructive")}>
                      {money(c.difParcialMayor)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            {/* Balance general */}
            {c.tieneGeneral && (
              <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground">
                  Resultado del <strong>balance general</strong> (clase 5) vs balance parcial acumulado
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{money(c.resultadoGeneral)}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      Math.abs(c.difGeneralParcial) <= 1
                        ? "border-emerald-500/20 text-emerald-600"
                        : "border-destructive text-destructive",
                    )}
                  >
                    dif {money(c.difGeneralParcial)}
                  </Badge>
                </span>
              </div>
            )}

            {c.estado === "alerta" && (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Los reportes <strong>no concilian</strong>: probablemente se exportaron en fechas
                  distintas y se registraron asientos retroactivos en el medio. Volvé a sacar el mayor,
                  el balance parcial y el balance general <strong>en el mismo momento</strong> y reimportalos.
                </span>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ControlConsistencia() {
  const { empresaIdsActivos } = useAuth();
  const importaciones = useImportaciones(empresaIdsActivos);
  const conciliaciones = useMemo(
    () => conciliacionPorEmpresa(importaciones, empresaIdsActivos),
    [importaciones, empresaIdsActivos],
  );

  const conAlerta = conciliaciones.filter((c) => c.estado === "alerta").length;
  const conOk = conciliaciones.filter((c) => c.estado === "ok").length;

  return (
    <div>
      <PageHeader
        title="Control de consistencia"
        description="Verifica que el mayor, el balance parcial y el balance general de cada empresa fueron sacados de forma coherente y concilian entre sí."
        action={
          conciliaciones.length > 0 ? (
            conAlerta > 0 ? (
              <Badge variant="outline" className="border-destructive text-destructive">
                <AlertTriangle className="mr-1 h-3.5 w-3.5" /> {conAlerta} con diferencias
              </Badge>
            ) : (
              <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600" variant="outline">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> {conOk} concilian
              </Badge>
            )
          ) : undefined
        }
      />

      {conciliaciones.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Todavía no hay reportes importados para controlar. Importá el mayor y el balance parcial de
            una empresa para ver la conciliación.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conciliaciones.map((c) => (
            <TarjetaEmpresa key={c.empresaId} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
