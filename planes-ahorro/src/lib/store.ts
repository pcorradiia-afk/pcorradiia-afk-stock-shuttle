"use client";

// Repositorio de datos de Fase 1 en MODO DEMO (persistido en localStorage del navegador).
// La forma de los datos y las funciones imitan lo que en producción será la capa Supabase,
// así que al conectar el backend se reemplaza este archivo sin tocar las pantallas.

import type { Cliente, Comunicacion, Estadio, EstadoCliente, Plan } from "./types";
import { USUARIOS } from "./demo-data";

const K_CLIENTES = "pa.clientes";
const K_COMS = "pa.comunicaciones";
const K_PLANES = "pa.planes";

type Listener = () => void;
const listeners = new Set<Listener>();
export function suscribir(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function notificar() {
  listeners.forEach((l) => l());
}

function leer<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function escribir<T>(key: string, val: T[]) {
  localStorage.setItem(key, JSON.stringify(val));
  notificar();
}
function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "id-" + Math.floor(Math.random() * 1e9).toString(36) + Date.now().toString(36);
}

// --- Mapeo provisional STATUS de cartera → estadio (pendiente N4, ver CLAUDE.md) ---
export function estadioDesdeStatus(status: string | null, desc: string | null): Estadio {
  const d = (desc || "").toUpperCase();
  if (d.includes("ADJUD")) return "adjudicacion";
  if (status === "4" || status === "9") return "adjudicacion";
  return "gestion_cliente";
}

// --- Seed demo ---
function seedSiVacio() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(K_CLIENTES)) return;
  const hoy = new Date().toISOString();
  const clientes: Cliente[] = [
    {
      id: uid(), empresaId: "pc", nombreCompleto: "GONZALEZ DANIEL GUILLERMO",
      documento: "27123456", tipoDocumento: "DNI", telefono: "2944417169",
      email: "electrobandy@yahoo.com.ar", origenDato: "Cartera Plan Óvalo", vendedorId: "u-vendedor",
      estado: "cartera", estadio: "gestion_cliente", nacidoComo: "importado_cartera", fechaAlta: hoy,
      pruebaManejo: null, necesidades: null, planId: null, presupuestoNombre: null, fechaVenta: null,
      solicitud: { nroSolicitud: "1353689", grupo: "11788", orden: "238", plan: "R120", modelo: "R120G", statusCartera: "2", statusDesc: "AHORRISTA AL DIA", valorMovil: 51310336 },
    },
    {
      id: uid(), empresaId: "pc", nombreCompleto: "JONES MARIO SEBASTIAN",
      documento: "30988777", tipoDocumento: "DNI", telefono: "2804691523",
      email: "msebajones@yahoo.com.ar", origenDato: "Cartera Plan Óvalo", vendedorId: "u-vendedor",
      estado: "cartera", estadio: "adjudicacion", nacidoComo: "importado_cartera", fechaAlta: hoy,
      pruebaManejo: null, necesidades: null, planId: null, presupuestoNombre: null, fechaVenta: null,
      solicitud: { nroSolicitud: "1352459", grupo: "11789", orden: "42", plan: "8084", modelo: "MAV02", statusCartera: "4", statusDesc: "ADJUD DEF AL DIA", valorMovil: 45302000 },
    },
    {
      id: uid(), empresaId: "sapac", nombreCompleto: "CANDIA VICTOR DAVID",
      documento: "20345678", tipoDocumento: "DNI", telefono: "2945479910",
      email: "vcandia@gmail.com", origenDato: "Lead web", vendedorId: null,
      estado: "lead", estadio: "scoring", nacidoComo: "lead_interno", fechaAlta: hoy,
      pruebaManejo: true, necesidades: "Busca pickup para trabajo rural.", planId: null, presupuestoNombre: null, fechaVenta: null,
      solicitud: { nroSolicitud: null, grupo: null, orden: null, plan: null, modelo: null, statusCartera: null, statusDesc: null, valorMovil: null },
    },
  ];
  escribir(K_CLIENTES, clientes);
  const coms: Comunicacion[] = [
    {
      id: uid(), clienteId: clientes[0].id, usuarioId: "u-vendedor", usuarioNombre: "Vendedor Trelew",
      fechaHora: hoy, tipoContacto: "Llamado", detalle: "Se contactó para informar estado de cuotas. Cliente al día.",
      proximaAccion: "Volver a llamar en 30 días", estadio: "gestion_cliente",
    },
  ];
  escribir(K_COMS, coms);

  const planes: Plan[] = [
    { id: uid(), empresaId: "pc", codigo: "R120", nombre: "Ranger 120 cuotas", modelo: "RANGER XL", cuotas: 120, activo: true },
    { id: uid(), empresaId: "pc", codigo: "8084", nombre: "Plan 84 - Maverick", modelo: "MAVERICK", cuotas: 84, activo: true },
    { id: uid(), empresaId: "pc", codigo: "EC100", nombre: "EcoSport 100", modelo: "ECOSPORT SE 1.5L", cuotas: 84, activo: true },
    { id: uid(), empresaId: "sapac", codigo: "R120", nombre: "Ranger 120 cuotas", modelo: "RANGER XL", cuotas: 120, activo: true },
    { id: uid(), empresaId: "sapac", codigo: "TEFI4", nombre: "Territory 84", modelo: "TERRITORY", cuotas: 84, activo: true },
  ];
  escribir(K_PLANES, planes);
}

