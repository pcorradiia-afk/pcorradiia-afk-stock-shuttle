"use client";

import { useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { empresaPorId } from "@/lib/demo-data";
import { importarCartera, type FilaCartera, type ReporteImportacion } from "@/lib/store";
import { leerArchivo, mapearFilas, detectarMapeo, MAPEO_NOVEDADES } from "@/lib/import-cartera";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ImportarPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [filas, setFilas] = useState<FilaCartera[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReporteImportacion | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "importar")) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Tu rol no puede importar la cartera.</CardDescription>
      </CardHeader></Card>
    );
  }

  const empresa = empresaActivaId ? empresaPorId(empresaActivaId) : null;
  const mapeo = headers.length ? detectarMapeo(headers) : {};
  const camposMapeados = Object.keys(MAPEO_NOVEDADES) as (keyof FilaCartera)[];

  const onArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setReporte(null);
    setCargando(true);
    try {
      const { headers: hs, registros } = await leerArchivo(file);
      setHeaders(hs);
      setFilas(mapearFilas(registros, hs));
      setNombreArchivo(file.name);
    } catch (err) {
      setError("No pudimos leer el archivo. Verificá que sea el CSV/Excel de la cartera.");
      setHeaders([]); setFilas([]); setNombreArchivo(null);
    } finally {
      setCargando(false);
    }
  };

  const ejecutar = () => {
    if (!empresaActivaId) { setError("Seleccioná una empresa arriba antes de importar."); return; }
    const rep = importarCartera(filas, empresaActivaId);
    setReporte(rep);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Importar cartera (Novedades)</h1>
        <p className="text-muted-foreground">
          Subí el archivo que bajás de FIS/Plan Óvalo (CSV o Excel). Se asigna a{" "}
          <strong>{empresa?.nombreComercial ?? "la empresa seleccionada"}</strong>. Match por N° de
          solicitud (o grupo+orden): si ya existe, se actualiza; si es nuevo, se crea.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center hover:bg-accent/40">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="font-medium">{nombreArchivo ?? "Elegí el archivo de cartera"}</span>
            <span className="text-sm text-muted-foreground">CSV (separador ;) o Excel (.xls / .xlsx)</span>
            <input type="file" accept=".csv,.xls,.xlsx,text/csv" className="hidden" onChange={onArchivo} />
          </label>
          {cargando && <p className="mt-2 text-sm text-muted-foreground">Leyendo archivo…</p>}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {headers.length > 0 && !reporte && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapeo de columnas detectado</CardTitle>
              <CardDescription>Verificá que cada campo del sistema apunte a la columna correcta del archivo.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {camposMapeados.map((campo) => (
                <Badge key={campo} variant={mapeo[campo] ? "secondary" : "warning"}>
                  {campo}: {mapeo[campo] ?? "no encontrada"}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vista previa</CardTitle>
              <CardDescription>Primeras 10 filas de {filas.length} en total.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>N° solicitud</TableHead>
                    <TableHead>Grupo/Orden</TableHead>
                    <TableHead>Plan/Modelo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filas.slice(0, 10).map((f, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{f.nombreCompleto || "—"}</TableCell>
                      <TableCell>{f.nroSolicitud ?? "—"}</TableCell>
                      <TableCell>{f.grupo ?? "—"}/{f.orden ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{f.plan ?? "—"}/{f.modelo ?? "—"}</TableCell>
                      <TableCell>{f.statusDesc ?? f.statusCartera ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center gap-2">
                <Button onClick={ejecutar} disabled={!empresaActivaId}>Importar {filas.length} filas</Button>
                {!empresaActivaId && <span className="text-sm text-destructive">Seleccioná una empresa arriba.</span>}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {reporte && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Importación finalizada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Resumen n={reporte.total} t="Total" />
              <Resumen n={reporte.creados} t="Creados" color="text-emerald-700" />
              <Resumen n={reporte.actualizados} t="Actualizados" color="text-blue-700" />
              <Resumen n={reporte.rechazados.length} t="Rechazados" color="text-amber-700" />
            </div>
            {reporte.rechazados.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
                  <AlertTriangle className="h-4 w-4" /> Filas rechazadas
                </p>
                <ul className="mt-1 space-y-1 text-sm text-amber-800">
                  {reporte.rechazados.slice(0, 20).map((r) => (
                    <li key={r.fila}>Fila {r.fila} ({r.nombre}): {r.motivo}</li>
                  ))}
                  {reporte.rechazados.length > 20 && <li>… y {reporte.rechazados.length - 20} más.</li>}
                </ul>
              </div>
            )}
            <Link href="/clientes"><Button variant="outline">Ver ahorristas</Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Resumen({ n, t, color }: { n: number; t: string; color?: string }) {
  return (
    <div className="rounded-md border px-4 py-2">
      <p className={`text-2xl font-bold ${color ?? ""}`}>{n}</p>
      <p className="text-xs text-muted-foreground">{t}</p>
    </div>
  );
}
