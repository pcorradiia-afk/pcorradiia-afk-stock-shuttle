"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { empresaPorId } from "@/lib/demo-data";
import { nombreRol, tienePermiso } from "@/lib/roles";
import { MODO_DEMO } from "@/lib/supabase/client";
import {
  inicializar, suscribir, listarClientes, listarObservacionesEmpresa, ESTADIOS_ORDEN, getMeta,
} from "@/lib/store";
import { ESTADIO_LABEL } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const datos = useMemo(() => {
    if (!empresaActivaId || !usuarioActivo) return null;
    const clientes = listarClientes(empresaActivaId, {}, usuarioActivo);
    const mes = new Date().toISOString().slice(0, 7);
    const obs = listarObservacionesEmpresa(empresaActivaId).filter((o) => o.resultado.startsWith("observado"));
    return {
      total: clientes.length,
      leadsMes: clientes.filter((c) => c.estado === "lead" && c.fechaAlta.startsWith(mes)).length,
      ventasMes: clientes.filter((c) => c.estado === "vendido" && (c.fechaVenta || "").startsWith(mes)).length,
      obsAbiertas: obs.filter((o) => !o.gestionResultado).length,
      embudo: ESTADIOS_ORDEN.map((e) => ({ estadio: e, cantidad: clientes.filter((c) => c.estadio === e).length })),
    };
  }, [empresaActivaId, usuarioActivo, tick]);

  if (!usuarioActivo) return null;

  const empresaTexto = empresaActivaId
    ? empresaPorId(empresaActivaId)?.nombreComercial ?? ""
    : "";
  const carteraActualizada = empresaActivaId ? getMeta(`carteraActualizada:${empresaActivaId}`) : null;
  void tick;
  const maxEmbudo = Math.max(1, ...(datos?.embudo.map((e) => e.cantidad) ?? [1]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tablero</h1>
        <p className="text-muted-foreground">
          Hola {usuarioActivo.nombre.split(" ")[0]} — viendo <strong>{empresaTexto}</strong>.
          {carteraActualizada && (
            <span> · Cartera actualizada: {new Date(carteraActualizada).toLocaleDateString("es-AR")}</span>
          )}
        </p>
      </div>

      {MODO_DEMO && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">Modo demo activo</CardTitle>
            <CardDescription className="text-amber-800">
              La app corre con datos de ejemplo guardados en este navegador (sin Supabase).
              Los números de abajo son reales respecto de lo que cargues o importes acá.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Ahorristas", v: datos?.total ?? 0 },
          { t: "Leads del mes", v: datos?.leadsMes ?? 0 },
          { t: "Ventas del mes", v: datos?.ventasMes ?? 0 },
          { t: "Observaciones abiertas", v: datos?.obsAbiertas ?? 0 },
        ].map((k) => (
          <Card key={k.t}>
            <CardHeader className="pb-2">
              <CardDescription>{k.t}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{k.v}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embudo por estadio</CardTitle>
          <CardDescription>
            Cantidad de clientes en cada etapa.{" "}
            {tienePermiso(usuarioActivo.roles, "informes.ver") && (
              <Link href="/informes" className="text-primary underline">Ver informes completos →</Link>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2" role="img" aria-label="Embudo de clientes por estadio">
            {(datos?.embudo ?? []).map((f) => (
              <div key={f.estadio} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-muted-foreground">{ESTADIO_LABEL[f.estadio]}</span>
                <div className="h-5 flex-1 rounded-sm bg-muted" title={`${ESTADIO_LABEL[f.estadio]}: ${f.cantidad}`}>
                  <div
                    className="h-5 rounded-sm bg-primary"
                    style={{ width: `${(f.cantidad / maxEmbudo) * 100}%`, minWidth: f.cantidad > 0 ? "0.5rem" : 0 }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{f.cantidad}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu acceso</CardTitle>
          <CardDescription>Roles y tipo de perfil con los que estás operando.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {usuarioActivo.roles.map((r) => <Badge key={r}>{nombreRol(r)}</Badge>)}
          <Badge variant={usuarioActivo.tipoPerfil === "terciarizada" ? "warning" : "secondary"}>
            {usuarioActivo.tipoPerfil}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
