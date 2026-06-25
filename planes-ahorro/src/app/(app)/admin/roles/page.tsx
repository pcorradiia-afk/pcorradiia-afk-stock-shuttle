"use client";

import { useSesion } from "@/lib/session";
import { tienePermiso, ROLES, MATRIZ_PERMISOS, type RolId } from "@/lib/roles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLS: { id: RolId; corto: string }[] = [
  { id: "super_admin", corto: "Super Admin" },
  { id: "recepcion", corto: "Recepción" },
  { id: "vendedor", corto: "Vendedor" },
  { id: "supervisor_ventas", corto: "Sup. Ventas" },
  { id: "administracion", corto: "Administr." },
  { id: "supervisor_administracion", corto: "Sup. Admin." },
  { id: "entregas", corto: "Entregas" },
  { id: "analista_suscripciones", corto: "Analista" },
  { id: "gerencia", corto: "Gerencia" },
];

export default function RolesPage() {
  const { usuarioActivo } = useSesion();
  if (!usuarioActivo) return null;

  if (!tienePermiso(usuarioActivo.roles, "config.roles")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin acceso</CardTitle>
          <CardDescription>Tu rol no tiene permiso para ver esta sección.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles y permisos</h1>
        <p className="text-muted-foreground">
          Matriz Rol × Acción del sistema. Es la referencia para la seguridad (que además se aplica
          con Row Level Security en Supabase).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles funcionales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r.id} className="rounded-md border p-3">
              <p className="font-medium">{r.nombre}</p>
              <p className="text-sm text-muted-foreground">{r.descripcion}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matriz Rol × Acción</CardTitle>
          <CardDescription>V = ver · C = crear · E = editar · X = eliminar · ✔ = permitido · — = sin acceso</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Acción / recurso</TableHead>
                {COLS.map((c) => (
                  <TableHead key={c.id} className="text-center text-xs">{c.corto}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {MATRIZ_PERMISOS.map((fila) => (
                <TableRow key={fila.accion}>
                  <TableCell className="font-medium">{fila.accion}</TableCell>
                  {COLS.map((c) => {
                    const v = fila.niveles[c.id];
                    return (
                      <TableCell key={c.id} className="text-center text-xs">
                        {v ? <span className="font-medium">{v}</span> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
