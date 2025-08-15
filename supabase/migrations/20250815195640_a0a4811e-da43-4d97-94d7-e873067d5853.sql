-- Create seed data for testing

-- Sample data for units (testing purposes)
INSERT INTO public.units (
  codigo_fabrica, pedido_fabrica, marca, modelo, version, anio_modelo,
  color_exterior, color_interior, estado_stock, ubicacion, 
  precio_lista, precio_minimo, costo, bonificacion, impuestos,
  fecha_arribo_estimada, vin, lote
) VALUES 
-- Toyota units
('TOY001', 'PED2024001', 'Toyota', 'Corolla', 'XEI 1.8 CVT', 2024, 
 'Blanco Perla', 'Negro', 'disponible', 'sucursal_central',
 28500000, 26000000, 22000000, 500000, 1200000,
 '2024-09-15', '1HGBH41JXMN109186', 'LOTE2024A'),

('TOY002', 'PED2024002', 'Toyota', 'Hilux', 'SRV 4x4 2.8 TD', 2024,
 'Gris Oscuro', 'Negro', 'en_transito', 'deposito_principal',
 52000000, 48000000, 40000000, 1000000, 2500000,
 '2024-10-01', null, 'LOTE2024A'),

('TOY003', 'PED2024003', 'Toyota', 'RAV4', 'Hybrid AWD', 2024,
 'Rojo', 'Beige', 'reservado', 'sucursal_norte',
 45000000, 42000000, 35000000, 800000, 2000000,
 '2024-09-20', '2T1BURHE0KC123456', 'LOTE2024B'),

-- Ford units  
('FOR001', 'PED2024004', 'Ford', 'Focus', 'Titanium 2.0', 2024,
 'Azul Metalizado', 'Gris', 'disponible', 'sucursal_sur',
 26000000, 24000000, 20000000, 400000, 1100000,
 '2024-09-25', '1FADP3F23JL123789', 'LOTE2024C'),

('FOR002', 'PED2024005', 'Ford', 'Ranger', 'Limited 3.2 4x4', 2024,
 'Negro', 'Negro', 'comprometido', 'deposito_auxiliar',
 48000000, 45000000, 38000000, 900000, 2200000,
 '2024-10-05', null, 'LOTE2024C'),

-- Chevrolet units
('CHE001', 'PED2024006', 'Chevrolet', 'Onix', 'Premier 1.0 Turbo', 2024,
 'Blanco', 'Negro', 'disponible', 'sucursal_central',
 19500000, 18000000, 15000000, 300000, 800000,
 '2024-09-30', '9BWZZZ377VT004251', 'LOTE2024D'),

('CHE002', 'PED2024007', 'Chevrolet', 'S10', 'High Country 2.8 TD', 2024,
 'Plata', 'Negro', 'vendido', 'sucursal_norte',
 47000000, 44000000, 37000000, 850000, 2100000,
 '2024-08-15', '1GCGTCE33J1123456', 'LOTE2024D'),

-- Volkswagen units
('VW001', 'PED2024008', 'Volkswagen', 'Polo', 'Highline 1.6 MSI', 2024,
 'Gris', 'Beige', 'disponible', 'sucursal_sur',
 23000000, 21000000, 18000000, 350000, 950000,
 '2024-10-10', 'WVWZZZ6RZJW123456', 'LOTE2024E'),

('VW002', 'PED2024009', 'Volkswagen', 'Amarok', 'V6 Extreme 4x4', 2024,
 'Azul Oscuro', 'Negro', 'en_transito', 'deposito_principal',
 55000000, 52000000, 45000000, 1100000, 2700000,
 '2024-10-15', null, 'LOTE2024E'),

-- Nissan units
('NIS001', 'PED2024010', 'Nissan', 'Versa', 'Exclusive CVT', 2024,
 'Rojo', 'Gris', 'disponible', 'sucursal_central',
 21000000, 19500000, 16500000, 320000, 900000,
 '2024-09-18', 'JN1AZ4EH5JM123456', 'LOTE2024F'),

('NIS002', 'PED2024011', 'Nissan', 'Frontier', 'Pro-4X 4x4', 2024,
 'Blanco', 'Negro', 'asignado_fabrica', 'en_transito',
 50000000, 47000000, 40000000, 950000, 2400000,
 '2024-11-01', null, 'LOTE2024F'),

-- Hyundai units
('HYU001', 'PED2024012', 'Hyundai', 'Creta', 'Limited 1.6 Turbo', 2024,
 'Beige', 'Marrón', 'disponible', 'deposito_auxiliar',
 32000000, 29000000, 25000000, 600000, 1400000,
 '2024-09-22', 'KMHJ381DPMU123456', 'LOTE2024G'),

('HYU002', 'PED2024013', 'Hyundai', 'Tucson', 'N Line 1.6 Turbo', 2024,
 'Negro Brillante', 'Negro', 'reservado', 'sucursal_norte',
 42000000, 39000000, 33000000, 750000, 1800000,
 '2024-10-08', 'KM8J3CA46JU123456', 'LOTE2024G'),