export function inicializar() {
  seedSiVacio();
}

// --- Catálogo de planes ---
export function listarPlanes(empresaId: string, soloActivos = false): Plan[] {
  return leer<Plan>(K_PLANES)
    .filter((p) => p.empresaId === empresaId && (!soloActivos || p.activo))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}
export function getPlan(id: string | null): Plan | undefined {
  if (!id) return undefined;
  return leer<Plan>(K_PLANES).find((p) => p.id === id);
}
export function crearPlan(input: Omit<Plan, "id">): Plan {
  const plan: Plan = { ...input, id: uid() };
  const lista = leer<Plan>(K_PLANES);
  lista.push(plan);
  escribir(K_PLANES, lista);
  return plan;
}

// --- Vendedores de una empresa (para asignar / reasignar) ---
export function vendedoresDeEmpresa(empresaId: string) {
  return USUARIOS.filter(
    (u) => u.activo && u.empresaId === empresaId && u.roles.includes("vendedor")
  );
}

// --- Clientes ---
export interface FiltroClientes {
  texto?: string;
  estado?: EstadoCliente | "todos";
  estadio?: Estadio | "todos";
}

export function listarClientes(empresaId: string | null, filtro: FiltroClientes = {}): Cliente[] {
  let lista = leer<Cliente>(K_CLIENTES);
  if (empresaId) lista = lista.filter((c) => c.empresaId === empresaId);
  const t = filtro.texto?.trim().toLowerCase();
  if (t) {
    lista = lista.filter(
      (c) =>
        c.nombreCompleto.toLowerCase().includes(t) ||
        (c.documento || "").toLowerCase().includes(t) ||
        (c.solicitud.nroSolicitud || "").toLowerCase().includes(t)
    );
  }
  if (filtro.estado && filtro.estado !== "todos") lista = lista.filter((c) => c.estado === filtro.estado);
  if (filtro.estadio && filtro.estadio !== "todos") lista = lista.filter((c) => c.estadio === filtro.estadio);
  return lista.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
}

export function getCliente(id: string): Cliente | undefined {
  return leer<Cliente>(K_CLIENTES).find((c) => c.id === id);
}

