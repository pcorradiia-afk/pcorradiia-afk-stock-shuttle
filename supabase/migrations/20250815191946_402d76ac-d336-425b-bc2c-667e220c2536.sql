-- Create ENUM types
CREATE TYPE stock_status AS ENUM (
  'disponible', 
  'reservado', 
  'comprometido', 
  'vendido', 
  'entregado', 
  'cancelado', 
  'en_transito', 
  'asignado_fabrica'
);

CREATE TYPE location_type AS ENUM (
  'sucursal_central', 
  'sucursal_norte', 
  'sucursal_sur', 
  'deposito_principal', 
  'deposito_auxiliar', 
  'en_transito'
);

CREATE TYPE hold_type AS ENUM ('reserva_temporal', 'compromiso_venta');

CREATE TYPE hold_status AS ENUM ('activo', 'vencido', 'confirmado', 'cancelado', 'liberado');

CREATE TYPE sale_status AS ENUM ('abierta', 'facturada', 'entregada', 'anulada');

CREATE TYPE import_type AS ENUM ('csv', 'xlsx', 'api');

CREATE TYPE user_role AS ENUM ('administrador', 'ventas', 'logistica', 'gerencia');

CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'status_change', 'import');

CREATE TYPE payment_method AS ENUM ('efectivo', 'transferencia', 'cheque', 'tarjeta_credito', 'tarjeta_debito');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  rol user_role NOT NULL DEFAULT 'ventas',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vin TEXT UNIQUE,
  codigo_fabrica TEXT NOT NULL,
  pedido_fabrica TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  version TEXT NOT NULL,
  anio_modelo INTEGER NOT NULL,
  color_exterior TEXT NOT NULL,
  color_interior TEXT,
  estado_stock stock_status NOT NULL DEFAULT 'disponible',
  ubicacion location_type NOT NULL DEFAULT 'sucursal_central',
  lote TEXT,
  fecha_arribo_estimada DATE,
  fecha_arribo_real DATE,
  precio_lista DECIMAL(12,2) NOT NULL DEFAULT 0,
  bonificacion DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo DECIMAL(12,2) NOT NULL DEFAULT 0,
  impuestos DECIMAL(12,2) NOT NULL DEFAULT 0,
  precio_minimo DECIMAL(12,2),
  version_lock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create holds table
CREATE TABLE public.holds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  tipo hold_type NOT NULL,
  numero_operacion TEXT,
  cliente_nombre TEXT,
  cliente_doc TEXT,
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_vencimiento TIMESTAMP WITH TIME ZONE NOT NULL,
  estado hold_status NOT NULL DEFAULT 'activo',
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  hold_id UUID REFERENCES public.holds(id) ON DELETE SET NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_doc TEXT NOT NULL,
  cliente_telefono TEXT,
  cliente_email TEXT,
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  precio_cierre DECIMAL(12,2) NOT NULL,
  sena DECIMAL(12,2) NOT NULL DEFAULT 0,
  medio_pago payment_method NOT NULL,
  fecha_venta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fecha_entrega_estimada DATE,
  fecha_entrega_real DATE,
  estado sale_status NOT NULL DEFAULT 'abierta',
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create imports table
CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo import_type NOT NULL,
  archivo_nombre TEXT,
  total_registros INTEGER NOT NULL DEFAULT 0,
  nuevos INTEGER NOT NULL DEFAULT 0,
  actualizados INTEGER NOT NULL DEFAULT 0,
  duplicados INTEGER NOT NULL DEFAULT 0,
  errores INTEGER NOT NULL DEFAULT 0,
  iniciado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  log_detalle JSONB,
  completado BOOLEAN NOT NULL DEFAULT false
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entidad TEXT NOT NULL,
  entidad_id TEXT NOT NULL,
  accion audit_action NOT NULL,
  antes JSONB,
  despues JSONB,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for units (all authenticated users can view)
CREATE POLICY "Authenticated users can view units" ON public.units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin and logistics can manage units" ON public.units
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND rol IN ('administrador', 'logistica')
    )
  );

-- Create RLS policies for holds
CREATE POLICY "Users can view all holds" ON public.holds
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sales users can create holds" ON public.holds
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND rol IN ('administrador', 'ventas', 'gerencia')
    )
  );

CREATE POLICY "Users can update their own holds" ON public.holds
  FOR UPDATE TO authenticated USING (
    vendedor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND rol IN ('administrador', 'gerencia')
    )
  );

-- Create RLS policies for sales
CREATE POLICY "Users can view all sales" ON public.sales
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sales users can create sales" ON public.sales
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND rol IN ('administrador', 'ventas', 'gerencia')
    )
  );

CREATE POLICY "Users can update their own sales" ON public.sales
  FOR UPDATE TO authenticated USING (
    vendedor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND rol IN ('administrador', 'gerencia')
    )
  );

-- Create RLS policies for imports
CREATE POLICY "Users can view imports" ON public.imports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage imports" ON public.imports
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND rol = 'administrador'
    )
  );

-- Create RLS policies for audit_logs
CREATE POLICY "Admin can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND rol = 'administrador'
    )
  );

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holds_updated_at
  BEFORE UPDATE ON public.holds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, apellido, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'apellido', 'Nuevo'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'ventas')::user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();