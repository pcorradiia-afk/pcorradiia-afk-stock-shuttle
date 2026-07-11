"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/session";
import { tienePermiso, nombreRol, ROLES } from "@/lib/roles";
import { listarUsuariosCache, listarEmpresas, empresaPorId } from "@/lib/store";
import { getSupabase, MODO_DEMO } from "@/lib/supabase/client";
import { cargarUsuarios } from "@/lib/supabase/sync";
import type { RolId } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCog, UserPlus } from "lucide-react";

const FORM_INICIAL = {
  nombre: "",
  email: "",
  password: "",
  empresa: "pc",
  tipo: "concesionario" as "concesionario" | "terciarizada",
  gestion: "",
  roles: [] as RolId[],
  otraEmpresa: false,
};

async function llamarApi(
  metodo: "POST" | "PATCH",
  body: unknown,
): Promise<{ ok: boolean; mensaje: string; yaExistia?: boolean }> {
  const sesion = await getSupabase()?.auth.getSession();
  const jwt = sesion?.data.session?.access_token;
  if (!jwt) return { ok: false, mensaje: "Sin sesión activa. Volvé a iniciar sesión." };
  try {
    const resp = await fetch("/api/usuarios", {
      method: metodo,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify(body),
    });
    const data = (await resp.json()) as { ok?: boolean; error?: string; detalle?: string; yaExistiaCredencial?: boolean };
    if (!resp.ok || !data.ok) return { ok: false, mensaje: data.error ?? `Error HTTP ${resp.status}` };
    return { ok: true, mensaje: data.detalle ?? "Listo.", yaExistia: data.yaExistiaCredencial };
  } catch (e) {
    return { ok: false, mensaje: `Fallo de red: ${(e as Error).message}` };
  }
}

