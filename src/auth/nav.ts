import {
  Building2,
  LayoutDashboard,
  LineChart,
  ListChecks,
  type LucideIcon,
  ShieldCheck,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import type { Permiso } from "@/types";
import { PERMISOS } from "./permissions";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permiso: Permiso;
  grupo: "Gestión" | "Auditoría" | "Datos" | "Administración";
}

export const NAV: NavItem[] = [
  { to: "/", label: "Tablero", icon: LayoutDashboard, permiso: PERMISOS.DASHBOARD_VER, grupo: "Gestión" },
  { to: "/rentabilidad", label: "Rentabilidad por depto.", icon: LineChart, permiso: PERMISOS.RENTABILIDAD_VER, grupo: "Gestión" },
  { to: "/comercial", label: "Ventas y márgenes", icon: ListChecks, permiso: PERMISOS.COMERCIAL_VER, grupo: "Gestión" },
  { to: "/cuentas-corrientes", label: "Cuentas corrientes", icon: Wallet, permiso: PERMISOS.CC_VER, grupo: "Gestión" },
  { to: "/auditoria", label: "Auditoría y hallazgos", icon: ShieldCheck, permiso: PERMISOS.AUDITORIA_VER, grupo: "Auditoría" },
  { to: "/importar", label: "Importar del DMS", icon: Upload, permiso: PERMISOS.IMPORTAR_EJECUTAR, grupo: "Datos" },
  { to: "/admin/empresas", label: "Empresas", icon: Building2, permiso: PERMISOS.ADMIN_EMPRESAS, grupo: "Administración" },
  { to: "/admin/usuarios", label: "Usuarios", icon: Users, permiso: PERMISOS.ADMIN_USUARIOS, grupo: "Administración" },
  { to: "/admin/roles", label: "Roles y permisos", icon: ShieldCheck, permiso: PERMISOS.ADMIN_ROLES, grupo: "Administración" },
];

export const NAV_GRUPOS: NavItem["grupo"][] = ["Gestión", "Auditoría", "Datos", "Administración"];
