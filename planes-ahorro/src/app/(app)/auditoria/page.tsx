"use client";

// Auditoría: registro de acciones sensibles (importaciones, deshacer/limpieza,
// usuarios, ventas cerradas, campañas, comisiones, edición de empresas).
// El log es de solo agregado: nadie puede editarlo ni borrarlo desde la app.

import { useEffect, useMemo, useState } from "react";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { suscribir, inicializar, listarAuditoria, ACCION_AUDITORIA_LABEL } from "@/lib/store";
import { exportarExcel } from "@/lib/exportar";
import { fechaHora } from "@/lib/labels";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ScrollText } from "lucide-react";

export default function AuditoriaPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);
  const [accion, setAccion] = useState("todas");
  const [texto, setTexto] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const registros = useMemo(() => {
    if (!empresaActivaId) return [];
    let lista = listarAuditoria(empresaActivaId);
    if (accion !== "todas") lista = lista.filter((r) => r.accion === accion);
    if (desde) lista = lista.filter((r) => r.fecha.slice(0, 10) >= desde);
    if (hasta) lista = lista.filter((r) => r.fecha.slice(0, 10) <= hasta);
    const t = texto.trim().toLowerCase();
    if (t) lista = lista.filter((r) => r.detalle.toLowerCase().includes(t) || r.usuarioNombre.toLowerCase().includes(t));
    return lista;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaActivaId, accion, texto, desde, hasta, tick]);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "auditoria.ver")) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>La auditoría es del super admin, supervisor de administración y gerencia.</CardDescription>
      </CardHeader></Card>
    );
  }

  const exportar = () =>
    exportarExcel(
      registros.map((r) => ({
        "Fecha": fechaHora(r.fecha),
        "Usuario": r.usuarioNombre,
        "Acción": ACCION_AUDITORIA_LABEL[r.accion] ?? r.accion,
        "Detalle": r.detalle,
      })),
      "auditoria"
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><ScrollText className="h-6 w-6" /> Auditoría</h1>
          <p className="text-muted-foreground">
            Quién hizo qué y cuándo: importaciones, deshacer/limpiezas, usuarios, ventas, campañas y comisiones.
            El registro no se puede editar ni borrar.
          </p>
        </div>
        <Button variant="outline" onClick={exportar} disabled={registros.length === 0}>
          <Download className="h-4 w-4" /> Excel
        </Button>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Acción</span>
            <select value={accion} onChange={(e) => setAccion(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="todas">Todas</option>
              {Object.entries(ACCION_AUDITORIA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Desde</span>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Hasta</span>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          </label>
          <label className="grow space-y-1 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">Buscar (usuario o detalle)</span>
            <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej: Novedades, María…" />
          </label>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registros.slice(0, 200).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{fechaHora(r.fecha)}</TableCell>
                <TableCell className="font-medium">{r.usuarioNombre}</TableCell>
                <TableCell><Badge variant="secondary">{ACCION_AUDITORIA_LABEL[r.accion] ?? r.accion}</Badge></TableCell>
                <TableCell>{r.detalle}</TableCell>
              </TableRow>
            ))}
            {registros.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Sin registros todavía. Las acciones sensibles van a ir apareciendo acá.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {registros.length > 200 && (
          <p className="p-3 text-sm text-muted-foreground">Mostrando 200 de {registros.length}. Bajá el Excel para el listado completo.</p>
        )}
      </Card>
    </div>
  );
}
