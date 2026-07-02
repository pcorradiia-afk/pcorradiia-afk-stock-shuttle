"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { crearCliente } from "@/lib/store";
import type { Cliente, TipoDocumento } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NuevoLeadPage() {
  const router = useRouter();
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [form, setForm] = useState({
    nombreCompleto: "", documento: "", tipoDocumento: "DNI" as TipoDocumento,
    telefono: "", email: "", origenDato: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [existente, setExistente] = useState<Cliente | null>(null);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "leads.crear")) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Tu rol no puede crear leads.</CardDescription>
      </CardHeader></Card>
    );
  }

  // Recepción: email y origen del dato son obligatorios (CLAUDE.md §4.2).
  const esRecepcion = usuarioActivo.roles.includes("recepcion");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistente(null);
    if (!empresaActivaId) { setError("Seleccioná una empresa arriba."); return; }
    if (!form.nombreCompleto.trim()) { setError("El nombre es obligatorio."); return; }
    if (esRecepcion && !form.email.trim()) { setError("Para recepción, el email es obligatorio."); return; }
    if (esRecepcion && !form.origenDato.trim()) { setError("Para recepción, el origen del dato es obligatorio."); return; }

    const r = crearCliente({
      empresaId: empresaActivaId,
      nombreCompleto: form.nombreCompleto,
      documento: form.documento.trim() || null,
      tipoDocumento: form.documento.trim() ? form.tipoDocumento : null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      origenDato: form.origenDato.trim() || null,
      vendedorId: usuarioActivo.roles.includes("vendedor") ? usuarioActivo.id : null,
      gestionId: usuarioActivo.tipoPerfil === "terciarizada" ? usuarioActivo.gestionId ?? null : null,
    });
    if (r.ok && r.cliente) {
      router.push(`/clientes/${r.cliente.id}`);
    } else {
      setError(r.error ?? "No se pudo crear el lead.");
      setExistente(r.existente ?? null);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Nuevo lead</h1>
        <p className="text-muted-foreground">Cargá un cliente nuevo. El documento no puede repetirse.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={guardar} className="space-y-4">
            <Campo label="Nombre y apellido *">
              <Input value={form.nombreCompleto} onChange={(e) => set("nombreCompleto", e.target.value)} autoFocus />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo label="Tipo">
                <select value={form.tipoDocumento} onChange={(e) => set("tipoDocumento", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="DNI">DNI</option>
                  <option value="CUIT">CUIT</option>
                </select>
              </Campo>
              <div className="sm:col-span-2">
                <Campo label="Documento (DNI/CUIT)">
                  <Input value={form.documento} onChange={(e) => set("documento", e.target.value)} />
                </Campo>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Teléfono"><Input value={form.telefono} onChange={(e) => set("telefono", e.target.value)} /></Campo>
              <Campo label={`Email${esRecepcion ? " *" : ""}`}><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Campo>
            </div>
            <Campo label={`Origen del dato${esRecepcion ? " *" : ""}`}>
              <Input value={form.origenDato} onChange={(e) => set("origenDato", e.target.value)} placeholder="Ej: web, referido, llamado entrante…" />
            </Campo>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                <p>{error}</p>
                {existente && (
                  <Link href={`/clientes/${existente.id}`} className="mt-1 inline-block font-medium underline">
                    Abrir la ficha de {existente.nombreCompleto} →
                  </Link>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit">Crear lead</Button>
              <Link href="/clientes"><Button type="button" variant="outline">Cancelar</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
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
