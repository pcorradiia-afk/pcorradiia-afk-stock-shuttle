"use client";

import { useState } from "react";
import {
  ESTADIOS_ORDEN, ESTADIOS_TERCIARIZADA, estadioSiguiente, avanzarEstadio,
  actualizarGestionAdmin, listarObservaciones, registrarScoring, gestionarObservacion,
  etiquetaScoring,
} from "@/lib/store";
import { ESTADIO_LABEL } from "@/lib/labels";
import type { Cliente, Estadio, ResultadoScoring, Usuario, GestionAdmin } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Workflow, ArrowRight, AlertTriangle } from "lucide-react";

const RESULTADOS: ResultadoScoring[] = [
  "pendiente", "observado_requisitos_crediticios", "observado_gastos_retiro",
  "observado_vehiculo_usado", "observado_presupuesto", "observado_otros", "aprobado",
];

function estadiosConAcceso(u: Usuario): Estadio[] {
  if (u.roles.includes("super_admin")) return ESTADIOS_ORDEN;
  const set = new Set<Estadio>();
  if (u.roles.includes("supervisor_administracion")) ESTADIOS_ORDEN.forEach((e) => set.add(e));
  if (u.roles.includes("entregas")) set.add("entrega");
  if (u.roles.includes("supervisor_ventas")) set.add("scoring");
  if (u.roles.includes("administracion")) {
    const permitidos = u.tipoPerfil === "terciarizada" ? ESTADIOS_TERCIARIZADA : (u.estadios.length ? u.estadios : ESTADIOS_ORDEN);
    permitidos.forEach((e) => { if (u.tipoPerfil !== "terciarizada" || ESTADIOS_TERCIARIZADA.includes(e)) set.add(e); });
  }
  return ESTADIOS_ORDEN.filter((e) => set.has(e));
}

