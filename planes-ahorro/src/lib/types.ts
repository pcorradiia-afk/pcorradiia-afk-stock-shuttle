// Modelo de dominio — Fase 0 (organización, accesos) + tipos compartidos.
// Ver planes-ahorro/CLAUDE.md §3 para el modelo completo.

export type RolId =
  | "super_admin"
  | "recepcion"
  | "vendedor"
  | "supervisor_ventas"
  | "administracion"
  | "supervisor_administracion"
  | "entregas"
  | "analista_suscripciones"
  | "gerencia";

export type TipoPerfil = "concesionario" | "terciarizada";

export type Estadio =
  | "scoring"
  | "agrupamiento"
  | "gestion_cliente"
  | "adjudicacion"
  | "pedido"
  | "patentamiento"
  | "entrega";

export interface Empresa {
  id: string;
  nombre: string;
  cuit: string;
  nombreComercial: string;
  activo: boolean;
}

export interface Sucursal {
  id: string;
  empresaId: string;
  nombre: string;
  activo: boolean;
}

export interface Equipo {
  id: string;
  sucursalId: string;
  nombre: string;
  tipo: "ventas" | "administracion";
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  empresaId: string;
  sucursalId: string | null;
  equipoId: string | null;
  tipoPerfil: TipoPerfil;
  roles: RolId[];
  /** Gestión a la que pertenece (solo perfil terciarizada): aísla qué clientes ve. */
  gestionId?: string | null;
  /** Empresas que puede operar con un único login (alcance multiempresa). "grupo" = todas. */
  alcance: "grupo" | string[];
  /** Estadios de administración habilitados (solo aplica a rol administración). */
  estadios: Estadio[];
  activo: boolean;
}

export interface RegistroAuditoria {
  id: string;
  usuarioId: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  fechaHora: string;
  detalle?: string;
}

// --------- Fase 1: cliente / ahorrista, solicitud y bitácora ---------

export type EstadoCliente = "lead" | "vendido" | "gestionado" | "cartera";
export type NacidoComo = "lead_interno" | "importado_cartera" | "importado_ovalo";
export type TipoDocumento = "DNI" | "CUIT";

export interface Solicitud {
  nroSolicitud: string | null; // ÚNICO E IRREPETIBLE
  grupo: string | null;
  orden: string | null;
  plan: string | null;
  modelo: string | null;
  statusCartera: string | null; // código de FIS (2, 4, 9, ...)
  statusDesc: string | null; // "AHORRISTA AL DIA", etc.
  valorMovil: number | null;
  // Datos de cuotas/gestión que vienen en la cartera (alimentan las Gestiones)
  fechaAgrupo?: string | null; // dd/mm/aaaa
  emitidas?: number | null;
  pagas?: number | null;
  impagas?: number | null;
  licito?: number | null;
  adelanto?: number | null;
  debCred?: string | null; // adhesión a débito automático
  // Datos del export "Solicitudes" de VOPA (solicitudes enviadas a fábrica)
  nroManual?: string | null; // NRO_MANUAL: el número que muestra la pantalla de VOPA
  statusVopa?: string | null; // "Nueva sin enviar", "Enviada", etc.
  firmaPendiente?: boolean | null;
  fechaCargaVopa?: string | null;
  fechaEnvioVopa?: string | null;
}

// Datos que llegan de los archivos de adjudicación (Ganadores_Acto y Adjudicatarios_Sin_Pedido).
export interface DatosAdjudicacion {
  nroActo?: string | null;
  tipoAdjudicacion?: string | null; // "Reemplazo Titular", sorteo, licitación…
  condicional?: string | null;
  importeOferta?: number | null;
  fechaAceptacion?: string | null;
  aging?: number | null; // días de adjudicado sin pedido
  puedeIngresarPedido?: boolean | null;
  observaciones?: string | null; // ej. "Adeuda Alícuota + Rq Cred"
}

