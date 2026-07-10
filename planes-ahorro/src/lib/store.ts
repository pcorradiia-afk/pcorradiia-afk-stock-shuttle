"use client";

// Repositorio de datos de Fase 1 en MODO DEMO (persistido en localStorage del navegador).
// La forma de los datos y las funciones imitan lo que en producción será la capa Supabase,
// así que al conectar el backend se reemplaza este archivo sin tocar las pantallas.

import type {
  PlantillaWhatsApp, CampaniaWhatsApp, EnvioWhatsApp, CategoriaPlantilla,
  Cliente, Comunicacion, Estadio, EstadoCliente, Plan,
  ObservacionScoring, ResultadoScoring, Alerta, GestionAdmin, RolId, Usuario,
  MovimientoCtaCte, Tarea,
} from "./types";
import { USUARIOS } from "./demo-data";
import { remote } from "./remote";
import { MODO_DEMO } from "./supabase/client";

const K_CLIENTES = "pa.clientes";
const K_COMS = "pa.comunicaciones";
const K_PLANES = "pa.planes";
const K_OBS = "pa.observaciones";
const K_ALERTAS = "pa.alertas";
const K_CTACTE = "pa.ctacte";
const K_PLANTILLAS_WA = "pa.plantillasWa";
const K_CAMPANIAS_WA = "pa.campaniasWa";
const K_ENVIOS_WA = "pa.enviosWa";
const K_META = "pa.meta";

// Metadatos simples (ej. fecha de última actualización de cartera por empresa).
export function getMeta(clave: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (JSON.parse(localStorage.getItem(K_META) || "{}") as Record<string, string>)[clave] ?? null;
  } catch {
    return null;
  }
}
export function setMeta(clave: string, valor: string, empresaId?: string) {
  if (typeof window === "undefined") return;
  try {
    const m = JSON.parse(localStorage.getItem(K_META) || "{}");
    m[clave] = valor;
    localStorage.setItem(K_META, JSON.stringify(m));
    notificar();
    if (empresaId) remote.meta(empresaId, clave, valor);
  } catch {
    /* ignore */
  }
}

// Orden de los estadios (CLAUDE.md §6).
export const ESTADIOS_ORDEN: Estadio[] = [
  "scoring", "agrupamiento", "gestion_cliente", "adjudicacion", "pedido", "patentamiento", "entrega",
];

// Estadios habilitados para Administración de perfil TERCIARIZADA (CLAUDE.md §6.8).
export const ESTADIOS_TERCIARIZADA: Estadio[] = ["agrupamiento", "gestion_cliente"];

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

/**
 * Regla C3 (revisión 2026-07-02): una importación puede AVANZAR el estadio de un
 * cliente pero nunca retrocederlo — el avance manual del equipo no se pisa.
 */
function estadioMasAvanzado(actual: Estadio, propuesto: Estadio): Estadio {
  return ESTADIOS_ORDEN.indexOf(propuesto) > ESTADIOS_ORDEN.indexOf(actual) ? propuesto : actual;
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
      gestionId: "gest-terc-1", // cliente de la gestión terciarizada demo
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
  if (MODO_DEMO) seedSiVacio(); // con Supabase, los datos llegan de la nube
}

// --- Usuarios (demo: constantes; con Supabase: caché cargada al iniciar sesión) ---
let USUARIOS_CACHE: Usuario[] = USUARIOS;
export function setUsuariosCache(us: Usuario[]) {
  USUARIOS_CACHE = us;
  notificar();
}
export function listarUsuariosCache(): Usuario[] {
  return USUARIOS_CACHE;
}

/** Reemplaza la caché local con los datos bajados de Supabase (una empresa por vez). */
export function reemplazarDatosEmpresa(
  datos: Record<string, unknown[]>,
  metas: { clave: string; valor: string }[]
) {
  if (typeof window === "undefined") return;
  const mapa: Record<string, string> = {
    clientes: K_CLIENTES, comunicaciones: K_COMS, planes: K_PLANES,
    observaciones: K_OBS, alertas: K_ALERTAS, tareas: K_TAREAS, ctacte: K_CTACTE,
    plantillasWa: K_PLANTILLAS_WA, campaniasWa: K_CAMPANIAS_WA, enviosWa: K_ENVIOS_WA,
  };
  for (const [clave, key] of Object.entries(mapa)) {
    localStorage.setItem(key, JSON.stringify(datos[clave] ?? []));
  }
  try {
    const m = JSON.parse(localStorage.getItem(K_META) || "{}");
    metas.forEach(({ clave, valor }) => { m[clave] = valor; });
    localStorage.setItem(K_META, JSON.stringify(m));
  } catch { /* ignore */ }
  notificar();
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
  remote.planes(input.empresaId, [plan]);
  return plan;
}

