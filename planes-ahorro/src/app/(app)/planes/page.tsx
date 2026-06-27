"use client";

import { useEffect, useMemo, useState } from "react";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { inicializar, listarPlanes, crearPlan, suscribir } from "@/lib/store";
import type { Plan } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

export default function PlanesPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);
  const [form, setForm] = useState({ codigo: "", nombre: "", modelo: "", cuotas: "" });
  const [abrir, setAbrir] = useState(false);

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const planes = useMemo<Plan[]>(
    () => (empresaActivaId ? listarPlanes(empresaActivaId) : []),
    [empresaActivaId, tick]
  );

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "clientes.ver")) {
    return <Card><CardHeader><CardTitle>Sin acceso</CardTitle></CardHeader></Card>;
  }
  const puedeGestionar = tienePermiso(usuarioActivo.roles, "planes.gestionar");

  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaActivaId || !form.codigo.trim() || !form.nombre.trim()) return;
    crearPlan({
      empresaId: empresaActivaId,
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      modelo: form.modelo.trim(),
      cuotas: form.cuotas ? Number(form.cuotas) : null,
      activo: true,
    });
    setForm({ codigo: "", nombre: "", modelo: "", cuotas: "" });
    setAbrir(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de planes</h1>
          <p className="text-muted-foreground">Planes disponibles para la venta. El vendedor elige de esta lista.</p>
        </div>
        {puedeGestionar && (
          <Button onClick={() => setAbrir((v) => !v)}><Plus className="h-4 w-4" /> Nuevo plan</Button>
        )}
      </div>

      {abrir && puedeGestionar && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuevo plan</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={agregar} className="grid gap-3 sm:grid-cols-4">
              <Input placeholder="Código (ej. R120)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              <Input placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              <Input placeholder="Modelo" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
              <Input placeholder="Cuotas" type="number" value={form.cuotas} onChange={(e) => setForm({ ...form, cuotas: e.target.value })} />
              <div className="sm:col-span-4"><Button type="submit">Agregar plan</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Cuotas</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planes.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.codigo}</TableCell>
                <TableCell>{p.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{p.modelo}</TableCell>
                <TableCell>{p.cuotas ?? "—"}</TableCell>
                <TableCell>{p.activo ? <Badge variant="success">activo</Badge> : <Badge variant="outline">inactivo</Badge>}</TableCell>
              </TableRow>
            ))}
            {planes.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay planes cargados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
