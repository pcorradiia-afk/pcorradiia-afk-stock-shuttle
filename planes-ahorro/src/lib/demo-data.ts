import type { Empresa, Sucursal, Equipo, Usuario } from "./types";

// Datos de ejemplo para el MODO DEMO (sin Supabase configurado).
// Las empresas usan los CUIT reales provistos por el cliente.

export const EMPRESAS: Empresa[] = [
  { id: "pc", nombre: "PEDRO CORRADI S.A.", cuit: "33-52033241-9", nombreComercial: "Pedro Corradi", activo: true },
  { id: "sapac", nombre: "SAPAC S.A.", cuit: "30-59970938-6", nombreComercial: "Fiorasi", activo: true },
];

export const SUCURSALES: Sucursal[] = [
  { id: "pc-trelew", empresaId: "pc", nombre: "Trelew", activo: true },
  { id: "pc-madryn", empresaId: "pc", nombre: "Puerto Madryn", activo: true },
  { id: "sapac-neuquen", empresaId: "sapac", nombre: "Neuquén", activo: true },
  { id: "sapac-roca", empresaId: "sapac", nombre: "General Roca", activo: true },
];

export const EQUIPOS: Equipo[] = [
  { id: "pc-ventas-1", sucursalId: "pc-trelew", nombre: "Ventas Trelew", tipo: "ventas" },
  { id: "pc-admin-1", sucursalId: "pc-trelew", nombre: "Administración Trelew", tipo: "administracion" },
  { id: "sapac-ventas-1", sucursalId: "sapac-neuquen", nombre: "Ventas Neuquén", tipo: "ventas" },
  { id: "sapac-admin-1", sucursalId: "sapac-neuquen", nombre: "Administración Neuquén", tipo: "administracion" },
];

export const USUARIOS: Usuario[] = [
  {
    id: "u-admin", nombre: "Fernando Bogliacino", email: "admin@grupocorradi.com",
    empresaId: "pc", sucursalId: null, equipoId: null, tipoPerfil: "concesionario",
    roles: ["super_admin"], alcance: "grupo", estadios: [], activo: true,
  },
  {
    id: "u-gerencia", nombre: "Gerencia General", email: "gerencia@grupocorradi.com",
    empresaId: "pc", sucursalId: null, equipoId: null, tipoPerfil: "concesionario",
    roles: ["gerencia"], alcance: "grupo", estadios: [], activo: true,
  },
  {
    id: "u-recepcion", nombre: "Recepción Trelew", email: "recepcion.pc@grupocorradi.com",
    empresaId: "pc", sucursalId: "pc-trelew", equipoId: "pc-ventas-1", tipoPerfil: "concesionario",
    roles: ["recepcion"], alcance: ["pc"], estadios: [], activo: true,
  },
  {
    id: "u-vendedor", nombre: "Vendedor Trelew", email: "vendedor.pc@grupocorradi.com",
    empresaId: "pc", sucursalId: "pc-trelew", equipoId: "pc-ventas-1", tipoPerfil: "concesionario",
    roles: ["vendedor"], alcance: ["pc"], estadios: [], activo: true,
  },
  {
    id: "u-sup-ventas", nombre: "Supervisor Ventas PC", email: "supventas.pc@grupocorradi.com",
    empresaId: "pc", sucursalId: "pc-trelew", equipoId: "pc-ventas-1", tipoPerfil: "concesionario",
    roles: ["supervisor_ventas"], alcance: ["pc"], estadios: [], activo: true,
  },
  {
    id: "u-admin-pc", nombre: "Administración PC", email: "administracion.pc@grupocorradi.com",
    empresaId: "pc", sucursalId: "pc-trelew", equipoId: "pc-admin-1", tipoPerfil: "concesionario",
    roles: ["administracion"], alcance: ["pc"], estadios: ["scoring", "agrupamiento", "gestion_cliente", "adjudicacion"], activo: true,
  },
  {
    id: "u-sup-admin", nombre: "Supervisor Administración", email: "supadmin.pc@grupocorradi.com",
    empresaId: "pc", sucursalId: "pc-trelew", equipoId: "pc-admin-1", tipoPerfil: "concesionario",
    roles: ["supervisor_administracion"], alcance: ["pc"], estadios: [], activo: true,
  },
  {
    id: "u-entregas", nombre: "Entregas PC", email: "entregas.pc@grupocorradi.com",
    empresaId: "pc", sucursalId: "pc-trelew", equipoId: "pc-admin-1", tipoPerfil: "concesionario",
    roles: ["entregas"], alcance: ["pc"], estadios: ["entrega"], activo: true,
  },
  {
    id: "u-tercia", nombre: "Gestión Terciarizada", email: "gestion@terciarizada.com",
    empresaId: "sapac", sucursalId: "sapac-neuquen", equipoId: "sapac-admin-1", tipoPerfil: "terciarizada",
    roles: ["administracion"], alcance: ["sapac"], estadios: ["agrupamiento", "gestion_cliente"], activo: true,
  },
];

export function empresaPorId(id: string) {
  return EMPRESAS.find((e) => e.id === id);
}
export function sucursalesDeEmpresa(empresaId: string) {
  return SUCURSALES.filter((s) => s.empresaId === empresaId);
}
