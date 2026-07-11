"use client";

import { useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { empresaPorId } from "@/lib/store";
import {
  importarCartera, importarAdjudicatarios, importarGanadores, importarCtaCte, importarAdh,
  importarSolicitudes, type ReporteImportacion,
} from "@/lib/store";
import { analizarArchivo, TIPO_LABEL, type ArchivoAnalizado } from "@/lib/import-archivos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";

export default function ImportarPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [analisis, setAnalisis] = useState<ArchivoAnalizado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReporteImportacion | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "importar")) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Tu rol no puede importar archivos.</CardDescription>
      </CardHeader></Card>
    );
  }

  const empresa = empresaActivaId ? empresaPorId(empresaActivaId) : null;

  const onArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null); setReporte(null); setAnalisis(null); setCargando(true);
    try {
      const a = await analizarArchivo(file);
      if (a.tipo === "desconocido") {
        setError("No reconocimos el formato del archivo. Formatos soportados: Novedades (cartera), Adjudicatarios sin pedido, Ganadores de acto, Solicitudes VOPA, cta_cte y adh.");
      } else {
        setAnalisis(a);
        setNombreArchivo(file.name);
      }
    } catch {
      setError("No pudimos leer el archivo. Verificá que sea uno de los exports de FIS/Plan Óvalo.");
    } finally {
      setCargando(false);
    }
  };

  const ejecutar = () => {
    if (!empresaActivaId || !analisis) return;
    let rep: ReporteImportacion | null = null;
    if (analisis.tipo === "novedades" && analisis.cartera) rep = importarCartera(analisis.cartera, empresaActivaId);
    if (analisis.tipo === "adjudicatarios" && analisis.adjudicatarios) rep = importarAdjudicatarios(analisis.adjudicatarios, empresaActivaId);
    if (analisis.tipo === "ganadores" && analisis.ganadores) rep = importarGanadores(analisis.ganadores, empresaActivaId);
    if (analisis.tipo === "solicitudes" && analisis.solicitudes) rep = importarSolicitudes(analisis.solicitudes, empresaActivaId);
    if (analisis.tipo === "cta_cte" && analisis.movimientos) rep = importarCtaCte(analisis.movimientos, empresaActivaId);
    if (analisis.tipo === "adh" && analisis.adh) rep = importarAdh(analisis.adh, empresaActivaId);
    setReporte(rep);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Importar archivos</h1>
        <p className="text-muted-foreground">
          Subí cualquiera de los archivos que hoy se importan al sistema actual: <strong>Novedades</strong> (cartera),{" "}
          <strong>Adjudicatarios sin pedido</strong>, <strong>Ganadores de acto</strong>, <strong>Solicitudes VOPA</strong>,{" "}
          <strong>cta_cte</strong> y <strong>adh</strong>. El tipo se detecta solo. Se asigna a{" "}
          <strong>{empresa?.nombreComercial ?? "la empresa seleccionada"}</strong>.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center hover:bg-accent/40">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="font-medium">{nombreArchivo ?? "Elegí el archivo"}</span>
            <span className="text-sm text-muted-foreground">CSV (separador ;), Excel (.xls/.xlsx) o TXT posicional (cta_cte / adh)</span>
            <input type="file" accept=".csv,.xls,.xlsx,.txt,text/csv,text/plain" className="hidden" onChange={onArchivo} />
          </label>
          {cargando && <p className="mt-2 text-sm text-muted-foreground">Leyendo archivo…</p>}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {analisis && !reporte && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Tipo detectado: <Badge>{TIPO_LABEL[analisis.tipo]}</Badge>
              <span className="text-sm font-normal text-muted-foreground">{analisis.cantidad} registro(s)</span>
            </CardTitle>
            <CardDescription>
              {analisis.tipo === "novedades" && "Actualiza la cartera: match por N° de solicitud (o grupo+orden); si existe actualiza, si no crea."}
              {analisis.tipo === "adjudicatarios" && "Adjudicados que aún no cargaron el pedido: pasa los clientes al estadio Pedido con aging, observaciones y si pueden ingresar pedido."}
              {analisis.tipo === "ganadores" && "Ganadores de sorteo/licitación: pasa los clientes a Adjudicación y genera una alerta a Administración por cada uno."}
              {analisis.tipo === "solicitudes" && "Solicitudes enviadas a fábrica (export de VOPA): trae DNI/CUIT, email, teléfonos y domicilio del titular. Completa los datos que falten en la ficha (sin pisar lo cargado a mano), actualiza el status de fábrica y crea los clientes que no existan."}
              {analisis.tipo === "cta_cte" && "Cuenta corriente de la concesionaria con la administradora: guarda los movimientos (los duplicados se rechazan)."}
              {analisis.tipo === "adh" && "Enriquece el domicilio (calle, localidad, provincia, CP) de los clientes ya existentes en la cartera. No crea clientes nuevos. ⚠️ Layout beta hasta tener el diseño de registro oficial."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <VistaPrevia analisis={analisis} />
            <div className="flex items-center gap-2">
              <Button onClick={ejecutar} disabled={!empresaActivaId}>Importar {analisis.cantidad} registro(s)</Button>
              {!empresaActivaId && <span className="text-sm text-destructive">Seleccioná una empresa arriba.</span>}
            </div>
          </CardContent>
        </Card>
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
                  <AlertTriangle className="h-4 w-4" /> Registros rechazados
                </p>
                <ul className="mt-1 space-y-1 text-sm text-amber-800">
                  {reporte.rechazados.slice(0, 20).map((r, i) => (
                    <li key={i}>Fila {r.fila} ({r.nombre}): {r.motivo}</li>
                  ))}
                  {reporte.rechazados.length > 20 && <li>… y {reporte.rechazados.length - 20} más.</li>}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              <Link href="/clientes"><Button variant="outline">Ver ahorristas</Button></Link>
              {analisis?.tipo === "cta_cte" && <Link href="/cta-cte"><Button variant="outline">Ver cuenta corriente</Button></Link>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VistaPrevia({ analisis }: { analisis: ArchivoAnalizado }) {
  if (analisis.tipo === "novedades" && analisis.cartera) {
    return (
      <Tabla headers={["Nombre", "N° solicitud", "Grupo/Orden", "Plan/Modelo", "Status"]}
        rows={analisis.cartera.slice(0, 8).map((f) => [f.nombreCompleto, f.nroSolicitud ?? "—", `${f.grupo ?? "—"}/${f.orden ?? "—"}`, `${f.plan ?? "—"}/${f.modelo ?? "—"}`, f.statusDesc ?? f.statusCartera ?? "—"])} />
    );
  }
  if (analisis.tipo === "adjudicatarios" && analisis.adjudicatarios) {
    return (
      <Tabla headers={["Nombre", "Grupo/Orden", "Modelo", "Observaciones", "Aging (días)", "¿Puede pedir?"]}
        rows={analisis.adjudicatarios.slice(0, 8).map((f) => [f.nombre, `${f.grupo}/${f.orden}`, f.modelo ?? "—", f.observaciones ?? "—", String(f.aging ?? "—"), f.puedeIngresarPedido ? "SÍ" : "NO"])} />
    );
  }
  if (analisis.tipo === "ganadores" && analisis.ganadores) {
    return (
      <Tabla headers={["Acto", "Nombre", "Grupo/Orden", "Modelo", "Tipo", "Oferta"]}
        rows={analisis.ganadores.slice(0, 8).map((f) => [f.nroActo, f.nombre, `${f.grupo}/${f.orden}`, f.modelo ?? "—", f.tipoAdjudicacion ?? "—", String(f.importeOferta ?? 0)])} />
    );
  }
  if (analisis.tipo === "solicitudes" && analisis.solicitudes) {
    return (
      <Tabla headers={["Nombre", "N° solicitud", "N° manual", "DNI", "Modelo", "Status", "Firma pend."]}
        rows={analisis.solicitudes.slice(0, 8).map((f) => [f.nombre, f.nroSolicitud, f.nroManual ?? "—", f.documento ?? "—", f.modelo ?? "—", f.status ?? "—", f.firmaPendiente ? "SÍ" : "NO"])} />
    );
  }
  if (analisis.tipo === "cta_cte" && analisis.movimientos) {
    return (
      <Tabla headers={["Fecha", "Código", "Descripción", "D/C", "Importe", "Grupo/Orden"]}
        rows={analisis.movimientos.slice(0, 8).map((m) => [m.fecha, m.codigo, m.descripcion, m.dc, m.importe.toLocaleString("es-AR"), m.grupo ? `${m.grupo}/${m.orden}` : "—"])} />
    );
  }
  if (analisis.tipo === "adh" && analisis.adh) {
    return (
      <Tabla headers={["Grupo/Orden", "Nombre", "Domicilio", "Localidad", "Provincia", "CP"]}
        rows={analisis.adh.slice(0, 8).map((f) => [`${f.grupo}/${f.orden}`, f.nombre, f.domicilio ?? "—", f.localidad ?? "—", f.provincia ?? "—", f.codigoPostal ?? "—"])} />
    );
  }
  return null;
}

function Tabla({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className={j === 0 ? "font-medium" : "text-muted-foreground"}>{c}</TableCell>)}</TableRow>
        ))}
      </TableBody>
    </Table>
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
