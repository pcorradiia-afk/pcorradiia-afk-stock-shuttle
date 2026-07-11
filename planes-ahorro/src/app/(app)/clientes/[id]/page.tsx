"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSesion } from "@/lib/session";
import {
  inicializar, getCliente, listarComunicaciones, agregarComunicacion, suscribir,
  listarPlanes, getPlan, vendedoresDeEmpresa, asignarVendedor, actualizarGestionVenta,
  actualizarCliente, cerrarVenta, buscarPorNroSolicitud, puedeVerCliente, listarTareas,
  setOptInWhatsApp,
} from "@/lib/store";
import { tienePermiso } from "@/lib/roles";
import { ESTADIO_LABEL, ESTADO_LABEL, ESTADIOS, pesos, fechaHora } from "@/lib/labels";
import type { Cliente, Comunicacion, Estadio, TipoDocumento, Usuario } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquarePlus, ShoppingCart, CheckCircle2 } from "lucide-react";
import { AdministracionEstadio } from "@/components/administracion-estadio";

const TIPOS_CONTACTO = ["Llamado", "WhatsApp", "Email", "Presencial", "Otro"];

export default function FichaClientePage() {
  const params = useParams<{ id: string }>();
  const { usuarioActivo } = useSesion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const cliente = useMemo<Cliente | undefined>(() => getCliente(params.id), [params.id, tick]);
  const coms = useMemo<Comunicacion[]>(() => listarComunicaciones(params.id), [params.id, tick]);

  if (!usuarioActivo) return null;
  if (!cliente) {
    return (
      <Card><CardHeader>
        <CardTitle>Cliente no encontrado</CardTitle>
        <CardDescription><Link href="/clientes" className="underline">Volver al listado</Link></CardDescription>
      </CardHeader></Card>
    );
  }
  // Regla C5: la visibilidad se aplica también entrando por URL directa.
  if (!puedeVerCliente(usuarioActivo, cliente)) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>
          Este cliente no pertenece a tu gestión. <Link href="/clientes" className="underline">Volver al listado</Link>
        </CardDescription>
      </CardHeader></Card>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a ahorristas
      </Link>

      {/* Aviso de tarea de call center pendiente para este usuario */}
      {listarTareas(cliente.empresaId, { asignadoId: usuarioActivo.id, estado: "pendiente" })
        .filter((t) => t.clienteId === cliente.id)
        .slice(0, 1)
        .map((t) => (
          <div key={t.id} className="rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
            📋 Tenés una tarea pendiente sobre este cliente (<strong>{t.gestionTipo}</strong>, asignada por {t.creadaPorNombre}).
            Al registrar el contacto en la bitácora se completa sola.
          </div>
        ))}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{cliente.nombreCompleto}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge variant="secondary">{ESTADO_LABEL[cliente.estado]}</Badge>
            <Badge variant="outline">{ESTADIO_LABEL[cliente.estadio]}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Datos */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Datos del cliente</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Dato k="Documento" v={cliente.documento ? `${cliente.tipoDocumento ?? ""} ${cliente.documento}`.trim() : "—"} />
            <Dato k="Teléfono" v={cliente.telefono ?? "—"} />
            <Dato k="Email" v={cliente.email ?? "—"} />
            <Dato k="Origen" v={cliente.origenDato ?? "—"} />
            <Dato k="Alta" v={fechaHora(cliente.fechaAlta)} />
            {cliente.domicilio && (
              <Dato k="Domicilio" v={`${cliente.domicilio}${cliente.localidad ? `, ${cliente.localidad}` : ""}${cliente.provincia ? ` (${cliente.provincia})` : ""}${cliente.codigoPostal ? ` CP ${cliente.codigoPostal}` : ""}`} />
            )}
            <OptInWhatsApp cliente={cliente} />
          </CardContent>
        </Card>

        {/* Solicitud */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Solicitud / plan</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Dato k="N° solicitud" v={cliente.solicitud.nroSolicitud ?? "—"} />
            <Dato k="Grupo" v={cliente.solicitud.grupo ?? "—"} />
            <Dato k="Orden" v={cliente.solicitud.orden ?? "—"} />
            <Dato k="Plan" v={cliente.solicitud.plan ?? "—"} />
            <Dato k="Modelo" v={cliente.solicitud.modelo ?? "—"} />
            <Dato k="Valor móvil" v={pesos(cliente.solicitud.valorMovil)} />
            <Dato k="Status cartera" v={cliente.solicitud.statusDesc ?? "—"} />
            {cliente.solicitud.statusVopa && (
              <Dato k="Status VOPA (fábrica)" v={`${cliente.solicitud.statusVopa}${cliente.solicitud.firmaPendiente ? " — ⚠️ firma pendiente" : ""}`} />
            )}
            {cliente.solicitud.nroManual && <Dato k="N° manual VOPA" v={cliente.solicitud.nroManual} />}
            {cliente.adjudicacion?.nroActo && <Dato k="Acto de adjudicación" v={`${cliente.adjudicacion.nroActo} (${cliente.adjudicacion.tipoAdjudicacion ?? "—"})`} />}
            {cliente.adjudicacion?.aging != null && <Dato k="Días sin pedido" v={String(cliente.adjudicacion.aging)} />}
            {cliente.adjudicacion?.puedeIngresarPedido != null && (
              <Dato k="¿Puede ingresar pedido?" v={cliente.adjudicacion.puedeIngresarPedido ? "SÍ" : `NO${cliente.adjudicacion.observaciones ? ` — ${cliente.adjudicacion.observaciones}` : ""}`} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Administración por estadios */}
      <AdministracionEstadio cliente={cliente} usuario={usuarioActivo} onCambio={() => setTick((t) => t + 1)} />

      {/* Gestión comercial y cierre de venta: SOLO para leads en proceso de venta.
          Un ahorrista de la cartera ya compró — esta sección no aplica (pedido 2026-07-11). */}
      {cliente.estado !== "cartera" && <GestionComercial cliente={cliente} usuario={usuarioActivo} />}

      {/* Bitácora */}
      <div className="grid gap-4 lg:grid-cols-3">
        <NuevaComunicacion clienteId={cliente.id} estadioActual={cliente.estadio} usuario={usuarioActivo} />
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Bitácora de comunicaciones</CardTitle>
            <CardDescription>Historial cronológico de todo lo conversado con el cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {coms.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay comunicaciones registradas.</p>}
            {coms.map((c) => (
              <div key={c.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Badge>{c.tipoContacto}</Badge>
                    <Badge variant="outline">{ESTADIO_LABEL[c.estadio]}</Badge>
                  </span>
                  <span>{fechaHora(c.fechaHora)} · {c.usuarioNombre}</span>
                </div>
                <p className="mt-2 text-sm">{c.detalle}</p>
                {c.proximaAccion && (
                  <p className="mt-1 text-sm text-muted-foreground"><strong>Próxima acción:</strong> {c.proximaAccion}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GestionComercial({ cliente, usuario }: { cliente: Cliente; usuario: Usuario }) {
  const puedeEditar = tienePermiso(usuario.roles, "clientes.editar");
  const puedeReasignar = tienePermiso(usuario.roles, "leads.reasignar");
  const puedeCerrar = tienePermiso(usuario.roles, "venta.cerrar");
  const vendedores = vendedoresDeEmpresa(cliente.empresaId);
  const planes = listarPlanes(cliente.empresaId, true);

  const [vendedorId, setVendedorId] = useState(cliente.vendedorId ?? "");
  const [pruebaManejo, setPrueba] = useState<string>(cliente.pruebaManejo == null ? "" : cliente.pruebaManejo ? "si" : "no");
  const [necesidades, setNecesidades] = useState(cliente.necesidades ?? "");
  const [planId, setPlanId] = useState(cliente.planId ?? "");
  const [presupuesto, setPresupuesto] = useState(cliente.presupuestoNombre ?? "");
  const [documento, setDocumento] = useState(cliente.documento ?? "");
  const [tipoDoc, setTipoDoc] = useState<TipoDocumento>(cliente.tipoDocumento ?? "DNI");
  const [telefono, setTelefono] = useState(cliente.telefono ?? "");
  const [email, setEmail] = useState(cliente.email ?? "");
  const [nroSolicitud, setNroSolicitud] = useState(cliente.solicitud.nroSolicitud ?? "");
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  if (!puedeEditar) return null;
  const vendido = cliente.estado === "vendido";

  const guardar = (): boolean => {
    // Regla §3.6: el N° de solicitud es ÚNICO E IRREPETIBLE.
    const nro = nroSolicitud.trim();
    if (nro) {
      const duenio = buscarPorNroSolicitud(nro);
      if (duenio && duenio.id !== cliente.id) {
        setMsg({ tipo: "err", texto: `El N° de solicitud ${nro} ya pertenece a ${duenio.nombreCompleto}. No se guardó: es único e irrepetible.` });
        return false;
      }
    }
    if (puedeReasignar) asignarVendedor(cliente.id, vendedorId || null);
    actualizarGestionVenta(cliente.id, {
      pruebaManejo: pruebaManejo === "" ? null : pruebaManejo === "si",
      necesidades: necesidades.trim() || null,
      planId: planId || null,
      presupuestoNombre: presupuesto.trim() || null,
    });
    actualizarCliente(cliente.id, {
      documento: documento.trim() || null,
      tipoDocumento: documento.trim() ? tipoDoc : null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      solicitud: { ...cliente.solicitud, nroSolicitud: nro || null },
    });
    setMsg({ tipo: "ok", texto: "Gestión guardada." });
    return true;
  };

  const vender = () => {
    if (!guardar()) return;
    const r = cerrarVenta(cliente.id);
    if (r.ok) setMsg({ tipo: "ok", texto: "¡Venta cerrada! El caso pasó a Administración (Scoring)." });
    else if (r.error) setMsg({ tipo: "err", texto: r.error });
    else setMsg({ tipo: "err", texto: `Para cerrar la venta faltan datos obligatorios: ${r.faltan?.join(", ")}.` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ShoppingCart className="h-4 w-4" /> Gestión comercial</CardTitle>
        <CardDescription>
          Datos de la gestión del vendedor. Para <strong>cerrar la venta</strong> son obligatorios:
          DNI/CUIT, teléfono, email y N° de solicitud.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {vendido && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" /> Vendido el {cliente.fechaVenta ? fechaHora(cliente.fechaVenta) : "—"}. Caso en Administración.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <Campo label="Vendedor asignado">
            <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} disabled={!puedeReasignar}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-70">
              <option value="">Sin asignar</option>
              {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="¿Ofreció prueba de manejo?">
            <select value={pruebaManejo} onChange={(e) => setPrueba(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">—</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </Campo>
          <Campo label="Plan ofrecido">
            <select value={planId} onChange={(e) => setPlanId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Elegir plan…</option>
              {planes.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.nombre}</option>)}
            </select>
          </Campo>
        </div>
        <Campo label="Necesidades del cliente">
          <textarea value={necesidades} onChange={(e) => setNecesidades(e.target.value)} rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </Campo>
        <Campo label="Presupuesto adjunto (nombre del archivo)">
          <Input value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} placeholder="Ej: presupuesto-ranger.pdf" />
        </Campo>

        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-sm font-medium">Datos obligatorios para cerrar la venta</p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex gap-2">
              <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value as TipoDocumento)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm">
                <option value="DNI">DNI</option><option value="CUIT">CUIT</option>
              </select>
              <Input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="Documento" />
            </div>
            <Input value={nroSolicitud} onChange={(e) => setNroSolicitud(e.target.value)} placeholder="N° de solicitud" />
            <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" />
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          </div>
        </div>

        {msg && (
          <p className={msg.tipo === "ok" ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{msg.texto}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={guardar} variant="outline">Guardar gestión</Button>
          {puedeCerrar && !vendido && <Button onClick={vender}>Marcar como vendido</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function NuevaComunicacion({
  clienteId, estadioActual, usuario,
}: {
  clienteId: string;
  estadioActual: Estadio;
  usuario: { id: string; nombre: string };
}) {
  const [tipoContacto, setTipo] = useState(TIPOS_CONTACTO[0]);
  const [detalle, setDetalle] = useState("");
  const [proximaAccion, setProxima] = useState("");
  const [estadio, setEstadio] = useState<Estadio>(estadioActual);

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detalle.trim()) return;
    agregarComunicacion({
      clienteId, usuarioId: usuario.id, usuarioNombre: usuario.nombre,
      tipoContacto, detalle: detalle.trim(), proximaAccion: proximaAccion.trim() || null, estadio,
    });
    setDetalle("");
    setProxima("");
  };

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><MessageSquarePlus className="h-4 w-4" /> Registrar contacto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={guardar} className="space-y-3">
          <select value={tipoContacto} onChange={(e) => setTipo(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {TIPOS_CONTACTO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={estadio} onChange={(e) => setEstadio(e.target.value as Estadio)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {ESTADIOS.map((e) => <option key={e} value={e}>{ESTADIO_LABEL[e]}</option>)}
          </select>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Lo conversado…"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Input value={proximaAccion} onChange={(e) => setProxima(e.target.value)} placeholder="Próxima acción (opcional)" />
          <Button type="submit" className="w-full">Guardar en la bitácora</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function OptInWhatsApp({ cliente }: { cliente: Cliente }) {
  const [canal, setCanal] = useState("verbal / llamado");
  const o = cliente.waOptIn;
  return (
    <div className="rounded-md border p-2">
      <span className="block text-xs text-muted-foreground">WhatsApp (consentimiento)</span>
      {o?.ok ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="success">opt-in ✓</Badge>
          <span className="text-xs text-muted-foreground">{fechaHora(o.fecha)} · {o.canal}</span>
          <Button size="sm" variant="ghost" onClick={() => setOptInWhatsApp(cliente.id, false, o.canal)}>Revocar</Button>
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="outline">sin opt-in — no se le puede enviar</Badge>
          <Input value={canal} onChange={(e) => setCanal(e.target.value)} placeholder="canal (formulario, llamado…)" className="h-8 w-44 text-xs" />
          <Button size="sm" variant="outline" onClick={() => setOptInWhatsApp(cliente.id, true, canal.trim() || "sin especificar")}>
            Registrar opt-in
          </Button>
        </div>
      )}
    </div>
  );
}
