export type StockStatus = 
  | 'disponible' 
  | 'reservado' 
  | 'comprometido' 
  | 'vendido' 
  | 'entregado' 
  | 'cancelado' 
  | 'en_transito' 
  | 'asignado_fabrica';

export type LocationType = 
  | 'sucursal_central' 
  | 'sucursal_norte' 
  | 'sucursal_sur' 
  | 'deposito_principal' 
  | 'deposito_auxiliar' 
  | 'en_transito';

export type HoldType = 'reserva_temporal' | 'compromiso_venta';

export type HoldStatus = 'activo' | 'vencido' | 'confirmado' | 'cancelado' | 'liberado';

export type SaleStatus = 'abierta' | 'facturada' | 'entregada' | 'anulada';

export type ImportType = 'csv' | 'xlsx' | 'api';

export type UserRole = 'administrador' | 'ventas' | 'logistica' | 'gerencia';

export type AuditAction = 'create' | 'update' | 'delete' | 'status_change' | 'import';

export type PaymentMethod = 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta_credito' | 'tarjeta_debito';

export interface Profile {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  vin?: string;
  codigo_fabrica: string;
  pedido_fabrica: string;
  marca: string;
  modelo: string;
  version: string;
  anio_modelo: number;
  color_exterior: string;
  color_interior?: string;
  estado_stock: StockStatus;
  ubicacion: LocationType;
  lote?: string;
  fecha_arribo_estimada?: string;
  fecha_arribo_real?: string;
  precio_lista: number;
  bonificacion: number;
  costo: number;
  impuestos: number;
  precio_minimo?: number;
  version_lock: number;
  created_at: string;
  updated_at: string;
}

export interface Hold {
  id: string;
  unit_id: string;
  tipo: HoldType;
  numero_operacion?: string;
  cliente_nombre?: string;
  cliente_doc?: string;
  vendedor_id: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  estado: HoldStatus;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  unit?: Unit;
  vendedor?: Profile;
}

export interface Sale {
  id: string;
  unit_id: string;
  hold_id?: string;
  cliente_nombre: string;
  cliente_doc: string;
  cliente_telefono?: string;
  cliente_email?: string;
  vendedor_id: string;
  precio_cierre: number;
  sena: number;
  medio_pago: PaymentMethod;
  fecha_venta: string;
  fecha_entrega_estimada?: string;
  fecha_entrega_real?: string;
  estado: SaleStatus;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  unit?: Unit;
  vendedor?: Profile;
  hold?: Hold;
}

export interface Import {
  id: string;
  tipo: ImportType;
  archivo_nombre?: string;
  total_registros: number;
  nuevos: number;
  actualizados: number;
  duplicados: number;
  errores: number;
  iniciado_por: string;
  fecha: string;
  log_detalle?: any;
  completado: boolean;
  usuario?: Profile;
}

export interface AuditLog {
  id: string;
  entidad: string;
  entidad_id: string;
  accion: AuditAction;
  antes?: any;
  despues?: any;
  usuario_id?: string;
  fecha: string;
  ip_address?: string;
  user_agent?: string;
  usuario?: Profile;
}