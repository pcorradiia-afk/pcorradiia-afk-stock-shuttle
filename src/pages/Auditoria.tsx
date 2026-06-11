import { useMemo } from "react";
import { useAuth } from "@/auth/AuthContext";
import { PERMISOS } from "@/auth/permissions";
import { EMPRESAS, HALLAZGOS } from "@/data/demo";
import { CONTROLES_AUDITORIA, type ControlAuditoria } from "@/data/auditoria";
import { fecha } from "@/lib/format";
import { Can } from "@/components/PermissionGate";
import { KpiCard, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ClipboardCheck, ListChecks, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const sevBadge: Record<string, string> = {
  alta: "bg-destructive text-destructive-foreground",
  media: "bg-amber-500 text-white",
  baja: "bg-muted text-muted-foreground",
};

/** Categoriza la frecuencia (texto libre) en una etiqueta corta con color. */
function categoriaFrecuencia(f: string): { label: string; cls: string } {
  const l = f.toLowerCase();
  if (l.includes("diaria") || l.includes("semanal"))
    return { label: "Semanal", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
  if (l.includes("trimestral") || l.includes("anual"))
    return { label: "Periódico", cls: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
  return { label: "Mensual", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
}

function ProgramaControl() {
  const controles = CONTROLES_AUDITORIA;
  const cuenta = (cat: string) =>
    controles.filter((c) => categoriaFrecuencia(c.frecuencia).label === cat).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Controles definidos" value={String(controles.length)} icon={ListChecks} />
        <KpiCard label="Mensuales" value={String(cuenta("Mensual"))} icon={ClipboardCheck} />
        <KpiCard label="Semanales / diarios" value={String(cuenta("Semanal"))} icon={ClipboardCheck} tone="warning" />
        <KpiCard label="Trim. / anuales" value={String(cuenta("Periódico"))} icon={ClipboardCheck} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programa de auditoría mensual · Administración</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Nº</TableHead>
                  <TableHead className="min-w-[220px]">Control</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead className="min-w-[220px]">Evidencia esperada</TableHead>
                  <TableHead className="min-w-[220px]">Alerta sugerida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {controles.map((c: ControlAuditoria) => {
                  const cat = categoriaFrecuencia(c.frecuencia);
                  return (
                    <TableRow key={c.nro}>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{c.nro}</TableCell>
                      <TableCell className="text-sm font-medium">{c.tarea}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("whitespace-nowrap", cat.cls)}>{cat.label}</Badge>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">{c.frecuencia}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.evidencia}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="flex items-start gap-1.5">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          {c.alerta}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Catálogo de controles enviado por la gerencia de Administración. Es la base para automatizar
        las alertas a medida que se importen los reportes del DMS.
      </p>
    </div>
  );
}

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
        title="Auditoría y control interno"
        description="Programa de controles de Administración, trazabilidad de desvíos y su seguimiento."
        action={
          <Can permiso={PERMISOS.AUDITORIA_GESTIONAR}>
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              Nuevo hallazgo
            </Button>
          </Can>
        }
      />

      <Tabs defaultValue="programa">
        <TabsList>
          <TabsTrigger value="programa">Programa de control</TabsTrigger>
          <TabsTrigger value="hallazgos">Hallazgos</TabsTrigger>
        </TabsList>

        <TabsContent value="programa" className="mt-4">
          <ProgramaControl />
        </TabsContent>

        <TabsContent value="hallazgos" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
