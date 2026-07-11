"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Building2, Users, ShieldCheck, LogOut, UserCog, X, Contact, Upload,
  Package, TrendingUp, Bell, BarChart3, Landmark, PhoneCall, MessageCircle, Headphones, Calculator,
} from "lucide-react";
import { useSesion } from "@/lib/session";
import { tienePermiso, nombreRol, type Permiso } from "@/lib/roles";
import { suscribir, contarAlertasNoLeidas, inicializar, listarEmpresas, empresaPorId } from "@/lib/store";
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
  { href: "/clientes", label: "Ahorristas", icon: Contact, permiso: "clientes.ver" },
  { href: "/gestiones", label: "Gestiones", icon: PhoneCall, permiso: "clientes.ver" },
  { href: "/call-center", label: "Call center", icon: Headphones, permiso: "clientes.ver" },
  { href: "/cotizador", label: "Cotizador adjudicados", icon: Calculator, permiso: "clientes.ver" },
  { href: "/ventas", label: "Supervisión de ventas", icon: TrendingUp, permiso: "ventas.supervisar" },
  { href: "/informes", label: "Informes", icon: BarChart3, permiso: "informes.ver" },
  { href: "/planes", label: "Planes", icon: Package, permiso: "clientes.ver" },
  { href: "/whatsapp", label: "Campañas WhatsApp", icon: MessageCircle, permiso: "campanias.enviar" },
  { href: "/importar", label: "Importar archivos", icon: Upload, permiso: "importar" },
  { href: "/cta-cte", label: "Cuenta corriente", icon: Landmark, permiso: "importar" },
  { href: "/admin/empresas", label: "Empresas", icon: Building2, permiso: "config.empresas" },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users, permiso: "config.usuarios" },
  { href: "/admin/roles", label: "Roles y permisos", icon: ShieldCheck, permiso: "config.roles" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    usuarioReal, usuarioActivo, impersonando, empresaActivaId, cargandoDatos,
    setEmpresaActiva, logout, dejarDeImpersonar,
  } = useSesion();

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!usuarioReal) router.replace("/login");
  }, [usuarioReal, router]);
  useEffect(() => {
    const unsub = suscribir(() => setTick((t) => t + 1));
    inicializar();
    setTick((t) => t + 1);
    return unsub;
  }, []);

  if (!usuarioReal || !usuarioActivo) return null;

  const noLeidas = contarAlertasNoLeidas(usuarioActivo, empresaActivaId);
  void tick; // fuerza recálculo de noLeidas cuando cambian las alertas

  const roles = usuarioActivo.roles;
  const items = NAV.filter((i) => !i.permiso || tienePermiso(roles, i.permiso));

  // Empresas que el usuario activo puede ver con su único login (una por vez; no se consolidan).
  const todas = listarEmpresas();
  const empresasVisibles =
    usuarioActivo.alcance === "grupo"
      ? todas
      : todas.filter((e) => (usuarioActivo.alcance as string[]).includes(e.id));

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="border-b p-4">
          <p className="text-lg font-bold text-primary">Planes de Ahorro</p>
          <p className="text-xs text-muted-foreground">Grupo Fiorasi</p>
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
            {cargandoDatos && (
              <span className="animate-pulse text-xs font-medium text-primary">Sincronizando…</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Link href="/alertas" className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent" title="Alertas">
              <Bell className="h-5 w-5" />
              {noLeidas > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {noLeidas}
                </span>
              )}
            </Link>
            <Button variant="ghost" size="sm" onClick={() => { logout(); router.replace("/login"); }}>
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          </div>
        </header>

        <main className="flex-1 bg-muted/30 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
