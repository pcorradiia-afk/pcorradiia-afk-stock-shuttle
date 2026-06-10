import { Check, Minus } from "lucide-react";
import { PERMISOS, ROLES, TODOS_LOS_PERMISOS } from "@/auth/permissions";
import { PageHeader } from "@/components/ui-kit";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ETIQUETAS: Record<string, string> = {
  [PERMISOS.DASHBOARD_VER]: "Ver tablero",
  [PERMISOS.RENTABILIDAD_VER]: "Ver rentabilidad",
  [PERMISOS.COMERCIAL_VER]: "Ver ventas",
  [PERMISOS.CC_VER]: "Ver cuentas corrientes",
  [PERMISOS.AUDITORIA_VER]: "Ver auditoría",
  [PERMISOS.AUDITORIA_GESTIONAR]: "Gestionar hallazgos",
  [PERMISOS.IMPORTAR_EJECUTAR]: "Importar del DMS",
  [PERMISOS.ADMIN_EMPRESAS]: "Administrar empresas",
  [PERMISOS.ADMIN_USUARIOS]: "Administrar usuarios",
  [PERMISOS.ADMIN_ROLES]: "Administrar roles",
};

export function Roles() {
  return (
    <div>
      <PageHeader
        title="Roles y permisos"
        description="Matriz de permisos por rol. Define qué puede ver y hacer cada perfil en el sistema."
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Permiso</TableHead>
                  {ROLES.map((r) => (
                    <TableHead key={r.id} className="text-center">{r.nombre}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {TODOS_LOS_PERMISOS.map((p) => (
                  <TableRow key={p}>
                    <TableCell className="font-medium">{ETIQUETAS[p] ?? p}</TableCell>
                    {ROLES.map((r) => (
                      <TableCell key={r.id} className="text-center">
                        {r.permisos.includes(p) ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-600" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="font-semibold">{r.nombre}</div>
              <p className="mt-1 text-sm text-muted-foreground">{r.descripcion}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