// --- Vendedores de una empresa (para asignar / reasignar) ---
export function vendedoresDeEmpresa(empresaId: string) {
  return USUARIOS_CACHE.filter(
    (u) => u.activo && u.empresaId === empresaId && u.roles.includes("vendedor")
  );
}

// --- Clientes ---
export interface FiltroClientes {
  texto?: string;
  estado?: EstadoCliente | "todos";
  estadio?: Estadio | "todos";
}

// Roles con visibilidad amplia dentro de la empresa (no limitada a "lo propio").
const ROLES_AMPLIOS: RolId[] = [
  "super_admin", "supervisor_ventas", "recepcion", "administracion",
  "supervisor_administracion", "gerencia", "entregas", "analista_suscripciones",
];

/**
 * Regla C5 (revisión 2026-07-02, espec §4.1 y matriz):
 * - Terciarizada: solo ve los clientes de SU gestión (gestionId).
 * - Vendedor (sin otro rol amplio): solo ve sus clientes asignados.
 * La versión definitiva se refuerza con RLS al conectar Supabase.
 */
export function puedeVerCliente(usuario: Usuario, c: Cliente): boolean {
  if (usuario.tipoPerfil === "terciarizada") {
    return !!usuario.gestionId && c.gestionId === usuario.gestionId;
  }
  const soloVendedor =
    usuario.roles.includes("vendedor") && !usuario.roles.some((r) => ROLES_AMPLIOS.includes(r));
  if (soloVendedor) return c.vendedorId === usuario.id;
  return true;
}

export function listarClientes(
  empresaId: string | null,
  filtro: FiltroClientes = {},
  usuario?: Usuario
): Cliente[] {
  let lista = leer<Cliente>(K_CLIENTES);
  if (empresaId) lista = lista.filter((c) => c.empresaId === empresaId);
  if (usuario) lista = lista.filter((c) => puedeVerCliente(usuario, c));
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
  gestionId?: string | null; // heredada del usuario terciarizada que lo crea
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
    gestionId: input.gestionId ?? null,
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
  const nueva: Comunicacion = { ...input, id: uid(), fechaHora: new Date().toISOString() };
  lista.push(nueva);
  escribir(K_COMS, lista);
  const duenio = getCliente(input.clienteId);
  if (duenio) remote.comunicaciones(duenio.empresaId, [nueva]);
  // Call center: registrar el contacto completa automáticamente las tareas
  // pendientes de ese colaborador sobre ese cliente.
  completarTareasPorContacto(input.clienteId, input.usuarioId, `${input.tipoContacto}: ${input.detalle.slice(0, 80)}`);
}

/** Comunicaciones de todos los clientes de una empresa (para métricas de call center). */
export function listarComunicacionesEmpresa(empresaId: string): (Comunicacion & { clienteNombre: string })[] {
  const clientes = new Map(leer<Cliente>(K_CLIENTES).filter((c) => c.empresaId === empresaId).map((c) => [c.id, c]));
  return leer<Comunicacion>(K_COMS)
    .filter((x) => clientes.has(x.clienteId))
    .map((x) => ({ ...x, clienteNombre: clientes.get(x.clienteId)!.nombreCompleto }))
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
}

// ===================== Call center: tareas asignadas =====================
const K_TAREAS = "pa.tareas";

export function colaboradoresDeEmpresa(empresaId: string): Usuario[] {
  return USUARIOS_CACHE.filter(
    (u) => u.activo && (u.empresaId === empresaId || u.alcance === "grupo" ||
      (Array.isArray(u.alcance) && u.alcance.includes(empresaId)))
  );
}

export function listarTareas(
  empresaId: string,
  f: { asignadoId?: string; estado?: Tarea["estado"] } = {}
): Tarea[] {
  return leer<Tarea>(K_TAREAS)
    .filter((t) => t.empresaId === empresaId &&
      (!f.asignadoId || t.asignadoId === f.asignadoId) &&
      (!f.estado || t.estado === f.estado))
    .sort((a, b) => b.fechaAsignacion.localeCompare(a.fechaAsignacion));
}

