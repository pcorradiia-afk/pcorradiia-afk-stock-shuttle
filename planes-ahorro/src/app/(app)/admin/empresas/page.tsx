"use client";

import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import { EMPRESAS, SUCURSALES, EQUIPOS, sucursalesDeEmpresa } from "@/lib/demo-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function EmpresasPage() {
  const { usuarioActivo } = useSesion();
  if (!usuarioActivo) return null;

  if (!tienePermiso(usuarioActivo.roles, "config.empresas")) {
    return <SinAcceso />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Empresas</h1>
        <p className="text-muted-foreground">Empresas del grupo, sus sucursales y equipos.</p>
      </div>

      {EMPRESAS.map((e) => (
        <Card key={e.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {e.nombre}
              <Badge variant="secondary">{e.nombreComercial}</Badge>
            </CardTitle>
            <CardDescription>CUIT {e.cuit}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Equipos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sucursalesDeEmpresa(e.id).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {EQUIPOS.filter((q) => q.sucursalId === s.id).map((q) => (
                        <Badge key={q.id} variant={q.tipo === "ventas" ? "default" : "secondary"}>
                          {q.nombre}
                        </Badge>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      <p className="text-sm text-muted-foreground">
        El alta/edición de empresas, sucursales y equipos se habilita con backend real (Supabase).
      </p>
    </div>
  );
}

function SinAcceso() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Tu rol no tiene permiso para ver esta sección.</CardDescription>
      </CardHeader>
    </Card>
  );
}
