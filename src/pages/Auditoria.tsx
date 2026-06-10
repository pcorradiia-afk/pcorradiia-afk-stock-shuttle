import { useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import { PERMISOS } from "@/auth/permissions";
import { EMPRESAS, HALLAZGOS } from "@/data/demo";
import { fecha } from "@/lib/format";
import { Can } from "@/components/PermissionGate";
import { KpiCard, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, Plus, ShieldCheck } from "lucide-react";

const sevBadge: Record<string, string> = {
  alta: "bg-destructive text-destructive-foreground",
  media: "bg-amber-500 text-white",
  baja: "bg-muted text-muted-foreground",
};

export function Auditoria() {
  const { empresaIdsActivos } = useAuth();
  const ids = empresaIdsActivos;
  const hallazgos = useMemo(() => HALLAZGOS.filter((h) => ids.includes(h.empresaId)), [ids]);

  const abiertos = hallazgos.filter((h) => h.estado === "abierto").length;
  const enProceso = hallazgos.filter((h) => h.estado === "en_proceso").length;
  const altos = hallazgos.filter((h) => h.severidad === "alta" && h.estado !== "resuelto").length;

  return (
    <div>
      <PageHeader
        title="Auditoría y hallazgos"
        description="Trazabilidad de desvíos, observaciones de control interno y su seguimiento."
        action={
          <Can permiso={PERMISOS.AUDITORIA_GESTIONAR}>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo hallazgo
            </Button>
          </Can>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Abiertos" value={String(abiertos)} icon={AlertTriangle} tone="warning" />
        <KpiCard label="En proceso" value={String(enProceso)} icon={ShieldCheck} />
        <KpiCard label="Severidad alta" value={String(altos)} icon={AlertTriangle} tone="negative" />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Hallazgos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hallazgo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Detectado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hallazgos.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="max-w-[280px]">
                      <div className="font-medium">{h.titulo}</div>
                      <div className="truncate text-xs text-muted-foreground">{h.descripcion}</div>
                    </TableCell>
                    <TableCell className="text-sm">{EMPRESAS.find((e) => e.id === h.empresaId)?.nombre}</TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${sevBadge[h.severidad]}`}>{h.severidad}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={h.estado === "resuelto" ? "outline" : "secondary"} className="capitalize">
                        {h.estado.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{h.responsable}</TableCell>
                    <TableCell className="text-sm tabular-nums">{fecha(h.detectadoEl)}</TableCell>
                  </TableRow>
                ))}
                {hallazgos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Sin hallazgos para esta vista.
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