/** Asigna tareas para una lista de clientes. Evita duplicar pendientes del mismo tipo. */
export function crearTareas(
  clientes: Cliente[],
  gestionTipo: string,
  asignado: Usuario,
  creadaPor: Usuario,
  empresaId: string
): number {
  const lista = leer<Tarea>(K_TAREAS);
  const yaPendientes = new Set(
    lista.filter((t) => t.empresaId === empresaId && t.estado === "pendiente" && t.gestionTipo === gestionTipo)
      .map((t) => t.clienteId)
  );
  const hoy = new Date().toISOString();
  let creadas = 0;
  const nuevasTareas: Tarea[] = [];
  for (const c of clientes) {
    if (yaPendientes.has(c.id)) continue;
    lista.push({
      id: uid(), empresaId, clienteId: c.id, clienteNombre: c.nombreCompleto,
      gestionTipo, asignadoId: asignado.id, asignadoNombre: asignado.nombre,
      creadaPorNombre: creadaPor.nombre, fechaAsignacion: hoy,
      estado: "pendiente", fechaCompletada: null, resultado: null,
    });
    nuevasTareas.push(lista[lista.length - 1]);
    creadas++;
  }
  if (creadas) {
    escribir(K_TAREAS, lista);
    remote.tareas(empresaId, nuevasTareas);
  }
  return creadas;
}

export function completarTarea(tareaId: string, resultado: string) {
  const lista = leer<Tarea>(K_TAREAS);
  const i = lista.findIndex((t) => t.id === tareaId);
  if (i < 0 || lista[i].estado === "completada") return;
  lista[i] = { ...lista[i], estado: "completada", fechaCompletada: new Date().toISOString(), resultado };
  escribir(K_TAREAS, lista);
  remote.tareas(lista[i].empresaId, [lista[i]]);
}

