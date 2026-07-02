"use client";

import { useEffect, useMemo, useState } from "react";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { inicializar, suscribir, listarCtaCte } from "@/lib/store";
import { exportarExcel } from "@/lib/exportar";
import { pesos } from "@/lib/labels";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Landmark } from "lucide-react";

export default function CtaCtePage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);
  const [codigo, setCodigo] = useState("todos");

  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  const movimientos = useMemo(
    () => (empresaActivaId ? listarCtaCte(empresaActivaId) : []),
    [empresaActivaId, tick]
  );
  const codigos = useMemo(() => Array.from(new Set(movimientos.map((m) => m.codigo))).sort(), [movimientos]);
  const filtrados = codigo === "todos" ? movimientos : movimientos.filter((m) => m.codigo === codigo);

  const totales = useMemo(() => {
    const porCodigo = new Map<string, { descripcion: string; cantidad: number; total: number }>();
    for (const m of movimientos) {
      const signo = m.dc === "D" ? 1 : -1; // D = cargo (debe), C = a favor (haber)
      const cur = porCodigo.get(m.codigo) ?? { descripcion: m.descripcion, cantidad: 0, total: 0 };
      cur.cantidad++;
      cur.total += signo * Math.abs(m.importe);
      porCodigo.set(m.codigo, cur);
    }
    return Array.from(porCodigo.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [movimientos]);
  const saldo = totales.reduce((acc, [, t]) => acc + t.total, 0);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "importar") && !tienePermiso(usuarioActivo.roles, "informes.ver")) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Tu rol no puede ver la cuenta corriente.</CardDescription>
      </CardHeader></Card>
    );
  }

  const exportar = () =>
    exportarExcel(
      filtrados.map((m) => ({
        "Fecha": m.fecha,
        "Código": m.codigo,
        "Descripción": m.descripcion,
        "D/C": m.dc,
        "Importe": m.importe,
        "Grupo": m.grupo ?? "",
        "Orden": m.orden ?? "",
        "Referencia": m.referencia,
      })),
      "cta-cte-concesionaria"
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Landmark className="h-6 w-6" /> Cuenta corriente</h1>
          <p className="text-muted-foreground">
            Movimientos de la concesionaria con la administradora (Plan Óvalo). No es la deuda del cliente.
          </p>
        </div>
        <Button variant="outline" onClick={exportar}><Download className="h-4 w-4" /> Excel</Button>
      </div>

      {movimientos.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sin movimientos</CardTitle>
            <CardDescription>Importá un archivo <strong>cta_cte_*.txt</strong> desde “Importar archivos”.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen por concepto</CardTitle>
              <CardDescription>
                Cargos (D) positivos, créditos (C) a favor. Neto del período:{" "}
                <strong className={saldo <= 0 ? "text-emerald-700" : "text-destructive"}>{pesos(Math.round(saldo))}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Movimientos</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {totales.map(([cod, t]) => (
                    <TableRow key={cod}>
                      <TableCell className="font-medium">{cod}</TableCell>
                      <TableCell className="text-muted-foreground">{t.descripcion}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.cantidad}</TableCell>
                      <TableCell className={`text-right tabular-nums ${t.total <= 0 ? "text-emerald-700" : ""}`}>{pesos(Math.round(t.total))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Movimientos ({filtrados.length})</CardTitle>
              <select value={codigo} onChange={(e) => setCodigo(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="todos">Todos los códigos</option>
                {codigos.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>D/C</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>Grupo/Orden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.slice(0, 100).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">{m.fecha}</TableCell>
                      <TableCell className="font-medium">{m.codigo}</TableCell>
                      <TableCell>{m.descripcion}</TableCell>
                      <TableCell><Badge variant={m.dc === "C" ? "success" : "secondary"}>{m.dc}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{pesos(Math.round(Math.abs(m.importe)))}</TableCell>
                      <TableCell className="text-muted-foreground">{m.grupo ? `${m.grupo}/${m.orden}` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtrados.length > 100 && (
                <p className="mt-2 text-sm text-muted-foreground">Mostrando 100 de {filtrados.length}. Exportá a Excel para el detalle completo.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
