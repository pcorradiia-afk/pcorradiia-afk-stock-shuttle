"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { inicializar, listarClientes, suscribir, type FiltroClientes } from "@/lib/store";
import { ESTADIO_LABEL, ESTADO_LABEL, ESTADIOS } from "@/lib/labels";
import type { Cliente } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload } from "lucide-react";

export default function ClientesPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<FiltroClientes["estado"]>("todos");
  const [estadio, setEstadio] = useState<FiltroClientes["estadio"]>("todos");
  const [, setTick] = useState(0);

  useEffect(() => {
    inicializar();
    return suscribir(() => setTick((t) => t + 1));
  }, []);

  const clientes = useMemo<Cliente[]>(
    () => (empresaActivaId ? listarClientes(empresaActivaId, { texto, estado, estadio }) : []),
    [empresaActivaId, texto, estado, estadio]
  );

  if (!usuarioActivo) return null;
  const puedeImportar = tienePermiso(usuarioActivo.roles, "importar");
  const puedeCrear = tienePermiso(usuarioActivo.roles, "leads.crear");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ahorristas</h1>
          <p className="text-muted-foreground">Clientes y leads de la empresa seleccionada.</p>
        </div>
        <div className="flex gap-2">
          {puedeImportar && (
            <Link href="/importar"><Button variant="outline"><Upload className="h-4 w-4" /> Importar cartera</Button></Link>
          )}
          {puedeCrear && (
            <Link href="/clientes/nuevo"><Button><Plus className="h-4 w-4" /> Nuevo lead</Button></Link>
          )}
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por nombre, documento o N° de solicitud…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="max-w-sm"
          />
          <select value={estado} onChange={(e) => setEstado(e.target.value as FiltroClientes["estado"])} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="todos">Todos los estados</option>
            {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={estadio} onChange={(e) => setEstadio(e.target.value as FiltroClientes["estadio"])} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="todos">Todos los estadios</option>
            {ESTADIOS.map((e) => <option key={e} value={e}>{ESTADIO_LABEL[e]}</option>)}
          </select>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>N° solicitud</TableHead>
              <TableHead>Plan / Modelo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Estadio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/clientes/${c.id}`} className="hover:underline">{c.nombreCompleto}</Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.documento ?? "—"}</TableCell>
                <TableCell>{c.solicitud.nroSolicitud ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.solicitud.plan ?? "—"}{c.solicitud.modelo ? ` / ${c.solicitud.modelo}` : ""}
                </TableCell>
                <TableCell><Badge variant="secondary">{ESTADO_LABEL[c.estado]}</Badge></TableCell>
                <TableCell><Badge variant="outline">{ESTADIO_LABEL[c.estadio]}</Badge></TableCell>
              </TableRow>
            ))}
            {clientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No hay ahorristas para los filtros actuales.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <p className="text-sm text-muted-foreground">{clientes.length} registro(s).</p>
    </div>
  );
}