function completarTareasPorContacto(clienteId: string, usuarioId: string, resultado: string) {
  const lista = leer<Tarea>(K_TAREAS);
  let cambio = false;
  const completadasT: Tarea[] = [];
  lista.forEach((t, i) => {
    if (t.clienteId === clienteId && t.asignadoId === usuarioId && t.estado === "pendiente") {
      lista[i] = { ...t, estado: "completada", fechaCompletada: new Date().toISOString(), resultado };
      completadasT.push(lista[i]);
      cambio = true;
    }
  });
  if (cambio) {
    escribir(K_TAREAS, lista);
    completadasT.forEach((t) => remote.tareas(t.empresaId, [t]));
  }
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
 * El N° de solicitud debe ser ÚNICO (regla §3.6). Al marcar vendido, pasa a Administración.
 */
export function cerrarVenta(clienteId: string): { ok: boolean; faltan?: string[]; error?: string } {
  const c = getCliente(clienteId);
  if (!c) return { ok: false, faltan: ["cliente"] };
  const faltan: string[] = [];
  if (!c.documento) faltan.push("DNI/CUIT");
  if (!c.telefono) faltan.push("teléfono");
  if (!c.email) faltan.push("email");
  if (!c.solicitud.nroSolicitud) faltan.push("N° de solicitud");
  if (faltan.length) return { ok: false, faltan };
  const duenio = buscarPorNroSolicitud(c.solicitud.nroSolicitud!);
  if (duenio && duenio.id !== clienteId) {
    return { ok: false, error: `El N° de solicitud ${c.solicitud.nroSolicitud} ya pertenece a ${duenio.nombreCompleto}. Es único e irrepetible.` };
  }
  actualizarCliente(clienteId, {
    estado: "vendido",
    estadio: "scoring",
    fechaVenta: new Date().toISOString(),
  });
  return { ok: true };
}

// --- Importaciones de los demás archivos del sistema actual (CLAUDE.md §5.bis) ---

/** Normaliza grupo/orden para comparar (quita ceros a la izquierda). */
function normGO(s: string | null): string {
  return (s || "").replace(/^0+(?=\d)/, "");
}

function buscarPorGrupoOrden(lista: Cliente[], empresaId: string, grupo: string, orden: string): number {
  return lista.findIndex(
    (c) => c.empresaId === empresaId &&
      normGO(c.solicitud.grupo) === normGO(grupo) &&
      normGO(c.solicitud.orden) === normGO(orden)
  );
}

/** Adjudicatarios sin pedido: work-list del estadio Pedido. Actualiza (o crea) por grupo+orden. */
export function importarAdjudicatarios(
  filas: { grupo: string; orden: string; nombre: string; status: string | null; modelo: string | null; plan: string | null; fechaAceptacion: string | null; observaciones: string | null; aging: number | null; puedeIngresarPedido: boolean }[],
  empresaId: string
): ReporteImportacion {
  const lista = leer<Cliente>(K_CLIENTES);
  const rep: ReporteImportacion = { total: filas.length, creados: 0, actualizados: 0, rechazados: [] };
  const hoy = new Date().toISOString();
  const tocados: Cliente[] = [];
  filas.forEach((f, idx) => {
    if (!f.nombre) { rep.rechazados.push({ fila: idx + 1, motivo: "Sin nombre", nombre: "—" }); return; }
    const adjudicacion = {
      fechaAceptacion: f.fechaAceptacion, aging: f.aging,
      puedeIngresarPedido: f.puedeIngresarPedido, observaciones: f.observaciones,
    };
    const i = buscarPorGrupoOrden(lista, empresaId, f.grupo, f.orden);
    if (i >= 0) {
      lista[i] = {
        ...lista[i],
        estadio: estadioMasAvanzado(lista[i].estadio, "pedido"),
        adjudicacion: { ...(lista[i].adjudicacion || {}), ...adjudicacion },
        solicitud: { ...lista[i].solicitud, modelo: f.modelo ?? lista[i].solicitud.modelo },
      };
      tocados.push(lista[i]);
      rep.actualizados++;
    } else {
      lista.push({
        id: uid(), empresaId, nombreCompleto: f.nombre, documento: null, tipoDocumento: null,
        telefono: null, email: null, origenDato: "Importación adjudicatarios", vendedorId: null,
        estado: "cartera", estadio: "pedido", nacidoComo: "importado_cartera", fechaAlta: hoy,
        solicitud: { nroSolicitud: null, grupo: f.grupo, orden: f.orden, plan: f.plan, modelo: f.modelo, statusCartera: f.status, statusDesc: null, valorMovil: null },
        adjudicacion,
        pruebaManejo: null, necesidades: null, planId: null, presupuestoNombre: null, fechaVenta: null,
      });
      tocados.push(lista[lista.length - 1]);
      rep.creados++;
    }
  });
  escribir(K_CLIENTES, lista);
  remote.clientes(empresaId, tocados);
  return rep;
}

/** Ganadores de acto (sorteo/licitación): pasa a Adjudicación y avisa a Administración. */
export function importarGanadores(
  filas: { nroActo: string; grupo: string; orden: string; nombre: string; plan: string | null; modelo: string | null; tipoAdjudicacion: string | null; condicional: string | null; importeOferta: number | null }[],
  empresaId: string
): ReporteImportacion {
  const lista = leer<Cliente>(K_CLIENTES);
  const rep: ReporteImportacion = { total: filas.length, creados: 0, actualizados: 0, rechazados: [] };
  const hoy = new Date().toISOString();
  const tocadosG: Cliente[] = [];
  filas.forEach((f, idx) => {
    if (!f.nombre) { rep.rechazados.push({ fila: idx + 1, motivo: "Sin nombre", nombre: "—" }); return; }
    const adjudicacion = {
      nroActo: f.nroActo, tipoAdjudicacion: f.tipoAdjudicacion,
      condicional: f.condicional, importeOferta: f.importeOferta,
    };
    const i = buscarPorGrupoOrden(lista, empresaId, f.grupo, f.orden);
    let clienteId: string;
    if (i >= 0) {
      lista[i] = {
        ...lista[i],
        estadio: estadioMasAvanzado(lista[i].estadio, "adjudicacion"),
        adjudicacion: { ...(lista[i].adjudicacion || {}), ...adjudicacion },
      };
      clienteId = lista[i].id;
      tocadosG.push(lista[i]);
      rep.actualizados++;
    } else {
      clienteId = uid();
      lista.push({
        id: clienteId, empresaId, nombreCompleto: f.nombre, documento: null, tipoDocumento: null,
        telefono: null, email: null, origenDato: "Importación ganadores", vendedorId: null,
        estado: "cartera", estadio: "adjudicacion", nacidoComo: "importado_cartera", fechaAlta: hoy,
        solicitud: { nroSolicitud: null, grupo: f.grupo, orden: f.orden, plan: f.plan, modelo: f.modelo, statusCartera: null, statusDesc: null, valorMovil: null },
        adjudicacion,
        pruebaManejo: null, necesidades: null, planId: null, presupuestoNombre: null, fechaVenta: null,
      });
      tocadosG.push(lista[lista.length - 1]);
      rep.creados++;
    }
    crearAlerta({
      empresaId, rolesDestino: ["administracion", "supervisor_administracion"],
      tipo: "ganador_acto", clienteId, clienteNombre: f.nombre,
      mensaje: `Ganador del acto ${f.nroActo} (${f.tipoAdjudicacion ?? "adjudicación"}) — informar al cliente.`,
    });
  });
  escribir(K_CLIENTES, lista);
  remote.clientes(empresaId, tocadosG);
  return rep;
}

/** Movimientos de la cta cte de la concesionaria (evita duplicados exactos). */
export function importarCtaCte(movs: Omit<MovimientoCtaCte, "id" | "empresaId">[], empresaId: string): ReporteImportacion {
  const lista = leer<MovimientoCtaCte>(K_CTACTE);
  const clave = (m: { fecha: string; codigo: string; importe: number; referencia: string; dc: string }) =>
    `${m.fecha}|${m.codigo}|${m.importe}|${m.referencia}|${m.dc}`;
  const existentes = new Set(lista.filter((m) => m.empresaId === empresaId).map(clave));
  const rep: ReporteImportacion = { total: movs.length, creados: 0, actualizados: 0, rechazados: [] };
  const nuevosMovs: MovimientoCtaCte[] = [];
  movs.forEach((m, idx) => {
    if (existentes.has(clave(m))) {
      rep.rechazados.push({ fila: idx + 1, motivo: "Duplicado (ya importado)", nombre: `${m.codigo} ${m.fecha}` });
      return;
    }
    existentes.add(clave(m));
    const nuevo = { ...m, id: uid(), empresaId };
    lista.push(nuevo);
    nuevosMovs.push(nuevo);
    rep.creados++;
  });
  escribir(K_CTACTE, lista);
  remote.ctacte(empresaId, nuevosMovs);
  return rep;
}

export function listarCtaCte(empresaId: string): MovimientoCtaCte[] {
  return leer<MovimientoCtaCte>(K_CTACTE)
    .filter((m) => m.empresaId === empresaId)
    .sort((a, b) => b.fecha.split("/").reverse().join("").localeCompare(a.fecha.split("/").reverse().join("")) || a.codigo.localeCompare(b.codigo));
}

/** adh: enriquece domicilio/localidad/provincia/CP de clientes existentes (no crea nuevos). */
export function importarAdh(
  filas: { grupo: string; orden: string; nombre: string; codigoPostal: string | null; domicilio: string | null; localidad: string | null; provincia: string | null }[],
  empresaId: string
): ReporteImportacion {
  const lista = leer<Cliente>(K_CLIENTES);
  const rep: ReporteImportacion = { total: filas.length, creados: 0, actualizados: 0, rechazados: [] };
  const tocadosAdh: Cliente[] = [];
  filas.forEach((f, idx) => {
    const i = buscarPorGrupoOrden(lista, empresaId, f.grupo, f.orden);
    if (i < 0) {
      rep.rechazados.push({ fila: idx + 1, motivo: `Grupo ${f.grupo}/orden ${f.orden} no está en la cartera`, nombre: f.nombre });
      return;
    }
    lista[i] = {
      ...lista[i],
      domicilio: f.domicilio ?? lista[i].domicilio,
      localidad: f.localidad ?? lista[i].localidad,
      provincia: f.provincia ?? lista[i].provincia,
      codigoPostal: f.codigoPostal ?? lista[i].codigoPostal,
    };
    tocadosAdh.push(lista[i]);
    rep.actualizados++;
  });
  escribir(K_CLIENTES, lista);
  remote.clientes(empresaId, tocadosAdh);
  return rep;
}

// ===================== Fase 3: estadios de administración =====================

export function estadioSiguiente(e: Estadio): Estadio | null {
  const i = ESTADIOS_ORDEN.indexOf(e);
  return i >= 0 && i < ESTADIOS_ORDEN.length - 1 ? ESTADIOS_ORDEN[i + 1] : null;
}

export function avanzarEstadio(clienteId: string): Estadio | null {
  const c = getCliente(clienteId);
  if (!c) return null;
  const sig = estadioSiguiente(c.estadio);
  if (sig) actualizarCliente(clienteId, { estadio: sig });
  return sig;
}

export function actualizarGestionAdmin(clienteId: string, patch: GestionAdmin) {
  const c = getCliente(clienteId);
  if (!c) return;
  actualizarCliente(clienteId, { gestionAdmin: { ...(c.gestionAdmin || {}), ...patch } });
}

// --- Scoring ---
/** Todas las observaciones de los clientes de una empresa (para informes). */
export function listarObservacionesEmpresa(empresaId: string): (ObservacionScoring & { clienteNombre: string })[] {
  const clientes = new Map(leer<Cliente>(K_CLIENTES).filter((c) => c.empresaId === empresaId).map((c) => [c.id, c]));
  return leer<ObservacionScoring>(K_OBS)
    .filter((o) => clientes.has(o.clienteId))
    .map((o) => ({ ...o, clienteNombre: clientes.get(o.clienteId)!.nombreCompleto }))
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
}

export function listarObservaciones(clienteId: string): ObservacionScoring[] {
  return leer<ObservacionScoring>(K_OBS)
    .filter((o) => o.clienteId === clienteId)
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
}

const OBSERVADO: ResultadoScoring[] = [
  "observado_requisitos_crediticios", "observado_gastos_retiro",
  "observado_vehiculo_usado", "observado_presupuesto", "observado_otros",
];

export function registrarScoring(clienteId: string, usuario: Usuario, resultado: ResultadoScoring) {
  const c = getCliente(clienteId);
  if (!c) return;
  const obs: ObservacionScoring = {
    id: uid(), clienteId, fechaHora: new Date().toISOString(),
    usuarioId: usuario.id, usuarioNombre: usuario.nombre, resultado,
    gestionResultado: null, gestionFechaHora: null, gestionUsuarioNombre: null,
  };
  const lista = leer<ObservacionScoring>(K_OBS);
  lista.push(obs);
  escribir(K_OBS, lista);
  remote.observaciones(c.empresaId, [obs]);

  if (OBSERVADO.includes(resultado)) {
    // Alerta al Analista de Suscripciones, Sup. de Administración y Sup. de Ventas del equipo.
    crearAlerta({
      empresaId: c.empresaId,
      rolesDestino: ["analista_suscripciones", "supervisor_administracion", "supervisor_ventas"],
      tipo: "scoring_observado",
      clienteId: c.id,
      clienteNombre: c.nombreCompleto,
      mensaje: `Scoring observado (${etiquetaScoring(resultado)}) — requiere gestión.`,
    });
  } else if (resultado === "aprobado") {
    // Aprobado: finaliza scoring y pasa a Agrupamiento.
    if (c.estadio === "scoring") actualizarCliente(clienteId, { estadio: "agrupamiento" });
  }
}

// El Supervisor de ventas gestiona la observación → cliente queda "Gestionado".
export function gestionarObservacion(obsId: string, usuario: Usuario, resultado: string) {
  const lista = leer<ObservacionScoring>(K_OBS);
  const i = lista.findIndex((o) => o.id === obsId);
  if (i < 0) return;
  lista[i] = {
    ...lista[i], gestionResultado: resultado,
    gestionFechaHora: new Date().toISOString(), gestionUsuarioNombre: usuario.nombre,
  };
  escribir(K_OBS, lista);
  const cliObs = getCliente(lista[i].clienteId);
  if (cliObs) remote.observaciones(cliObs.empresaId, [lista[i]]);
  actualizarCliente(lista[i].clienteId, { estado: "gestionado" });
}

export function etiquetaScoring(r: ResultadoScoring): string {
  return {
    observado_requisitos_crediticios: "Observado por requisitos crediticios",
    observado_gastos_retiro: "Observado por gastos de retiro",
    observado_vehiculo_usado: "Observado por vehículo usado",
    observado_presupuesto: "Observado presupuesto",
    observado_otros: "Observado por otros",
    aprobado: "Aprobado",
    pendiente: "Pendiente",
  }[r];
}

// --- Alertas (campanita) ---
export function crearAlerta(input: Omit<Alerta, "id" | "fecha" | "leidaPor">) {
  const lista = leer<Alerta>(K_ALERTAS);
  const nueva: Alerta = { ...input, id: uid(), fecha: new Date().toISOString(), leidaPor: [] };
  lista.push(nueva);
  escribir(K_ALERTAS, lista);
  remote.alertas(input.empresaId, [nueva]);
}

export function listarAlertas(usuario: Usuario, empresaId: string | null): Alerta[] {
  return leer<Alerta>(K_ALERTAS)
    .filter((a) => (!empresaId || a.empresaId === empresaId) && a.rolesDestino.some((r) => usuario.roles.includes(r)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}
export function contarAlertasNoLeidas(usuario: Usuario, empresaId: string | null): number {
  return listarAlertas(usuario, empresaId).filter((a) => !a.leidaPor.includes(usuario.id)).length;
}
export function marcarAlertaLeida(alertaId: string, usuarioId: string) {
  const lista = leer<Alerta>(K_ALERTAS);
  const i = lista.findIndex((a) => a.id === alertaId);
  if (i < 0 || lista[i].leidaPor.includes(usuarioId)) return;
  lista[i] = { ...lista[i], leidaPor: [...lista[i].leidaPor, usuarioId] };
  escribir(K_ALERTAS, lista);
  remote.alertas(lista[i].empresaId, [lista[i]]);
}
export function marcarTodasLeidas(usuario: Usuario, empresaId: string | null) {
  const lista = leer<Alerta>(K_ALERTAS);
  let cambio = false;
  const tocadas: Alerta[] = [];
  lista.forEach((a, i) => {
    const aplica = (!empresaId || a.empresaId === empresaId) && a.rolesDestino.some((r) => usuario.roles.includes(r));
    if (aplica && !a.leidaPor.includes(usuario.id)) {
      lista[i] = { ...a, leidaPor: [...a.leidaPor, usuario.id] };
      tocadas.push(lista[i]);
      cambio = true;
    }
  });
  if (cambio) {
    escribir(K_ALERTAS, lista);
    tocadas.forEach((a) => remote.alertas(a.empresaId, [a]));
  }
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
  fechaAgrupo: string | null;
  emitidas: number | null;
  pagas: number | null;
  impagas: number | null;
  licito: number | null;
  adelanto: number | null;
  porcentaje: number | null;
  debCred: string | null;
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
    // Match por N° de solicitud O por grupo+orden (C4, revisión 2026-07-02): un cliente
    // creado por Adjudicatarios/Ganadores (sin N° de solicitud) se actualiza, no se duplica.
    const i = lista.findIndex(
      (c) =>
        c.empresaId === empresaId &&
        ((f.nroSolicitud && c.solicitud.nroSolicitud === f.nroSolicitud) ||
          (f.grupo && f.orden &&
            normGO(c.solicitud.grupo) === normGO(f.grupo) &&
            normGO(c.solicitud.orden) === normGO(f.orden)))
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
      fechaAgrupo: f.fechaAgrupo,
      emitidas: f.emitidas,
      pagas: f.pagas,
      impagas: f.impagas,
      licito: f.licito,
      adelanto: f.adelanto,
      debCred: f.debCred,
    };
    if (i >= 0) {
      // Actualiza: NO pisa documento (la cartera no lo trae) ni vendedor asignado.
      lista[i] = {
        ...lista[i],
        nombreCompleto: f.nombreCompleto.trim(),
        telefono: f.telefono ?? lista[i].telefono,
        email: f.email ?? lista[i].email,
        estadio: estadioMasAvanzado(lista[i].estadio, estadioDesdeStatus(f.statusCartera, f.statusDesc)),
        solicitud: {
          ...lista[i].solicitud,
          ...solicitud,
          // No borrar el N° de solicitud existente si la fila no trae uno.
          nroSolicitud: solicitud.nroSolicitud ?? lista[i].solicitud.nroSolicitud,
        },
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
  setMeta(`carteraActualizada:${empresaId}`, hoy, empresaId);

  // La misma cartera actualiza la base del Cotizador del adjudicado:
  // "grupo/orden" → [adelanto, licitadas, pct, emitidas, codPlan] (formato de cotizador-db).
  const actCotizador: Record<string, [number, number, string, number, string]> = {};
  for (const f of filas) {
    if (!f.grupo || !f.orden || !f.modelo) continue;
    const key = `${normGO(f.grupo)}/${normGO(f.orden)}`;
    const pct = f.porcentaje == null ? "100,00" : f.porcentaje.toFixed(2).replace(".", ",");
    actCotizador[key] = [f.adelanto ?? 0, f.licito ?? 0, pct, f.emitidas ?? 0, f.modelo];
  }
  if (Object.keys(actCotizador).length) {
    setMeta(`cotizadorAct:${empresaId}`, JSON.stringify(actCotizador), empresaId);
  }
  return rep;
}

// ===================== Fase 4: campañas de WhatsApp =====================

import { getEnviador, renderPlantilla, COSTO_CATEGORIA } from "./whatsapp";
import { colaGestion, esRescindido, GESTIONES, type GestionTipo } from "./gestiones";

export function listarPlantillasWa(empresaId: string): PlantillaWhatsApp[] {
  return leer<PlantillaWhatsApp>(K_PLANTILLAS_WA)
    .filter((t) => t.empresaId === empresaId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function crearPlantillaWa(input: Omit<PlantillaWhatsApp, "id">): PlantillaWhatsApp {
  const t: PlantillaWhatsApp = { ...input, id: uid() };
  const lista = leer<PlantillaWhatsApp>(K_PLANTILLAS_WA);
  lista.push(t);
  escribir(K_PLANTILLAS_WA, lista);
  remote.plantillasWa(input.empresaId, [t]);
  return t;
}

/** Registra o revoca el consentimiento (opt-in). Sin opt-in NO se envía (§9.2). */
export function setOptInWhatsApp(clienteId: string, ok: boolean, canal: string) {
  const c = getCliente(clienteId);
  if (!c) return;
  actualizarCliente(clienteId, { waOptIn: { ok, fecha: new Date().toISOString(), canal } });
}

export type SegmentoCampania = GestionTipo | "cartera";

export const SEGMENTOS_CAMPANIA: { valor: SegmentoCampania; label: string }[] = [
  ...GESTIONES.map((g) => ({ valor: g.tipo as SegmentoCampania, label: g.titulo })),
  { valor: "cartera", label: "Toda la cartera (sin rescindidos)" },
];

export interface PreviaCampania {
  totalSegmento: number;
  sinTelefono: number;
  sinOptIn: number;
  destinatarios: Cliente[];
  costoEstimado: number;
}

/** Calcula destinatarios: segmento → con teléfono → con opt-in (regla dura §9.2). */
export function previaCampania(
  empresaId: string,
  usuario: Usuario,
  segmento: SegmentoCampania,
  categoria: CategoriaPlantilla
): PreviaCampania {
  const todos = listarClientes(empresaId, {}, usuario);
  const base = segmento === "cartera" ? todos.filter((c) => !esRescindido(c)) : colaGestion(todos, segmento);
  const conTel = base.filter((c) => (c.telefono || "").replace(/\D/g, "").length >= 6);
  const destinatarios = conTel.filter((c) => c.waOptIn?.ok === true);
  return {
    totalSegmento: base.length,
    sinTelefono: base.length - conTel.length,
    sinOptIn: conTel.length - destinatarios.length,
    destinatarios,
    costoEstimado: destinatarios.length * COSTO_CATEGORIA[categoria],
  };
}

/** Envía la campaña con el proveedor configurado (hoy: simulado) y la registra. */
export async function enviarCampania(args: {
  empresaId: string;
  usuario: Usuario;
  nombre: string;
  plantilla: PlantillaWhatsApp;
  segmento: SegmentoCampania;
}): Promise<CampaniaWhatsApp> {
  const { empresaId, usuario, nombre, plantilla, segmento } = args;
  const previa = previaCampania(empresaId, usuario, segmento, plantilla.categoria);
  const enviador = getEnviador();
  const hoy = new Date().toISOString();
  const segmentoLabel = SEGMENTOS_CAMPANIA.find((x) => x.valor === segmento)?.label ?? segmento;

  const campania: CampaniaWhatsApp = {
    id: uid(), empresaId, nombre,
    plantillaId: plantilla.id, plantillaNombre: plantilla.nombre, categoria: plantilla.categoria,
    segmento, segmentoLabel, fecha: hoy, creadaPorNombre: usuario.nombre,
    totalSegmento: previa.totalSegmento, sinTelefono: previa.sinTelefono, sinOptIn: previa.sinOptIn,
    enviados: 0, costoEstimado: previa.costoEstimado,
    estado: enviador.esSimulado ? "enviada_simulada" : "enviada",
  };

  const envios: EnvioWhatsApp[] = [];
  for (const c of previa.destinatarios) {
    const mensaje = renderPlantilla(plantilla.cuerpo, c);
    const r = await enviador.enviar(c.telefono!, mensaje);
    envios.push({
      id: uid(), empresaId, campaniaId: campania.id, clienteId: c.id,
      clienteNombre: c.nombreCompleto, telefono: c.telefono!, mensaje,
      estado: r.estado, detalle: r.detalle, fecha: hoy,
      costoEstimado: COSTO_CATEGORIA[plantilla.categoria],
    });
  }
  campania.enviados = envios.filter((e) => e.estado === "enviado").length;

  const camps = leer<CampaniaWhatsApp>(K_CAMPANIAS_WA);
  camps.push(campania);
  escribir(K_CAMPANIAS_WA, camps);
  const todosEnvios = leer<EnvioWhatsApp>(K_ENVIOS_WA);
  todosEnvios.push(...envios);
  escribir(K_ENVIOS_WA, todosEnvios);
  remote.campaniasWa(empresaId, [campania]);
  remote.enviosWa(empresaId, envios);
  return campania;
}

export function listarCampanias(empresaId: string): CampaniaWhatsApp[] {
  return leer<CampaniaWhatsApp>(K_CAMPANIAS_WA)
    .filter((c) => c.empresaId === empresaId)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export function listarEnviosCampania(campaniaId: string): EnvioWhatsApp[] {
  return leer<EnvioWhatsApp>(K_ENVIOS_WA).filter((e) => e.campaniaId === campaniaId);
}
