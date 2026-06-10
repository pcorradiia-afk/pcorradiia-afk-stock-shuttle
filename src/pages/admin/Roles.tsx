import { useState } from "react";
import { Check, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  PERMISO_LABEL,
  PERMISOS,
  PERMISOS_AGRUPADOS,
  TODOS_LOS_PERMISOS,
} from "@/auth/permissions";
import { addRole, deleteRole, esRolDefault, useRoles } from "@/auth/rolesStore";
import { useAuth } from "@/auth/AuthContext";
import type { Permiso } from "@/types";
import { Can } from "@/components/PermissionGate";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function NuevoRolDialog() {
  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [permisos, setPermisos] = useState<Set<Permiso>>(new Set());

  function reset() {
    setNombre("");
    setDescripcion("");
    setPermisos(new Set());
  }

  function toggle(p: Permiso, on: boolean) {
    setPermisos((prev) => {
      const next = new Set(prev);
      if (on) next.add(p);
      else next.delete(p);
      return next;
    });
  }

  function toggleGrupo(ps: Permiso[], on: boolean) {
    setPermisos((prev) => {
      const next = new Set(prev);
      ps.forEach((p) => (on ? next.add(p) : next.delete(p)));
      return next;
    });
  }

  function crear() {
    if (!nombre.trim()) {
      toast.error("Poné un nombre para el rol.");
      return;
    }
    if (permisos.size === 0) {
      toast.error("Seleccioná al menos un permiso.");
      return;
    }
    addRole({ nombre, descripcion, permisos: [...permisos] });
    toast.success(`Rol "${nombre.trim()}" creado.`);
    reset();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        Nuevo rol
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear rol</DialogTitle>
          <DialogDescription>
            Definí el nombre y tildá los permisos que tendrá este rol.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rol-nombre">Nombre del rol</Label>
            <Input
              id="rol-nombre"
              placeholder="Ej: Tesorería, Gerente comercial…"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rol-desc">Descripción (opcional)</Label>
            <Input
              id="rol-desc"
              placeholder="Qué hace este rol"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Permisos</Label>
            {PERMISOS_AGRUPADOS.map(({ grupo, permisos: ps }) => {
              const todos = ps.every((p) => permisos.has(p));
              return (
                <div key={grupo} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {grupo}
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => toggleGrupo(ps, !todos)}
                    >
                      {todos ? "Quitar todos" : "Seleccionar todos"}
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ps.map((p) => (
                      <label key={p} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={permisos.has(p)}
                          onCheckedChange={(c) => toggle(p, c === true)}
                        />
                        {PERMISO_LABEL[p] ?? p}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={crear}>Crear rol</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Roles() {
  const roles = useRoles();
  const { can } = useAuth();
  const puedeAdministrar = can(PERMISOS.ADMIN_ROLES);

  return (
    <div>
      <PageHeader
        title="Roles y permisos"
        description="Matriz de permisos por rol. Define qué puede ver y hacer cada perfil en el sistema."
        action={<Can permiso={PERMISOS.ADMIN_ROLES}><NuevoRolDialog /></Can>}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Permiso</TableHead>
                  {roles.map((r) => (
                    <TableHead key={r.id} className="text-center">
                      <span className="inline-flex items-center gap-1">
                        {r.nombre}
                        {!esRolDefault(r.id) && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" title="Rol personalizado" />
                        )}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {TODOS_LOS_PERMISOS.map((p) => (
                  <TableRow key={p}>
                    <TableCell className="font-medium">{PERMISO_LABEL[p] ?? p}</TableCell>
                    {roles.map((r) => (
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
        {roles.map((r) => {
          const custom = !esRolDefault(r.id);
          return (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {r.nombre}
                  </div>
                  {custom ? (
                    <Badge variant="secondary">Personalizado</Badge>
                  ) : (
                    <Badge variant="outline">Predefinido</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {r.descripcion || "Sin descripción."}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {r.permisos.length} permiso(s)
                </p>
                {custom && puedeAdministrar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 px-2 text-destructive hover:text-destructive"
                    onClick={() => {
                      deleteRole(r.id);
                      toast.success(`Rol "${r.nombre}" eliminado.`);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Eliminar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