-- Fiat units
('FIA001', 'PED2024014', 'Fiat', 'Argo', 'Precision 1.8 MT', 2024,
 'Gris Claro', 'Negro', 'disponible', 'sucursal_sur',
 18500000, 17000000, 14500000, 280000, 750000,
 '2024-09-28', '93WECRLF8MD123456', 'LOTE2024H'),

('FIA002', 'PED2024015', 'Fiat', 'Toro', 'Ranch 2.0 TD 4x4', 2024,
 'Marrón', 'Beige', 'entregado', 'sucursal_central',
 44000000, 41000000, 35000000, 800000, 1900000,
 '2024-08-10', '9BD15842UM0123456', 'LOTE2024H'),

-- Renault units
('REN001', 'PED2024016', 'Renault', 'Sandero', 'Zen 1.6 CVT', 2024,
 'Azul', 'Gris', 'cancelado', 'deposito_principal',
 20000000, 18500000, 15500000, 300000, 850000,
 '2024-09-12', 'VF1BJA00566123456', 'LOTE2024I'),

('REN002', 'PED2024017', 'Renault', 'Duster', 'Outsider 1.6 4x2', 2024,
 'Verde Oliva', 'Negro', 'disponible', 'sucursal_norte',
 27000000, 25000000, 21000000, 450000, 1150000,
 '2024-10-12', 'UU15DGFA1MW123456', 'LOTE2024I'),

-- Peugeot units
('PEU001', 'PED2024018', 'Peugeot', '208', 'GT 1.6 THP', 2024,
 'Blanco Nacarado', 'Rojo', 'disponible', 'sucursal_sur',
 24000000, 22000000, 19000000, 400000, 1000000,
 '2024-09-26', 'VF3C5HWZ8NS123456', 'LOTE2024J'),

('PEU002', 'PED2024019', 'Peugeot', '3008', 'GT Line 1.6 THP', 2024,
 'Gris Artense', 'Negro', 'en_transito', 'deposito_auxiliar',
 38000000, 35000000, 30000000, 700000, 1600000,
 '2024-10-20', null, 'LOTE2024J'),

-- Additional units for variety
('MIT001', 'PED2024020', 'Mitsubishi', 'ASX', '2.0 CVT 4x2', 2024,
 'Plata Metalizado', 'Negro', 'disponible', 'sucursal_central',
 30000000, 27500000, 23500000, 550000, 1300000,
 '2024-10-05', 'JA4J23A1XJZ123456', 'LOTE2024K');

-- Create sample profiles for different roles (for testing)
-- Note: These would normally be created through the auth system, but we'll create them directly for testing
INSERT INTO public.profiles (id, email, nombre, apellido, rol, activo) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@concesionario.com', 'Carlos', 'Rodríguez', 'administrador', true),
('550e8400-e29b-41d4-a716-446655440002', 'ventas1@concesionario.com', 'María', 'González', 'ventas', true),
('550e8400-e29b-41d4-a716-446655440003', 'logistica@concesionario.com', 'Juan', 'Pérez', 'logistica', true),
('550e8400-e29b-41d4-a716-446655440004', 'gerencia@concesionario.com', 'Ana', 'Martínez', 'gerencia', true),
('550e8400-e29b-41d4-a716-446655440005', 'ventas2@concesionario.com', 'Pedro', 'López', 'ventas', true);

-- Create some sample holds
INSERT INTO public.holds (
  unit_id, tipo, vendedor_id, fecha_vencimiento, estado,
  cliente_doc, cliente_nombre, numero_operacion, observaciones
) 
SELECT 
  u.id,
  'reserva_temporal',
  '550e8400-e29b-41d4-a716-446655440002', -- María González (ventas)
  CURRENT_DATE + INTERVAL '7 days',
  'activo',
  '12345678',
  'Juan Cliente',
  'OP-2024-001',
  'Reserva temporal por 7 días'
FROM public.units u 
WHERE u.estado_stock = 'reservado' 
LIMIT 1;

-- Create sample sales
INSERT INTO public.sales (
  unit_id, vendedor_id, cliente_doc, cliente_nombre, cliente_email, cliente_telefono,
  precio_cierre, sena, medio_pago, estado, fecha_entrega_estimada,
  observaciones
)
SELECT 
  u.id,
  '550e8400-e29b-41d4-a716-446655440002', -- María González (ventas)
  '87654321',
  'Ana Compradora',
  'ana.compradora@email.com',
  '+54911234567',
  u.precio_lista - 500000,
  2000000,
  'transferencia',
  'facturada',
  CURRENT_DATE + INTERVAL '15 days',
  'Venta cerrada con descuento especial'
FROM public.units u 
WHERE u.estado_stock = 'vendido' 
LIMIT 1;

-- Create sample audit logs
INSERT INTO public.audit_logs (
  entidad, entidad_id, accion, usuario_id, antes, despues
)
SELECT 
  'units',
  u.id,
  'create',
  '550e8400-e29b-41d4-a716-446655440003', -- Juan Pérez (logística)
  null,
  to_jsonb(u)
FROM public.units u 
LIMIT 5;