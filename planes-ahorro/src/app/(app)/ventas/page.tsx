"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { inicializar, listarClientes, vendedoresDeEmpresa, suscribir } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function VentasPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const datos = useMemo(() => {
    if (!empresaActivaId || !usuarioActivo) return { porVendedor: [], pendientes: [], totalLeads: 0, totalVendidos: 0 };
    const clientes = listarClientes(empresaActivaId, {}, usuarioActivo);
    const vendedores = vendedoresDeEmpresa(empresaActivaId);
    const porVendedor = vendedores.map((v) => {
      const suyos = clientes.filter((c) => c.vendedorId === v.id);
      const vendidos = suyos.filter((c) => c.estado === "vendido").length;
      const leads = suyos.length;
      return { vendedor: v, leads, vendidos, efectividad: leads ? Math.round((vendidos / leads) * 100) : 0 };
    });
    const pendientes = clientes.filter((c) => c.estado === "lead" && !c.vendedorId);
    return {
      porVendedor,
      pendientes,
      totalLeads: clientes.filter((c) => c.estado === "lead").length,
      totalVendidos: clientes.filter((c) => c.estado === "vendido").length,
    };
  }, [empresaActivaId, usuarioActivo, tick]);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "ventas.supervisar")) {
    return <Card><CardHeader><CardTitle>Sin acceso</CardTitle><CardDescription>Tu rol no puede ver la supervisión de ventas.</CardDescription></CardHeader></Card>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Supervisión de ventas</h1>
        <p className="text-muted-foreground">Rendimiento del equipo, efectividad y leads pendientes de gestión.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi t="Leads activos" v={datos.totalLeads} />
        <Kpi t="Ventas cerradas" v={datos.totalVendidos} />
        <Kpi t="Leads sin asignar" v={datos.pendientes.length} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Por vendedor</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-center">Vendidos</TableHead>
                <TableHead className="text-center">Efectividad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos.porVendedor.map((r) => (
                <TableRow key={r.vendedor.id}>
                  <TableCell className="font-medium">{r.vendedor.nombre}</TableCell>
                  <TableCell className="text-center">{r.leads}</TableCell>
                  <TableCell className="text-center">{r.vendidos}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={r.efectividad >= 50 ? "success" : "secondary"}>{r.efectividad}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {datos.porVendedor.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-6 text-center text-muted-foreground">No hay vendedores en esta empresa.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads pendientes de asignar</CardTitle>
          <CardDescription>Leads sin vendedor asignado. Abrí la ficha para asignarlos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nombre</TableHead><TableHead>Origen</TableHead><TableHead>Alta</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {datos.pendientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium"><Link href={`/clientes/${c.id}`} className="hover:underline">{c.nombreCompleto}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{c.origenDato ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(c.fechaAlta).toLocaleDateString("es-AR")}</TableCell>
                </TableRow>
              ))}
              {datos.pendientes.length === 0 && (
                <TableRow><TableCell colSpan={3} className="py-6 text-center text-muted-foreground">No hay leads pendientes. 👌</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ t, v }: { t: string; v: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{t}</CardDescription>
        <CardTitle className="text-3xl">{v}</CardTitle>
      </CardHeader>
    </Card>
  );
}
