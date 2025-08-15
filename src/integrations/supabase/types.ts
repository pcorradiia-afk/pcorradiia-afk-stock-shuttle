export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          accion: Database["public"]["Enums"]["audit_action"]
          antes: Json | null
          despues: Json | null
          entidad: string
          entidad_id: string
          fecha: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: Database["public"]["Enums"]["audit_action"]
          antes?: Json | null
          despues?: Json | null
          entidad: string
          entidad_id: string
          fecha?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: Database["public"]["Enums"]["audit_action"]
          antes?: Json | null
          despues?: Json | null
          entidad?: string
          entidad_id?: string
          fecha?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      holds: {
        Row: {
          cliente_doc: string | null
          cliente_nombre: string | null
          created_at: string
          estado: Database["public"]["Enums"]["hold_status"]
          fecha_inicio: string
          fecha_vencimiento: string
          id: string
          numero_operacion: string | null
          observaciones: string | null
          tipo: Database["public"]["Enums"]["hold_type"]
          unit_id: string
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          cliente_doc?: string | null
          cliente_nombre?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["hold_status"]
          fecha_inicio?: string
          fecha_vencimiento: string
          id?: string
          numero_operacion?: string | null
          observaciones?: string | null
          tipo: Database["public"]["Enums"]["hold_type"]
          unit_id: string
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          cliente_doc?: string | null
          cliente_nombre?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["hold_status"]
          fecha_inicio?: string
          fecha_vencimiento?: string
          id?: string
          numero_operacion?: string | null
          observaciones?: string | null
          tipo?: Database["public"]["Enums"]["hold_type"]
          unit_id?: string
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holds_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          actualizados: number
          archivo_nombre: string | null
          completado: boolean
          duplicados: number
          errores: number
          fecha: string
          id: string
          iniciado_por: string
          log_detalle: Json | null
          nuevos: number
          tipo: Database["public"]["Enums"]["import_type"]
          total_registros: number
        }
        Insert: {
          actualizados?: number
          archivo_nombre?: string | null
          completado?: boolean
          duplicados?: number
          errores?: number
          fecha?: string
          id?: string
          iniciado_por: string
          log_detalle?: Json | null
          nuevos?: number
          tipo: Database["public"]["Enums"]["import_type"]
          total_registros?: number
        }
        Update: {
          actualizados?: number
          archivo_nombre?: string | null
          completado?: boolean
          duplicados?: number
          errores?: number
          fecha?: string
          id?: string
          iniciado_por?: string
          log_detalle?: Json | null
          nuevos?: number
          tipo?: Database["public"]["Enums"]["import_type"]
          total_registros?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          email: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string
          email: string
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          email?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          cliente_doc: string
          cliente_email: string | null
          cliente_nombre: string
          cliente_telefono: string | null
          created_at: string
          estado: Database["public"]["Enums"]["sale_status"]
          fecha_entrega_estimada: string | null
          fecha_entrega_real: string | null
          fecha_venta: string
          hold_id: string | null
          id: string
          medio_pago: Database["public"]["Enums"]["payment_method"]
          observaciones: string | null
          precio_cierre: number
          sena: number
          unit_id: string
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          cliente_doc: string
          cliente_email?: string | null
          cliente_nombre: string
          cliente_telefono?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["sale_status"]
          fecha_entrega_estimada?: string | null
          fecha_entrega_real?: string | null
          fecha_venta?: string
          hold_id?: string | null
          id?: string
          medio_pago: Database["public"]["Enums"]["payment_method"]
          observaciones?: string | null
          precio_cierre: number
          sena?: number
          unit_id: string
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          cliente_doc?: string
          cliente_email?: string | null
          cliente_nombre?: string
          cliente_telefono?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["sale_status"]
          fecha_entrega_estimada?: string | null
          fecha_entrega_real?: string | null
          fecha_venta?: string
          hold_id?: string | null
          id?: string
          medio_pago?: Database["public"]["Enums"]["payment_method"]
          observaciones?: string | null
          precio_cierre?: number
          sena?: number
          unit_id?: string
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          anio_modelo: number
          bonificacion: number
          codigo_fabrica: string
          color_exterior: string
          color_interior: string | null
          costo: number
          created_at: string
          estado_stock: Database["public"]["Enums"]["stock_status"]
          fecha_arribo_estimada: string | null
          fecha_arribo_real: string | null
          id: string
          impuestos: number
          lote: string | null
          marca: string
          modelo: string
          pedido_fabrica: string
          precio_lista: number
          precio_minimo: number | null
          ubicacion: Database["public"]["Enums"]["location_type"]
          updated_at: string
          version: string
          version_lock: number
          vin: string | null
        }
        Insert: {
          anio_modelo: number
          bonificacion?: number
          codigo_fabrica: string
          color_exterior: string
          color_interior?: string | null
          costo?: number
          created_at?: string
          estado_stock?: Database["public"]["Enums"]["stock_status"]
          fecha_arribo_estimada?: string | null
          fecha_arribo_real?: string | null
          id?: string
          impuestos?: number
          lote?: string | null
          marca: string
          modelo: string
          pedido_fabrica: string
          precio_lista?: number
          precio_minimo?: number | null
          ubicacion?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
          version: string
          version_lock?: number
          vin?: string | null
        }
        Update: {
          anio_modelo?: number
          bonificacion?: number
          codigo_fabrica?: string
          color_exterior?: string
          color_interior?: string | null
          costo?: number
          created_at?: string
          estado_stock?: Database["public"]["Enums"]["stock_status"]
          fecha_arribo_estimada?: string | null
          fecha_arribo_real?: string | null
          id?: string
          impuestos?: number
          lote?: string | null
          marca?: string
          modelo?: string
          pedido_fabrica?: string
          precio_lista?: number
          precio_minimo?: number | null
          ubicacion?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
          version?: string
          version_lock?: number
          vin?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      audit_action: "create" | "update" | "delete" | "status_change" | "import"
      hold_status:
        | "activo"
        | "vencido"
        | "confirmado"
        | "cancelado"
        | "liberado"
      hold_type: "reserva_temporal" | "compromiso_venta"
      import_type: "csv" | "xlsx" | "api"
      location_type:
        | "sucursal_central"
        | "sucursal_norte"
        | "sucursal_sur"
        | "deposito_principal"
        | "deposito_auxiliar"
        | "en_transito"
      payment_method:
        | "efectivo"
        | "transferencia"
        | "cheque"
        | "tarjeta_credito"
        | "tarjeta_debito"
      sale_status: "abierta" | "facturada" | "entregada" | "anulada"
      stock_status:
        | "disponible"
        | "reservado"
        | "comprometido"
        | "vendido"
        | "entregado"
        | "cancelado"
        | "en_transito"
        | "asignado_fabrica"
      user_role: "administrador" | "ventas" | "logistica" | "gerencia"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_action: ["create", "update", "delete", "status_change", "import"],
      hold_status: ["activo", "vencido", "confirmado", "cancelado", "liberado"],
      hold_type: ["reserva_temporal", "compromiso_venta"],
      import_type: ["csv", "xlsx", "api"],
      location_type: [
        "sucursal_central",
        "sucursal_norte",
        "sucursal_sur",
        "deposito_principal",
        "deposito_auxiliar",
        "en_transito",
      ],
      payment_method: [
        "efectivo",
        "transferencia",
        "cheque",
        "tarjeta_credito",
        "tarjeta_debito",
      ],
      sale_status: ["abierta", "facturada", "entregada", "anulada"],
      stock_status: [
        "disponible",
        "reservado",
        "comprometido",
        "vendido",
        "entregado",
        "cancelado",
        "en_transito",
        "asignado_fabrica",
      ],
      user_role: ["administrador", "ventas", "logistica", "gerencia"],
    },
  },
} as const