// Movimiento de la cuenta corriente de la concesionaria con la administradora (cta_cte_*.txt).
export interface MovimientoCtaCte {
  id: string;
  empresaId: string;
  concesionario: string;
  fecha: string; // dd/mm/aaaa
  codigo: string; // ITP, ADJ, SXS, GPS, F03, …
  descripcion: string;
  dc: "D" | "C";
  importe: number;
  referencia: string; // 16 dígitos crudos
  grupo: string | null;
  orden: string | null;
}

export interface Cliente {
  id: string;
  empresaId: string;
  nombreCompleto: string;
  documento: string | null; // DNI o CUIT — ÚNICO por cliente
  tipoDocumento: TipoDocumento | null;
  telefono: string | null;
  email: string | null;
  origenDato: string | null;
  vendedorId: string | null;
  /** Gestión terciarizada dueña del cliente (null = gestión propia del concesionario). */
  gestionId?: string | null;
  estado: EstadoCliente;
  estadio: Estadio;
  nacidoComo: NacidoComo;
  fechaAlta: string;
  solicitud: Solicitud;
  // Domicilio (se enriquece con el archivo adh_*)
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigoPostal?: string | null;
  // Datos de adjudicación (Ganadores_Acto / Adjudicatarios_Sin_Pedido)
  adjudicacion?: DatosAdjudicacion;
  /** Consentimiento WhatsApp (sin opt-in NO se le puede enviar — regla §9.2). */
  waOptIn?: { ok: boolean; fecha: string; canal: string } | null;
  // Gestión comercial (Fase 2)
  pruebaManejo: boolean | null;
  necesidades: string | null;
  planId: string | null;
  presupuestoNombre: string | null;
  fechaVenta: string | null;
  gestionAdmin?: GestionAdmin;
}

// --------- Fase 3: estadios de administración ---------

export type ResultadoScoring =
  | "observado_requisitos_crediticios"
  | "observado_gastos_retiro"
  | "observado_vehiculo_usado"
  | "observado_presupuesto"
  | "observado_otros"
  | "aprobado"
  | "pendiente";

export interface ObservacionScoring {
  id: string;
  clienteId: string;
  fechaHora: string;
  usuarioId: string;
  usuarioNombre: string;
  resultado: ResultadoScoring;
  // Gestión de la observación por el Supervisor de ventas
  gestionResultado: string | null;
  gestionFechaHora: string | null;
  gestionUsuarioNombre: string | null;
}

export interface Alerta {
  id: string;
  empresaId: string;
  rolesDestino: RolId[]; // a qué roles les aparece
  /** Si está seteado, la alerta es SOLO para ese usuario (ej: recordatorio vencido). */
  usuarioDestinoId?: string | null;
  tipo: string;
  clienteId: string | null;
  clienteNombre: string | null;
  mensaje: string;
  leidaPor: string[]; // ids de usuarios que ya la leyeron
  fecha: string;
}

// Recordatorio de gestión con fecha (calendario de tareas de /gestiones).
export interface Recordatorio {
  id: string;
  empresaId: string;
  usuarioId: string; // destinatario (a quién le suena la campanita)
  usuarioNombre: string;
  creadoPorNombre: string;
  fecha: string; // "aaaa-mm-dd" — día en que hay que hacer la gestión
  nota: string;
  clienteId: string | null;
  clienteNombre: string | null;
  gestionTipo: string | null; // cola de gestión relacionada (opcional)
  completado: boolean;
  fechaCompletado: string | null;
  avisado: boolean; // ya se generó la alerta de vencimiento (para no duplicar)
}