export function AdministracionEstadio({ cliente, usuario, onCambio }: { cliente: Cliente; usuario: Usuario; onCambio: () => void }) {
  const acceso = estadiosConAcceso(usuario);
  const puedeEsteEstadio = acceso.includes(cliente.estadio);
  const sig = estadioSiguiente(cliente.estadio);

  if (acceso.length === 0) return null; // roles puramente comerciales no ven este panel

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Workflow className="h-4 w-4" /> Administración por estadios</CardTitle>
        <CardDescription>Seguimiento de la gestión del cliente a lo largo del proceso.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Línea de estadios */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ESTADIOS_ORDEN.map((e, i) => (
            <span key={e} className="flex items-center gap-1.5">
              <Badge variant={e === cliente.estadio ? "default" : acceso.includes(e) ? "secondary" : "outline"}>
                {ESTADIO_LABEL[e]}
              </Badge>
              {i < ESTADIOS_ORDEN.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </span>
          ))}
        </div>

        {!puedeEsteEstadio && (
          <p className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            El cliente está en <strong>{ESTADIO_LABEL[cliente.estadio]}</strong>. No tenés ese estadio asignado, así que
            es de solo lectura para vos.
          </p>
        )}

        {puedeEsteEstadio && cliente.estadio === "scoring" && (
          <ScoringPanel cliente={cliente} usuario={usuario} onCambio={onCambio} />
        )}
        {puedeEsteEstadio && cliente.estadio !== "scoring" && (
          <EstadioForm cliente={cliente} estadio={cliente.estadio} onCambio={onCambio} />
        )}

        {puedeEsteEstadio && sig && (
          <Button variant="outline" onClick={() => { avanzarEstadio(cliente.id); onCambio(); }}>
            Avanzar a {ESTADIO_LABEL[sig]} <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ScoringPanel({ cliente, usuario, onCambio }: { cliente: Cliente; usuario: Usuario; onCambio: () => void }) {
  const [resultado, setResultado] = useState<ResultadoScoring>("pendiente");
  const observaciones = listarObservaciones(cliente.id);
  const esSupervisorVentas = usuario.roles.includes("supervisor_ventas") || usuario.roles.includes("super_admin");
  const puedeRegistrar = usuario.roles.includes("administracion") || usuario.roles.includes("supervisor_administracion") || usuario.roles.includes("super_admin");

  return (
    <div className="space-y-3">
      {puedeRegistrar && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="space-y-1.5 text-sm">
            <span className="block font-medium">Resultado del scoring</span>
            <select value={resultado} onChange={(e) => setResultado(e.target.value as ResultadoScoring)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {RESULTADOS.map((r) => <option key={r} value={r}>{etiquetaScoring(r)}</option>)}
            </select>
          </label>
          <Button onClick={() => { registrarScoring(cliente.id, usuario, resultado); onCambio(); }}>Registrar</Button>
        </div>
      )}

      <div className="space-y-2">
        {observaciones.length === 0 && <p className="text-sm text-muted-foreground">Sin registros de scoring.</p>}
        {observaciones.map((o) => {
          const esObservado = o.resultado.startsWith("observado");
          const pendienteGestion = esObservado && !o.gestionResultado;
          return (
            <div key={o.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={o.resultado === "aprobado" ? "success" : esObservado ? "warning" : "secondary"}>
                  {etiquetaScoring(o.resultado)}
                </Badge>
                <span className="text-xs text-muted-foreground">{new Date(o.fechaHora).toLocaleString("es-AR")} · {o.usuarioNombre}</span>
              </div>
              {esObservado && (
                <div className="mt-2">
                  {o.gestionResultado ? (
                    <p className="text-muted-foreground">
                      <strong>Gestionado:</strong> {o.gestionResultado} · {o.gestionFechaHora ? new Date(o.gestionFechaHora).toLocaleString("es-AR") : ""} · {o.gestionUsuarioNombre}
                    </p>
                  ) : esSupervisorVentas ? (
                    <GestionObservacion obsId={o.id} usuario={usuario} onCambio={onCambio} />
                  ) : (
                    <p className="flex items-center gap-1 text-amber-700"><AlertTriangle className="h-3 w-3" /> Pendiente de gestión por Supervisor de ventas.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GestionObservacion({ obsId, usuario, onCambio }: { obsId: string; usuario: Usuario; onCambio: () => void }) {
  const [texto, setTexto] = useState("");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Resultado de la gestión…" className="max-w-xs" />
      <Button size="sm" disabled={!texto.trim()} onClick={() => { gestionarObservacion(obsId, usuario, texto.trim()); onCambio(); }}>
        Registrar gestión
      </Button>
    </div>
  );
}

function EstadioForm({ cliente, estadio, onCambio }: { cliente: Cliente; estadio: Estadio; onCambio: () => void }) {
  const g = cliente.gestionAdmin || {};
  const [form, setForm] = useState<GestionAdmin>(g);
  const set = (patch: GestionAdmin) => setForm((f) => ({ ...f, ...patch }));
  const guardar = () => { actualizarGestionAdmin(cliente.id, form); onCambio(); };

  const campoTexto = (label: string, key: keyof GestionAdmin, placeholder = "") => (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Input value={(form[key] as string) ?? ""} onChange={(e) => set({ [key]: e.target.value } as GestionAdmin)} placeholder={placeholder} />
    </label>
  );
  const check = (label: string, key: keyof GestionAdmin) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={!!form[key]} onChange={(e) => set({ [key]: e.target.checked } as GestionAdmin)} />
      {label}
    </label>
  );

  return (
    <div className="space-y-3">
      {estadio === "agrupamiento" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {campoTexto("Fecha de agrupamiento", "agrupamientoFecha", "dd/mm/aaaa")}
          {campoTexto("Nota", "agrupamientoNota")}
          <p className="text-xs text-amber-700 sm:col-span-2">⚠️ Formulario provisional: faltan tus reglas de Agrupamiento (CLAUDE.md §6.2).</p>
        </div>
      )}
      {estadio === "gestion_cliente" && (
        <p className="text-sm text-muted-foreground">
          Campañas (mora, invitación a licitar, ganadores, especiales) se gestionan desde el módulo de WhatsApp (Fase 4).
          Usá la bitácora para registrar la gestión.
        </p>
      )}
      {estadio === "adjudicacion" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {campoTexto("Requisitos crediticios informados", "adjRequisitos")}
          {campoTexto("Pagos a realizar", "adjPagos")}
          {check("Informado al cliente", "adjInformado")}
        </div>
      )}
      {estadio === "pedido" && (
        <div className="grid gap-3 sm:grid-cols-3">
          {campoTexto("Fecha", "pedidoFecha", "dd/mm/aaaa")}
          {campoTexto("Modelo solicitado", "pedidoModelo")}
          {campoTexto("Colores", "pedidoColores")}
        </div>
      )}
      {estadio === "patentamiento" && (
        <div className="space-y-2">
          {campoTexto("Fecha de factura", "patFechaFactura", "dd/mm/aaaa")}
          <div className="grid gap-2 sm:grid-cols-2">
            {check("Informe de gastos de retiro", "patInformeGastos")}
            {check("Cita para firma de documentación", "patCitaFirma")}
            {check("Pase a gestoría", "patPaseGestoria")}
            {check("Patentamiento finalizado", "patFinalizado")}
          </div>
        </div>
      )}
      {estadio === "entrega" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {campoTexto("Fecha de contacto", "entregaFechaContacto", "dd/mm/aaaa")}
          {campoTexto("Turno", "entregaTurno")}
          {check("Proceso cerrado", "entregaCerrado")}
        </div>
      )}
      <Button onClick={guardar}>Guardar</Button>
    </div>
  );
}
