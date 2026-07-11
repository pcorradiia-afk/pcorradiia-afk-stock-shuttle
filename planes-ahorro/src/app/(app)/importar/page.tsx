"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import {
  suscribir, empresaPorId,
  importarCartera, importarAdjudicatarios, importarGanadores, importarCtaCte, importarAdh,
  importarSolicitudes, importarListaPrecios,
  registrarImportacion, ultimaImportacion, historialListasPrecios,
  codigoConcesionario, empresaPorCodigoConce, deshacerImportacion,
  clientesImportadosSinGestion, eliminarClientesImportados,
  type ReporteImportacion,
} from "@/lib/store";
import { analizarArchivo, TIPO_LABEL, type ArchivoAnalizado, type TipoArchivo } from "@/lib/import-archivos";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle2, AlertTriangle, History } from "lucide-react";

// Una casilla por archivo: control de qué se importa y de cuándo es cada actualización.
const CASILLAS: { tipo: TipoArchivo; titulo: string; fuente: string; desc: string }[] = [
  { tipo: "novedades", titulo: "Cartera (Novedades)", fuente: "VOPA → Reportes → Novedades", desc: "La cartera completa de ahorristas. Actualiza datos y cuotas; alimenta Gestiones y el Cotizador." },
  { tipo: "solicitudes", titulo: "Solicitudes VOPA", fuente: "VOPA → Solicitud → Buscar → Exportar CSV", desc: "Solicitudes enviadas a fábrica: trae DNI/CUIT, email, teléfonos, domicilio y el status de firma." },
  { tipo: "adjudicatarios", titulo: "Adjudicatarios sin pedido", fuente: "VOPA → Reportes → Adjudicatarios sin pedido", desc: "Adjudicados que aún no cargaron pedido: pasa los casos al estadio Pedido con aging y observaciones." },
  { tipo: "ganadores", titulo: "Ganadores de acto", fuente: "VOPA → Reportes → Ganadores del acto", desc: "Ganadores de sorteo/licitación: pasa a Adjudicación y avisa a Administración." },
  { tipo: "precios", titulo: "Lista de precios", fuente: "Planilla → solapa Precio2 (guardar como CSV/Excel)", desc: "Precios por SEQ para el Cotizador. Queda guardado el historial de listas. Columnas: SEQ, MODELO, PRECIO (y opcional PROMO, FLETE, ORIGEN)." },
  { tipo: "cta_cte", titulo: "Cuenta corriente", fuente: "FIS → cta_cte_*.txt", desc: "Movimientos de la concesionaria con la administradora (módulo Cuenta corriente)." },
  { tipo: "adh", titulo: "Domicilios (adh)", fuente: "FIS → adh_*.txt", desc: "Enriquece domicilio/localidad/provincia/CP de clientes existentes. Layout beta." },
];