// Liquidación de comisiones a comercializadoras (gestiones terciarizadas).
export interface ItemComision {
  clienteId: string;
  nombre: string;
  nroSolicitud: string | null;
  fechaVenta: string | null;
  base: number | null; // valor móvil u otra base
  comision: number;
}
export interface LiquidacionComision {
  id: string;
  empresaId: string;
  comercializadora: string; // nombre de la gestión (coincide con gestionId de los clientes)
  periodo: string; // "aaaa-mm"
  esquema: { tipo: "monto_fijo" | "pct_valor_movil"; valor: number };
  items: ItemComision[];
  total: number;
  estado: "borrador" | "aprobada" | "pagada";
  fechaCreacion: string;
  creadaPorNombre: string;
  fechaPago: string | null;
}

// Datos registrados en cada estadio (todos opcionales; se completan a medida que avanza).
export interface GestionAdmin {
  agrupamientoFecha?: string | null;
  agrupamientoNota?: string | null;
  adjRequisitos?: string | null;
  adjPagos?: string | null;
  adjInformado?: boolean;
  pedidoFecha?: string | null;
  pedidoModelo?: string | null;
  pedidoColores?: string | null;
  patFechaFactura?: string | null;
  patInformeGastos?: boolean;
  patCitaFirma?: boolean;
  patPaseGestoria?: boolean;
  patFinalizado?: boolean;
  entregaFechaContacto?: string | null;
  entregaTurno?: string | null;
  entregaCerrado?: boolean;
}

// --------- Fase 4: campañas de WhatsApp ---------

export type CategoriaPlantilla = "marketing" | "utility" | "authentication";

export interface PlantillaWhatsApp {
  id: string;
  empresaId: string;
  nombre: string;
  categoria: CategoriaPlantilla;
  idioma: string; // "es_AR"
  cuerpo: string; // texto con variables {{nombre}}, {{modelo}}, {{grupo}}, {{orden}}
  aprobadaMeta: boolean; // los envíos proactivos requieren plantilla pre-aprobada por Meta
  activo: boolean;
}

export interface CampaniaWhatsApp {
  id: string;
  empresaId: string;
  nombre: string;
  plantillaId: string;
  plantillaNombre: string;
  categoria: CategoriaPlantilla;
  segmento: string; // gestión (bienvenida/mora/…) o "cartera"
  segmentoLabel: string;
  fecha: string;
  creadaPorNombre: string;
  totalSegmento: number;
  sinTelefono: number;
  sinOptIn: number;
  enviados: number;
  costoEstimado: number;
  estado: "enviada_simulada" | "enviada";
}

export interface EnvioWhatsApp {
  id: string;
  empresaId: string;
  campaniaId: string;
  clienteId: string;
  clienteNombre: string;
  telefono: string;
  mensaje: string;
  estado: "enviado" | "entregado" | "leido" | "error";
  detalle: string;
  fecha: string;
  costoEstimado: number;
}

// Catálogo de planes (precargado; el vendedor elige de la lista). Base: solapa "Modelo".
export interface Plan {
  id: string;
  empresaId: string;
  codigo: string; // ej. R120, 8084, EC100
  nombre: string;
  modelo: string;
  cuotas: number | null;
  activo: boolean;
}

// Tarea de call center: un cliente asignado a un colaborador dentro de una gestión.
// Se completa sola cuando el colaborador registra un contacto en la bitácora.
export interface Tarea {
  id: string;
  empresaId: string;
  clienteId: string;
  clienteNombre: string;
  gestionTipo: string; // tipo de gestión (bienvenida, mora, …) u "otro"
  asignadoId: string;
  asignadoNombre: string;
  creadaPorNombre: string;
  fechaAsignacion: string;
  estado: "pendiente" | "completada";
  fechaCompletada: string | null;
  resultado: string | null;
}

export interface Comunicacion {
  id: string;
  clienteId: string;
  usuarioId: string;
  usuarioNombre: string;
  fechaHora: string;
  tipoContacto: string; // Llamado, WhatsApp, Email, Presencial, ...
  detalle: string; // lo conversado
  proximaAccion: string | null;
  estadio: Estadio;
}