export function buscarPorDocumento(empresaId: string, documento: string): Cliente | undefined {
  const doc = documento.replace(/\D/g, "");
  if (!doc) return undefined;
  return leer<Cliente>(K_CLIENTES).find(
    (c) => c.empresaId === empresaId && (c.documento || "").replace(/\D/g, "") === doc
  );
}

export function buscarPorNroSolicitud(nro: string): Cliente | undefined {
  return leer<Cliente>(K_CLIENTES).find((c) => c.solicitud.nroSolicitud === nro);
}

export interface AltaClienteInput {
  empresaId: string;
  nombreCompleto: string;
  documento: string | null;
  tipoDocumento: "DNI" | "CUIT" | null;
  telefono: string | null;
  email: string | null;
  origenDato: string | null;
  vendedorId: string | null;
}

export function crearCliente(
  input: AltaClienteInput
): { ok: boolean; cliente?: Cliente; existente?: Cliente; error?: string } {
  // Regla de unicidad: documento único por empresa (CLAUDE.md §3.6).
  if (input.documento) {
    const existente = buscarPorDocumento(input.empresaId, input.documento);
    if (existente) {
      return {
        ok: false,
        existente,
        error: `Ya existe un cliente con ese documento (${existente.nombreCompleto}). Sumá la gestión sobre ese registro en lugar de duplicarlo.`,
      };
    }
  }
  const cliente: Cliente = {
    id: uid(),
    empresaId: input.empresaId,
    nombreCompleto: input.nombreCompleto.trim(),
    documento: input.documento,
    tipoDocumento: input.tipoDocumento,
    telefono: input.telefono,
    email: input.email,
    origenDato: input.origenDato,
    vendedorId: input.vendedorId,
    estado: "lead",
    estadio: "scoring",
    nacidoComo: "lead_interno",
    fechaAlta: new Date().toISOString(),
    solicitud: { nroSolicitud: null, grupo: null, orden: null, plan: null, modelo: null, statusCartera: null, statusDesc: null, valorMovil: null },
    pruebaManejo: null, necesidades: null, planId: null, presupuestoNombre: null, fechaVenta: null,
  };
  const lista = leer<Cliente>(K_CLIENTES);
  lista.push(cliente);
  escribir(K_CLIENTES, lista);
  return { ok: true, cliente };
}

export function actualizarCliente(id: string, patch: Partial<Cliente>) {
  const lista = leer<Cliente>(K_CLIENTES);
  const i = lista.findIndex((c) => c.id === id);
  if (i < 0) return;
  lista[i] = { ...lista[i], ...patch, solicitud: { ...lista[i].solicitud, ...(patch.solicitud || {}) } };
  escribir(K_CLIENTES, lista);
}

// --- Bitácora ---
export function listarComunicaciones(clienteId: string): Comunicacion[] {
  return leer<Comunicacion>(K_COMS)
    .filter((c) => c.clienteId === clienteId)
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
}

export function agregarComunicacion(input: Omit<Comunicacion, "id" | "fechaHora">) {
  const lista = leer<Comunicacion>(K_COMS);
  lista.push({ ...input, id: uid(), fechaHora: new Date().toISOString() });
  escribir(K_COMS, lista);
}

// --- Gestión comercial (Fase 2) ---
export function asignarVendedor(clienteId: string, vendedorId: string | null) {
  actualizarCliente(clienteId, { vendedorId });
}

export interface GestionVentaInput {
  pruebaManejo: boolean | null;
  necesidades: string | null;
  planId: string | null;
  presupuestoNombre: string | null;
}
export function actualizarGestionVenta(clienteId: string, patch: GestionVentaInput) {
  actualizarCliente(clienteId, patch);
}

/**
 * Cierre de venta. Obligatorio: DNI/CUIT + teléfono + email + N° de solicitud (CLAUDE.md §4.2).
 * Al marcar vendido, el caso pasa a Administración (estadio scoring).
 */
