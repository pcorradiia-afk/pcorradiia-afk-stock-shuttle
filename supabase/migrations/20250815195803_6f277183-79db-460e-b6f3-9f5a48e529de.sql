-- Simple seed data for testing (just units, no profile dependencies)
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
 '2024-10-08', 'KM8J3CA46JU123456', 'LOTE2024G');

COMMIT;