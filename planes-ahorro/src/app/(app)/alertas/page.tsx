"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { inicializar, listarAlertas, marcarAlertaLeida, marcarTodasLeidas, suscribir } from "@/lib/store";
import { fechaHora } from "@/lib/labels";
import type { Alerta } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";

export default function AlertasPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const alertas = useMemo<Alerta[]>(
    () => (usuarioActivo ? listarAlertas(usuarioActivo, empresaActivaId) : []),
    [usuarioActivo, empresaActivaId, tick]
  );

  if (!usuarioActivo) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bell className="h-6 w-6" /> Alertas</h1>
          <p className="text-muted-foreground">Notificaciones internas para tus roles en esta empresa.</p>
        </div>
        {alertas.some((a) => !a.leidaPor.includes(usuarioActivo.id)) && (
          <Button variant="outline" onClick={() => marcarTodasLeidas(usuarioActivo, empresaActivaId)}>
            <Check className="h-4 w-4" /> Marcar todas como leídas
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bandeja</CardTitle>
          <CardDescription>Las no leídas aparecen resaltadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {alertas.length === 0 && <p className="text-sm text-muted-foreground">No tenés alertas.</p>}
          {alertas.map((a) => {
            const leida = a.leidaPor.includes(usuarioActivo.id);
            return (
              <div key={a.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm ${leida ? "" : "border-amber-300 bg-amber-50"}`}>
                <div>
                  <p className="font-medium">
                    {a.mensaje}{" "}
                    {a.clienteId && a.clienteNombre && (
                      <Link href={`/clientes/${a.clienteId}`} className="text-primary underline">{a.clienteNombre}</Link>
                    )}
                  </p>
                  <span className="text-xs text-muted-foreground">{fechaHora(a.fecha)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!leida && <Badge variant="warning">nueva</Badge>}
                  {!leida && (
                    <Button size="sm" variant="ghost" onClick={() => marcarAlertaLeida(a.id, usuarioActivo.id)}>
                      Marcar leída
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