export function cerrarVenta(clienteId: string): { ok: boolean; faltan?: string[] } {
  const c = getCliente(clienteId);
  if (!c) return { ok: false, faltan: ["cliente"] };
  const faltan: string[] = [];
  if (!c.documento) faltan.push("DNI/CUIT");
  if (!c.telefono) faltan.push("teléfono");
  if (!c.email) faltan.push("email");
  if (!c.solicitud.nroSolicitud) faltan.push("N° de solicitud");
  if (faltan.length) return { ok: false, faltan };
  actualizarCliente(clienteId, {
    estado: "vendido",
    estadio: "scoring",
    fechaVenta: new Date().toISOString(),
  });
  return { ok: true };
}

// --- Importación de la cartera (Novedades) — upsert ---
export interface FilaCartera {
  nroSolicitud: string | null;
  grupo: string | null;
  orden: string | null;
  nombreCompleto: string;
  telefono: string | null;
  email: string | null;
  plan: string | null;
  modelo: string | null;
  statusCartera: string | null;
  statusDesc: string | null;
  valorMovil: number | null;
}

export interface ReporteImportacion {
  total: number;
  creados: number;
  actualizados: number;
  rechazados: { fila: number; motivo: string; nombre: string }[];
}

export function importarCartera(filas: FilaCartera[], empresaId: string): ReporteImportacion {
  const lista = leer<Cliente>(K_CLIENTES);
  const rep: ReporteImportacion = { total: filas.length, creados: 0, actualizados: 0, rechazados: [] };
  const hoy = new Date().toISOString();

  filas.forEach((f, idx) => {
    if (!f.nombreCompleto?.trim()) {
      rep.rechazados.push({ fila: idx + 1, motivo: "Sin nombre", nombre: "—" });
      return;
    }
    if (!f.nroSolicitud && !(f.grupo && f.orden)) {
      rep.rechazados.push({ fila: idx + 1, motivo: "Sin N° de solicitud ni grupo/orden", nombre: f.nombreCompleto });
      return;
    }
    // Match: por N° de solicitud; si no, por grupo+orden (dentro de la empresa).
    const i = lista.findIndex(
      (c) =>
        c.empresaId === empresaId &&
        ((f.nroSolicitud && c.solicitud.nroSolicitud === f.nroSolicitud) ||
          (!f.nroSolicitud && c.solicitud.grupo === f.grupo && c.solicitud.orden === f.orden))
    );
    const solicitud = {
      nroSolicitud: f.nroSolicitud,
      grupo: f.grupo,
      orden: f.orden,
      plan: f.plan,
      modelo: f.modelo,
      statusCartera: f.statusCartera,
      statusDesc: f.statusDesc,
      valorMovil: f.valorMovil,
    };
    if (i >= 0) {
      // Actualiza: NO pisa documento (la cartera no lo trae) ni vendedor asignado.
      lista[i] = {
        ...lista[i],
        nombreCompleto: f.nombreCompleto.trim(),
        telefono: f.telefono ?? lista[i].telefono,
        email: f.email ?? lista[i].email,
        estadio: estadioDesdeStatus(f.statusCartera, f.statusDesc),
        solicitud: { ...lista[i].solicitud, ...solicitud },
      };
      rep.actualizados++;
    } else {
      lista.push({
        id: uid(),
        empresaId,
        nombreCompleto: f.nombreCompleto.trim(),
        documento: null,
        tipoDocumento: null,
        telefono: f.telefono,
        email: f.email,
        origenDato: "Importación cartera",
        vendedorId: null,
        estado: "cartera",
        estadio: estadioDesdeStatus(f.statusCartera, f.statusDesc),
        nacidoComo: "importado_cartera",
        fechaAlta: hoy,
        solicitud,
        pruebaManejo: null, necesidades: null, planId: null, presupuestoNombre: null, fechaVenta: null,
      });
      rep.creados++;
    }
  });

  escribir(K_CLIENTES, lista);
  return rep;
}
