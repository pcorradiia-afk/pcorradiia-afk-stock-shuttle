"use client";

import { useSesion } from "@/lib/session";
import { empresaPorId } from "@/lib/demo-data";
import { nombreRol } from "@/lib/roles";
import { MODO_DEMO } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ESTADIOS = [
  "Scoring", "Agrupamiento", "Gestión de cliente", "Adjudicación", "Pedido", "Patentamiento", "Entrega",
];

export default function DashboardPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  if (!usuarioActivo) return null;

  const empresaTexto = empresaActivaId
    ? empresaPorId(empresaActivaId)?.nombreComercial ?? ""
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tablero</h1>
        <p className="text-muted-foreground">
          Hola {usuarioActivo.nombre.split(" ")[0]} — viendo <strong>{empresaTexto}</strong>.
        </p>
      </div>

      {MODO_DEMO && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">Modo demo activo</CardTitle>
            <CardDescription className="text-amber-800">
              La app está corriendo con datos de ejemplo (sin Supabase). Esta es la <strong>Fase 0</strong>:
              login, multiempresa, usuarios, roles e impersonar. Los tableros con datos reales llegan en
              fases siguientes.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { t: "Ahorristas", v: "—" },
          { t: "Leads del mes", v: "—" },
          { t: "Ventas del mes", v: "—" },
          { t: "Observaciones de scoring", v: "—" },
        ].map((k) => (
          <Card key={k.t}>
            <CardHeader className="pb-2">
              <CardDescription>{k.t}</CardDescription>
              <CardTitle className="text-3xl">{k.v}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">Disponible en Fase 1+</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embudo por estadio</CardTitle>
          <CardDescription>Cantidad de clientes en cada etapa (se completa con datos reales).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ESTADIOS.map((e) => (
            <div key={e} className="rounded-md border px-3 py-2 text-sm">
              {e} <span className="ml-2 font-semibold text-muted-foreground">—</span>
            </div>
          ))}
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