export default function UsuariosPage() {
  const router = useRouter();
  const { usuarioActivo, usuarioReal, impersonar } = useSesion();
  const [, setTick] = useState(0);
  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [togglingEmail, setTogglingEmail] = useState<string | null>(null);

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
  // El alta/baja real requiere backend (Supabase); en modo demo se explica y se oculta.
  const puedeGestionar = !MODO_DEMO && !!usuarioReal && usuarioReal.roles.includes("super_admin");

  async function crearUsuario() {
    setAviso(null);
    if (!form.nombre.trim() || !form.email.trim()) {
      setAviso({ tipo: "error", texto: "Completá nombre y email." });
      return;
    }
    if (form.password.length < 8) {
      setAviso({ tipo: "error", texto: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    if (form.roles.length === 0) {
      setAviso({ tipo: "error", texto: "Elegí al menos un rol." });
      return;
    }
    if (form.tipo === "terciarizada" && !form.gestion.trim()) {
      setAviso({ tipo: "error", texto: "Una terciarizada necesita el nombre de su gestión (ej: \"Gestión Sur\")." });
      return;
    }
    setGuardando(true);
    const res = await llamarApi("POST", {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      password: form.password,
      empresa: form.empresa,
      tipo: form.tipo,
      gestion: form.tipo === "terciarizada" ? form.gestion.trim() : null,
      roles: form.roles,
      empresasExtra: form.otraEmpresa ? listarEmpresas().map((e) => e.id).filter((id) => id !== form.empresa) : [],
    });
    if (res.ok) {
      await cargarUsuarios();
      setTick((t) => t + 1);
      setForm(FORM_INICIAL);
      setMostrarAlta(false);
      setAviso({
        tipo: "ok",
        texto: res.yaExistia
          ? "El email ya tenía cuenta: se actualizaron su perfil y sus roles (la contraseña anterior sigue vigente)."
          : "Usuario creado. Ya puede entrar con su email y la contraseña que definiste.",
      });
    } else {
      setAviso({ tipo: "error", texto: res.mensaje });
    }
    setGuardando(false);
  }

  async function toggleActivo(email: string, activo: boolean) {
    setAviso(null);
    setTogglingEmail(email);
    const res = await llamarApi("PATCH", { email, activo });
    if (res.ok) {
      await cargarUsuarios();
      setTick((t) => t + 1);
    } else {
      setAviso({ tipo: "error", texto: res.mensaje });
    }
    setTogglingEmail(null);
  }

  function toggleRol(rol: RolId) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(rol) ? f.roles.filter((r) => r !== rol) : [...f.roles, rol],
    }));
  }

  const selectCls = "h-10 rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">
            Usuarios del sistema, sus roles, empresa y tipo de perfil. El super admin puede impersonar
            para verificar la configuración de cada uno.
          </p>
        </div>
        {puedeGestionar && (
          <Button onClick={() => { setMostrarAlta((v) => !v); setAviso(null); }}>
            <UserPlus className="h-4 w-4" /> {mostrarAlta ? "Cerrar" : "Nuevo usuario"}
          </Button>
        )}
      </div>

      {aviso && (
        <div className={`rounded-md border p-3 text-sm ${aviso.tipo === "ok"
          ? "border-green-600/40 bg-green-600/10 text-green-700"
          : "border-red-600/40 bg-red-600/10 text-red-700"}`}>
          {aviso.texto}
        </div>
      )}

      {puedeGestionar && mostrarAlta && (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo usuario</CardTitle>
            <CardDescription>
              Se crea la cuenta (email + contraseña) y el perfil con sus roles. Pasale la contraseña
              a la persona por un canal seguro; conviene que sea una inicial y que después la cambie.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre y apellido</label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: María Pérez" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email (será su usuario)</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@empresa.com" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Contraseña inicial (mín. 8)</label>
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Ej: Corradi2026!" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Empresa principal</label>
                <select className={`${selectCls} w-full`} value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })}>
                  {listarEmpresas().map((e) => <option key={e.id} value={e.id}>{e.nombreComercial}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de perfil</label>
                <select className={`${selectCls} w-full`} value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as "concesionario" | "terciarizada" })}>
                  <option value="concesionario">Concesionario (ve toda la empresa)</option>
                  <option value="terciarizada">Terciarizada (solo su gestión)</option>
                </select>
              </div>
              {form.tipo === "terciarizada" ? (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Nombre de la gestión</label>
                  <Input value={form.gestion} onChange={(e) => setForm({ ...form, gestion: e.target.value })} placeholder="Ej: Gestión Sur" />
                </div>
              ) : (
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input type="checkbox" checked={form.otraEmpresa} onChange={(e) => setForm({ ...form, otraEmpresa: e.target.checked })} />
                  También puede operar la otra empresa
                </label>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Roles (al menos uno)</p>
              <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {ROLES.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.roles.includes(r.id)} onChange={() => toggleRol(r.id)} />
                    {r.nombre}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={crearUsuario} disabled={guardando}>
                {guardando ? "Creando…" : "Crear usuario"}
              </Button>
              <Button variant="outline" onClick={() => { setMostrarAlta(false); setForm(FORM_INICIAL); }}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

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
              {(puedeImpersonar || puedeGestionar) && <TableHead className="text-right">Acción</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {listarUsuariosCache().map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{empresaPorId(u.empresaId)?.nombreComercial ?? u.empresaId}</TableCell>
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
                {(puedeImpersonar || puedeGestionar) && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {puedeImpersonar && u.id !== usuarioReal?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { impersonar(u.id); router.push("/dashboard"); }}
                        >
                          <UserCog className="h-4 w-4" /> Impersonar
                        </Button>
                      )}
                      {puedeGestionar && u.id !== usuarioReal?.id && (
                        <Button
                          variant={u.activo ? "outline" : "default"}
                          size="sm"
                          disabled={togglingEmail === u.email}
                          onClick={() => toggleActivo(u.email, !u.activo)}
                        >
                          {togglingEmail === u.email ? "…" : u.activo ? "Desactivar" : "Activar"}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="text-sm text-muted-foreground">
        {MODO_DEMO
          ? "En modo demo el alta/baja de usuarios está deshabilitada (se habilita con Supabase conectado)."
          : "Desactivar un usuario le corta el acceso sin borrar su historial. La edición de roles de un usuario existente se hace dando de alta de nuevo el mismo email con los roles correctos."}
      </p>
    </div>
  );
}
