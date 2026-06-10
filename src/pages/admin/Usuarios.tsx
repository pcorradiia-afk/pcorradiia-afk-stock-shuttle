import { Plus } from "lucide-react";
import { getRol } from "@/auth/permissions";
import { EMPRESAS, USUARIOS } from "@/data/demo";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function Usuarios() {
  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Quién accede, con qué rol y a qué empresas. El acceso a los datos se controla por estas asignaciones."
        action={
          <Button>
            <Plus className="mr-1.5 h-4 w-4" />
            Invitar usuario
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Alcance</TableHead>
                  <TableHead>Empresas</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {USUARIOS.map((u) => {
                  const rol = getRol(u.rolId);
                  const empresas =
                    u.scope === "grupo"
                      ? "Todas (grupo)"
                      : u.empresaIds.map((id) => EMPRESAS.find((e) => e.id === id)?.nombre).join(", ");
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium">{u.nombre}</div>
                        <div className="text-xs text-muted-foreground">{u.email} · {u.cargo}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{rol?.nombre}</Badge></TableCell>
                      <TableCell>
                        {u.scope === "grupo"
                          ? <Badge>Grupo</Badge>
                          : <Badge variant="outline">Por empresa</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[260px] text-sm text-muted-foreground">{empresas}</TableCell>
                      <TableCell className="text-center">
                        {u.activo
                          ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
                          : <Badge variant="outline">Inactivo</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
