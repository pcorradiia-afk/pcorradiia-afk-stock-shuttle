"use client";

import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/session";
import { tienePermiso, nombreRol } from "@/lib/roles";
import { empresaPorId } from "@/lib/demo-data";
import { listarUsuariosCache } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCog } from "lucide-react";

export default function UsuariosPage() {
  const router = useRouter();
  const { usuarioActivo, usuarioReal, impersonar } = useSesion();
  if (!usuarioActivo) return null;

  if (!tienePermiso(usuarioActivo.roles, "config.usuarios")) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sin acceso</CardTitle>
          <CardDescription>Tu rol no tiene permiso para ver esta sección.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const puedeImpersonar = !!usuarioReal && tienePermiso(usuarioReal.roles, "impersonar");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground">
          Usuarios del sistema, sus roles, empresa y tipo de perfil. El super admin puede impersonar
          para verificar la configuración de cada uno.
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Estado</TableHead>
              {puedeImpersonar && <TableHead className="text-right">Acción</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {listarUsuariosCache().map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{empresaPorId(u.empresaId)?.nombreComercial}</TableCell>
                <TableCell>
                  <Badge variant={u.tipoPerfil === "terciarizada" ? "warning" : "secondary"}>
                    {u.tipoPerfil}
                  </Badge>
                </TableCell>
                <TableCell className="flex flex-wrap gap-1">
                  {u.roles.map((r) => <Badge key={r}>{nombreRol(r)}</Badge>)}
                </TableCell>
                <TableCell>
                  {u.activo ? <Badge variant="success">activo</Badge> : <Badge variant="outline">inactivo</Badge>}
                </TableCell>
                {puedeImpersonar && (
                  <TableCell className="text-right">
                    {u.id !== usuarioReal?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { impersonar(u.id); router.push("/dashboard"); }}
                      >
                        <UserCog className="h-4 w-4" /> Impersonar
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="text-sm text-muted-foreground">
        El alta/baja y edición de usuarios y la asignación de estadios se habilitan con backend real.
      </p>
    </div>
  );
}
