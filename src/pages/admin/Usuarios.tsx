import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { getRol, ROLES_DEFAULT } from "@/auth/rolesStore";
import { EMPRESAS, USUARIOS } from "@/data/demo";
import { borrarPerfil, guardarPerfil, usePerfiles, type Perfil } from "@/data/perfilesStore";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const VACIO: Perfil = { email: "", nombre: "", rol_id: "responsable", scope: "empresas", empresa_ids: [], cargo: "", activo: true };

function nombreEmpresas(ids: string[]): string {
  if (ids.length === 0) return "—";
  return ids.map((id) => EMPRESAS.find((e) => e.id === id)?.nombre ?? id).join(", ");
}

function EditorPerfil({
  inicial,
  esNuevo,
  onClose,
}: {
  inicial: Perfil;
  esNuevo: boolean;
  onClose: () => void;
}) {
  const [p, setP] = useState<Perfil>(inicial);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!p.email.trim() || !p.nombre.trim()) {
      toast.error("Email y nombre son obligatorios");
      return;
    }
    setGuardando(true);
    try {
      await guardarPerfil(p);
      toast.success(esNuevo ? "Perfil creado" : "Perfil actualizado");
      onClose();
    } catch (e) {
      toast.error("No se pudo guardar", { description: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{esNuevo ? "Nuevo perfil de usuario" : "Editar perfil"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {esNuevo && (
            <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-700">
              Importante: primero creá el usuario en Supabase → Authentication → Add user con este email y
              una contraseña. Acá definís su perfil y permisos.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={p.email} disabled={!esNuevo} onChange={(e) => setP({ ...p, email: e.target.value })} placeholder="persona@empresa.com.ar" />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} placeholder="Nombre y apellido" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={p.rol_id} onValueChange={(v) => setP({ ...p, rol_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES_DEFAULT.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input value={p.cargo} onChange={(e) => setP({ ...p, cargo: e.target.value })} placeholder="ej. Controller" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Alcance</Label>
            <Select value={p.scope} onValueChange={(v) => setP({ ...p, scope: v as Perfil["scope"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grupo">Todo el grupo (consolidado)</SelectItem>
                <SelectItem value="empresas">Empresas puntuales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {p.scope === "empresas" && (
            <div className="space-y-1.5">
              <Label>Empresas que puede ver</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-2">
                {EMPRESAS.map((e) => (
                  <label key={e.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={p.empresa_ids.includes(e.id)}
                      onCheckedChange={(c) =>
                        setP({
                          ...p,
                          empresa_ids: c ? [...p.empresa_ids, e.id] : p.empresa_ids.filter((x) => x !== e.id),
                        })
                      }
                    />
                    {e.nombre}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between rounded-md border p-2.5">
            <Label className="cursor-pointer">Usuario activo</Label>
            <Switch checked={p.activo} onCheckedChange={(c) => setP({ ...p, activo: c })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Usuarios() {
  const { modoReal, usuario } = useAuth();
  const { perfiles, cargando, error } = usePerfiles();
  const [editar, setEditar] = useState<{ p: Perfil; nuevo: boolean } | null>(null);

  // En modo demo (sin Supabase) seguimos mostrando los usuarios de ejemplo.
  const filas: Perfil[] = modoReal
    ? perfiles
    : USUARIOS.map((u) => ({ email: u.email, nombre: u.nombre, rol_id: u.rolId, scope: u.scope, empresa_ids: u.empresaIds, cargo: u.cargo, activo: u.activo }));

  const esAdmin = usuario?.rolId === "superadmin";
  const gestionable = modoReal && esAdmin;

  async function eliminar(p: Perfil) {
    if (!confirm(`¿Quitar el perfil de ${p.nombre}? No podrá ingresar al sistema.`)) return;
    try {
      await borrarPerfil(p.email);
      toast.success("Perfil eliminado");
    } catch (e) {
      toast.error("No se pudo eliminar", { description: (e as Error).message });
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Quién accede, con qué rol y a qué empresas. El acceso a los datos se controla por estas asignaciones."
        action={
          gestionable ? (
            <Button onClick={() => setEditar({ p: { ...VACIO }, nuevo: true })}>
              <Plus className="mr-1.5 h-4 w-4" /> Nuevo perfil
            </Button>
          ) : undefined
        }
      />

      {!modoReal && (
        <p className="mb-3 text-sm text-muted-foreground">
          Modo demostración: estos usuarios son de ejemplo. En producción gestionás los perfiles reales acá.
        </p>
      )}
      {error && <p className="mb-3 text-sm text-destructive">Error: {error}</p>}

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
                  {gestionable && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargando ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Cargando…
                    </TableCell>
                  </TableRow>
                ) : filas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Sin usuarios. Creá el primero con «Nuevo perfil».
                    </TableCell>
                  </TableRow>
                ) : (
                  filas.map((p) => (
                    <TableRow key={p.email}>
                      <TableCell>
                        <div className="font-medium">{p.nombre}</div>
                        <div className="text-xs text-muted-foreground">{p.email}{p.cargo ? ` · ${p.cargo}` : ""}</div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{getRol(p.rol_id)?.nombre ?? p.rol_id}</Badge></TableCell>
                      <TableCell>
                        {p.scope === "grupo" ? <Badge>Grupo</Badge> : <Badge variant="outline">Por empresa</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                        {p.scope === "grupo" ? "Todas (grupo)" : nombreEmpresas(p.empresa_ids)}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.activo
                          ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Activo</Badge>
                          : <Badge variant="outline">Inactivo</Badge>}
                      </TableCell>
                      {gestionable && (
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditar({ p, nuevo: false })}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {p.email !== usuario?.email && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => eliminar(p)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {editar && <EditorPerfil inicial={editar.p} esNuevo={editar.nuevo} onClose={() => setEditar(null)} />}
    </div>
  );
}
