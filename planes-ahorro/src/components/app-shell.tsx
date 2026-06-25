"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard, Building2, Users, ShieldCheck, LogOut, UserCog, X,
} from "lucide-react";
import { useSesion } from "@/lib/session";
import { tienePermiso, nombreRol, type Permiso } from "@/lib/roles";
import { EMPRESAS, empresaPorId } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permiso?: Permiso;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Tablero", icon: LayoutDashboard },
  { href: "/admin/empresas", label: "Empresas", icon: Building2, permiso: "config.empresas" },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, permiso: "config.usuarios" },
  { href: "/admin/roles", label: "Roles y permisos", icon: ShieldCheck, permiso: "config.roles" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    usuarioReal, usuarioActivo, impersonando, empresaActivaId,
    setEmpresaActiva, logout, dejarDeImpersonar,
  } = useSesion();

  useEffect(() => {
    if (!usuarioReal) router.replace("/login");
  }, [usuarioReal, router]);

  if (!usuarioReal || !usuarioActivo) return null;

  const roles = usuarioActivo.roles;
  const items = NAV.filter((i) => !i.permiso || tienePermiso(roles, i.permiso));

  // Empresas que el usuario activo puede ver con su único login (una por vez; no se consolidan).
  const empresasVisibles =
    usuarioActivo.alcance === "grupo"
      ? EMPRESAS
      : EMPRESAS.filter((e) => (usuarioActivo.alcance as string[]).includes(e.id));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="border-b p-4">
          <p className="text-lg font-bold text-primary">Planes de Ahorro</p>
          <p className="text-xs text-muted-foreground">Grupo Corradi</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((i) => {
            const activo = pathname === i.href || pathname.startsWith(i.href + "/");
            const Icon = i.icon;
            return (
              <Link
                key={i.href}
                href={i.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  activo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {i.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{usuarioActivo.nombre}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {roles.map((r) => <Badge key={r} variant="secondary">{nombreRol(r)}</Badge>)}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Banner de impersonación */}
        {impersonando && (
          <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-sm text-amber-950">
            <span className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Estás viendo el sistema como <strong>{usuarioActivo.nombre}</strong>
              {" "}(impersonado por {usuarioReal.nombre}).
            </span>
            <button onClick={dejarDeImpersonar} className="flex items-center gap-1 font-medium underline">
              <X className="h-4 w-4" /> Volver a mi usuario
            </button>
          </div>
        )}

        {/* Topbar */}
        <header className="flex items-center justify-between gap-4 border-b bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Empresa:</span>
            <select
              value={empresaActivaId ?? ""}
              onChange={(e) => setEmpresaActiva(e.target.value)}
              disabled={empresasVisibles.length <= 1}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-70"
            >
              {empresasVisibles.map((e) => (
                <option key={e.id} value={e.id}>{e.nombreComercial}</option>
              ))}
            </select>
            {empresaActivaId && (
              <span className="text-xs text-muted-foreground">
                CUIT {empresaPorId(empresaActivaId)?.cuit}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => { logout(); router.replace("/login"); }}>
            <LogOut className="h-4 w-4" /> Salir
          </Button>
        </header>

        <main className="flex-1 bg-muted/30 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