export default function ImportarPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [, setTick] = useState(0);
  useEffect(() => suscribir(() => setTick((t) => t + 1)), []);

  const [pendiente, setPendiente] = useState<{ tipo: TipoArchivo; analisis: ArchivoAnalizado; archivo: string } | null>(null);
  const [errorEn, setErrorEn] = useState<{ tipo: TipoArchivo; texto: string } | null>(null);
  const [reporte, setReporte] = useState<{ tipo: TipoArchivo; rep: ReporteImportacion } | null>(null);
  const [cargando, setCargando] = useState(false);
  const confirmarRef = useRef<HTMLDivElement | null>(null);

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
  // Deshacer importaciones y limpiar datos: SOLO super admin y supervisor de administración.
  const puedeBorrar = usuarioActivo.roles.some((r) => r === "super_admin" || r === "supervisor_administracion");

  const onArchivo = async (esperado: TipoArchivo, file: File | undefined) => {
    if (!file) return;
    setErrorEn(null); setReporte(null); setPendiente(null); setCargando(true);
    try {
      const a = await analizarArchivo(file);
      if (a.tipo === "desconocido") {
        setErrorEn({ tipo: esperado, texto: "No reconocimos el formato de este archivo." });
      } else if (a.tipo !== esperado) {
        setErrorEn({ tipo: esperado, texto: `Este archivo parece ser "${TIPO_LABEL[a.tipo]}". Subilo en su casilla para mantener el control.` });
      } else if (empresaActivaId && a.concesionarios?.length && codigoConcesionario(empresaActivaId) &&
                 !a.concesionarios.includes(codigoConcesionario(empresaActivaId))) {
        // ⛔ Control de concesionario: 177 = Pedro Corradi, 126 = Fiorasi.
        const ajena = empresaPorCodigoConce(a.concesionarios[0]);
        setErrorEn({
          tipo: esperado,
          texto: `⛔ Este archivo es del concesionario ${a.concesionarios.join(" y ")}` +
            `${ajena ? ` (${ajena.nombreComercial})` : ""}, pero estás trabajando en ` +
            `${empresa?.nombreComercial} (código ${codigoConcesionario(empresaActivaId)}). ` +
            `No se importó nada: cambiá de empresa arriba y volvé a subirlo.`,
        });
      } else {
        setPendiente({ tipo: esperado, analisis: a, archivo: file.name });
        setTimeout(() => confirmarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    } catch {
      setErrorEn({ tipo: esperado, texto: "No pudimos leer el archivo. Verificá que sea el export correcto." });
    } finally {
      setCargando(false);
    }
  };

  const deshacer = (tipo: TipoArchivo) => {
    if (!empresaActivaId) return;
    const ult = ultimaImportacion(empresaActivaId, tipo);
    const n = tipo === "precios" ? "la lista vigente (vuelve la anterior)" : `${ult?.idsCreados?.length ?? 0} registro(s) creados`;
    if (!confirm(`¿Deshacer la última importación de "${TIPO_LABEL[tipo]}" (${ult?.archivo})?\nSe eliminará: ${n}. Los registros que solo se actualizaron no se revierten.`)) return;
    const r = deshacerImportacion(empresaActivaId, tipo);
    setReporte(null); setPendiente(null);
    setErrorEn(r.ok
      ? { tipo, texto: `✔ Importación deshecha: se eliminaron ${r.eliminados} registro(s).` }
      : { tipo, texto: r.motivo ?? "No se pudo deshacer." });
  };

  const ejecutar = () => {
    if (!empresaActivaId || !pendiente) return;
    const a = pendiente.analisis;
    let rep: ReporteImportacion | null = null;
    if (a.tipo === "novedades" && a.cartera) rep = importarCartera(a.cartera, empresaActivaId);
    if (a.tipo === "adjudicatarios" && a.adjudicatarios) rep = importarAdjudicatarios(a.adjudicatarios, empresaActivaId);
    if (a.tipo === "ganadores" && a.ganadores) rep = importarGanadores(a.ganadores, empresaActivaId);
    if (a.tipo === "solicitudes" && a.solicitudes) rep = importarSolicitudes(a.solicitudes, empresaActivaId);
    if (a.tipo === "precios" && a.precios) rep = importarListaPrecios(a.precios, empresaActivaId, pendiente.archivo, usuarioActivo.nombre);
    if (a.tipo === "cta_cte" && a.movimientos) rep = importarCtaCte(a.movimientos, empresaActivaId);
    if (a.tipo === "adh" && a.adh) rep = importarAdh(a.adh, empresaActivaId);
    if (rep) {
      registrarImportacion(empresaActivaId, a.tipo, {
        fecha: new Date().toISOString(), archivo: pendiente.archivo, usuario: usuarioActivo.nombre,
        total: rep.total, creados: rep.creados, actualizados: rep.actualizados, rechazados: rep.rechazados.length,
        idsCreados: rep.idsCreados?.slice(0, 6000), // permite "Deshacer" la última importación
      });
      setReporte({ tipo: a.tipo, rep });
      setPendiente(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Importar archivos</h1>
        <p className="text-muted-foreground">
          Una casilla por archivo, con la fecha de la última actualización de cada uno.
          Todo se asigna a <strong>{empresa?.nombreComercial ?? "la empresa seleccionada"}</strong>.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {CASILLAS.map((c) => {
          const ult = empresaActivaId ? ultimaImportacion(empresaActivaId, c.tipo) : null;
          const error = errorEn?.tipo === c.tipo ? errorEn.texto : null;
          return (
            <Card key={c.tipo} className={pendiente?.tipo === c.tipo ? "border-primary" : undefined}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  {c.titulo}
                  <label className="shrink-0">
                    <span className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border px-3 text-sm font-medium hover:bg-accent">
                      <Upload className="h-4 w-4" /> Subir
                    </span>
                    <input
                      type="file"
                      accept=".csv,.xls,.xlsx,.txt,text/csv,text/plain"
                      className="hidden"
                      onChange={(e) => { onArchivo(c.tipo, e.target.files?.[0]); e.target.value = ""; }}
                    />
                  </label>
                </CardTitle>
                <CardDescription>{c.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 pt-0 text-sm">
                <p className="text-xs text-muted-foreground">Se baja de: {c.fuente}</p>
                {ult ? (
                  <p>
                    <Badge variant={ult.deshecha ? "outline" : "success"}>
                      {ult.deshecha ? "Deshecha" : `Actualizado ${new Date(ult.fecha).toLocaleDateString("es-AR")}`}
                    </Badge>{" "}
                    <span className="text-muted-foreground">
                      {new Date(ult.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                      · {ult.archivo} · {ult.total} reg. ({ult.actualizados} act. / {ult.creados} nuevos
                      {ult.rechazados ? ` / ${ult.rechazados} rech.` : ""}) · por {ult.usuario}
                    </span>
                    {puedeBorrar && !ult.deshecha && (c.tipo === "precios" || (ult.idsCreados?.length ?? 0) > 0) && (
                      <button
                        className="ml-2 text-xs text-red-600 underline-offset-2 hover:underline"
                        onClick={() => deshacer(c.tipo)}
                      >
                        Deshacer
                      </button>
                    )}
                  </p>
                ) : (
                  <p><Badge variant="outline">Nunca se importó</Badge></p>
                )}
                {c.tipo === "precios" && empresaActivaId && <HistorialPrecios empresaId={empresaActivaId} />}
                {error && <p className={error.startsWith("✔") ? "text-emerald-700" : "text-destructive"}>{error}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Leyendo archivo…</p>}

      {puedeBorrar && empresaActivaId && <Limpieza empresaId={empresaActivaId} nombreEmpresa={empresa?.nombreComercial ?? ""} />}

      {pendiente && !reporte && (
        <Card ref={confirmarRef as React.RefObject<HTMLDivElement>}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Confirmar: <Badge>{TIPO_LABEL[pendiente.tipo]}</Badge>
              <span className="text-sm font-normal text-muted-foreground">
                {pendiente.archivo} — {pendiente.analisis.cantidad} registro(s)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <VistaPrevia analisis={pendiente.analisis} />
            <div className="flex items-center gap-2">
              <Button onClick={ejecutar} disabled={!empresaActivaId}>Importar {pendiente.analisis.cantidad} registro(s)</Button>
              <Button variant="outline" onClick={() => setPendiente(null)}>Cancelar</Button>
              {!empresaActivaId && <span className="text-sm text-destructive">Seleccioná una empresa arriba.</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {reporte && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Importación finalizada — {TIPO_LABEL[reporte.tipo]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Resumen n={reporte.rep.total} t="Total" />
              <Resumen n={reporte.rep.creados} t={reporte.tipo === "precios" ? "Precios cargados" : "Creados"} color="text-emerald-700" />
              <Resumen n={reporte.rep.actualizados} t="Actualizados" color="text-blue-700" />
              <Resumen n={reporte.rep.rechazados.length} t="Rechazados" color="text-amber-700" />
            </div>
            {reporte.rep.rechazados.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
                  <AlertTriangle className="h-4 w-4" /> Registros rechazados
                </p>
                <ul className="mt-1 space-y-1 text-sm text-amber-800">
                  {reporte.rep.rechazados.slice(0, 20).map((r, i) => (
                    <li key={i}>Fila {r.fila} ({r.nombre}): {r.motivo}</li>
                  ))}
                  {reporte.rep.rechazados.length > 20 && <li>… y {reporte.rep.rechazados.length - 20} más.</li>}
                </ul>
              </div>
            )}
            <div className="flex gap-2">
              {reporte.tipo !== "precios" && reporte.tipo !== "cta_cte" && <Link href="/clientes"><Button variant="outline">Ver ahorristas</Button></Link>}
              {reporte.tipo === "cta_cte" && <Link href="/cta-cte"><Button variant="outline">Ver cuenta corriente</Button></Link>}
              {reporte.tipo === "precios" && <Link href="/cotizador"><Button variant="outline">Ver cotizador</Button></Link>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Limpieza para una importación cruzada YA hecha (antes del control de concesionario):
 * borra los clientes importados sin gestión propia. Solo super admin / sup. administración.
 */
function Limpieza({ empresaId, nombreEmpresa }: { empresaId: string; nombreEmpresa: string }) {
  const [hecho, setHecho] = useState<number | null>(null);
  const candidatos = clientesImportadosSinGestion(empresaId).length;
  if (candidatos === 0 && hecho === null) return null;
  return (
    <Card className="border-red-200">
      <CardContent className="flex flex-wrap items-center gap-3 pt-6 text-sm">
        {hecho !== null ? (
          <p className="text-emerald-700">✔ Se eliminaron {hecho} clientes importados de {nombreEmpresa} (acá y en la nube).</p>
        ) : (
          <>
            <p className="grow">
              <strong>Limpieza (usar solo si importaste un archivo de la otra concesionaria por error):</strong>{" "}
              {nombreEmpresa} tiene <strong>{candidatos}</strong> clientes importados <em>sin gestión propia</em>{" "}
              (sin anotador, sin venta, sin vendedor). ⚠️ Esto borra TODOS esos clientes, incluidos los de una
              importación correcta — si solo querés revertir la última, usá el botón &quot;Deshacer&quot; de la casilla.
            </p>
            <Button
              variant="destructive"
              onClick={() => {
                const esperado = nombreEmpresa.toUpperCase();
                const escrito = prompt(
                  `Se van a ELIMINAR ${candidatos} clientes importados de ${nombreEmpresa} (acá y en la nube).\n` +
                  `Los clientes con anotador, venta o vendedor asignado NO se tocan.\n\n` +
                  `Para confirmar, escribí: ${esperado}`
                );
                if ((escrito ?? "").trim().toUpperCase() === esperado) {
                  setHecho(eliminarClientesImportados(empresaId));
                } else if (escrito !== null) {
                  alert("No coincide: no se borró nada.");
                }
              }}
            >
              Borrar {candidatos} clientes importados
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HistorialPrecios({ empresaId }: { empresaId: string }) {
  const [abierto, setAbierto] = useState(false);
  const hist = historialListasPrecios(empresaId);
  if (hist.length === 0) return null;
  return (
    <div>
      <button className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline" onClick={() => setAbierto((v) => !v)}>
        <History className="h-3 w-3" /> {abierto ? "Ocultar historial" : `Historial de listas (${hist.length})`}
      </button>
      {abierto && (
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          {hist.map((h, i) => (
            <li key={h.fecha}>
              {new Date(h.fecha).toLocaleDateString("es-AR")} — {h.archivo} — {Object.keys(h.prec2).length} precios — por {h.usuario}
              {i === 0 && <Badge className="ml-1" variant="success">vigente</Badge>}
            </li>
          ))}
        </ul>
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
  if (analisis.tipo === "precios" && analisis.precios) {
    return (
      <Tabla headers={["SEQ", "Modelo", "Precio", "Promo", "Flete", "Origen"]}
        rows={analisis.precios.slice(0, 8).map((f) => [f.seq, f.modelo, f.precio.toLocaleString("es-AR"), f.promo ? f.promo.toLocaleString("es-AR") : "—", f.flete ? f.flete.toLocaleString("es-AR") : "—", f.origen ?? "—"])} />
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
