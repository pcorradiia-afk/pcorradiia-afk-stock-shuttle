"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSesion } from "@/lib/session";
import {
  inicializar, getCliente, listarComunicaciones, agregarComunicacion, suscribir,
} from "@/lib/store";
import { ESTADIO_LABEL, ESTADO_LABEL, ESTADIOS, pesos, fechaHora } from "@/lib/labels";
import type { Cliente, Comunicacion, Estadio } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";

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

  return (
    <div className="space-y-4">
      <Link href="/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a ahorristas
      </Link>

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
          </CardContent>
        </Card>
      </div>

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

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="block text-xs text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
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
