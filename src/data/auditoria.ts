// Programa de auditoría mensual · Administración Grupo Fiorasi.
// Catálogo de controles recurrentes enviado por la gerencia de Administración.

export interface ControlAuditoria {
  nro: number;
  /** Tarea o proceso a controlar. */
  tarea: string;
  /** Frecuencia del control (texto original). */
  frecuencia: string;
  /** Evidencia esperada del control. */
  evidencia: string;
  /** Alerta sugerida ante desvíos. */
  alerta: string;
}

export const CONTROLES_AUDITORIA: ControlAuditoria[] = [
  { nro: 1, tarea: "Vencimientos impositivos del mes y registraciones", frecuencia: "Mensual", evidencia: "PDF con vencimientos del mes / asiento contable", alerta: "Alertar fechas importantes de pagos o si hay vencimientos sin registrar" },
  { nro: 2, tarea: "Vencimientos de préstamos y registraciones", frecuencia: "Mensual / según vencimiento", evidencia: "Detalle de cuotas, comprobante de pago y asiento", alerta: "Alertar préstamos vencidos o pagos sin registrar" },
  { nro: 3, tarea: "Conciliación de retenciones de Ganancias, IVA y SUSS entre contabilidad y ARCA", frecuencia: "Mensual", evidencia: "Conciliación contable vs. ARCA", alerta: "Alertar diferencias, retenciones no tomadas o saldos pendientes" },
  { nro: 4, tarea: "Registro de asiento de sueldos y registro del pago", frecuencia: "Mensual", evidencia: "Asiento de sueldos, recibos, F.931 y comprobantes de pago", alerta: "Alertar si falta asiento, pago o diferencia con liquidación" },
  { nro: 5, tarea: "Registro de pagos y asientos de depósitos judiciales", frecuencia: "Mensual", evidencia: "Comprobante judicial y asiento contable", alerta: "Alertar pagos sin asiento o asientos sin comprobante" },
  { nro: 6, tarea: "Registro de pagos y asientos de boletas sindicales", frecuencia: "Mensual", evidencia: "Boletas sindicales, comprobantes de pago y asiento", alerta: "Alertar boletas vencidas, impagas o no registradas" },
  { nro: 7, tarea: "Registro y pago de IIBB", frecuencia: "Mensual / al momento del pago", evidencia: "DDJJ, comprobante de pago, descuentos aplicados", alerta: "Alertar falta de pago, registración o descuento pendiente" },
  { nro: 8, tarea: "Registro y pago de IVA", frecuencia: "Mensual", evidencia: "DDJJ IVA, VEP/comprobante de pago y asiento", alerta: "Alertar vencimiento próximo, falta de pago o falta de registración" },
  { nro: 9, tarea: "Registro de costeos manuales por usuarios específicos", frecuencia: "Mensual / según operación", evidencia: "Detalle de costeos manuales y respaldo", alerta: "Alertar costeos manuales sin autorización o sin respaldo" },
  { nro: 10, tarea: "Registro de pago de OSDE y Swiss Medical y asientos", frecuencia: "Mensual", evidencia: "Facturas, comprobantes de pago y asiento", alerta: "Alertar pagos vencidos o diferencias entre factura, pago y asiento" },
  { nro: 11, tarea: "Registro de anticipos de sueldos y movimientos en ctas. ctes. de empleados", frecuencia: "Mensual", evidencia: "Detalle de anticipos, autorización y asiento", alerta: "Alertar anticipos sin registrar, sin descuento o con saldo pendiente" },
  { nro: 12, tarea: "Carga de liquidación de tarjetas", frecuencia: "Diaria / semanal / mensual", evidencia: "Liquidaciones, cupones, depósitos y conciliación", alerta: "Alertar liquidaciones pendientes, diferencias o depósitos no imputados" },
  { nro: 13, tarea: "Conciliaciones bancarias mensuales", frecuencia: "Mensual", evidencia: "Conciliación bancaria, extracto bancario y mayor contable", alerta: "Alertar partidas pendientes antiguas, diferencias o depósitos sin identificar" },
  { nro: 14, tarea: "Control de depósitos de clientes pendientes de imputación", frecuencia: "Semanal / mensual", evidencia: "Listado de depósitos no contabilizados o no identificados", alerta: "Alertar depósitos pendientes con antigüedad mayor a X días" },
  { nro: 15, tarea: "Control de cheques en cartera y eCheq", frecuencia: "Semanal / mensual", evidencia: "Listado de cheques físicos y eCheq bancarios", alerta: "Alertar diferencias entre cartera y banco, cheques vencidos o no identificados" },
  { nro: 16, tarea: "Conciliación de cuentas corrientes de clientes", frecuencia: "Mensual", evidencia: "Mayor de clientes, recibos, imputaciones y saldos pendientes", alerta: "Alertar saldos vencidos, cobros no aplicados o diferencias de cuenta corriente" },
  { nro: 17, tarea: "Conciliación de cuentas corrientes de proveedores", frecuencia: "Mensual", evidencia: "Mayor de proveedores, facturas, pagos y órdenes de pago", alerta: "Alertar facturas vencidas, pagos duplicados o saldos sin respaldo" },
  { nro: 18, tarea: "Control de anticipos a proveedores", frecuencia: "Mensual", evidencia: "Mayor contable, comprobantes y aplicación contra facturas", alerta: "Alertar anticipos antiguos sin aplicación" },
  { nro: 19, tarea: "Control de anticipos de clientes", frecuencia: "Mensual", evidencia: "Mayor contable, recibos y facturación posterior", alerta: "Alertar anticipos no aplicados o saldos antiguos" },
  { nro: 20, tarea: "Control de cuentas puente / transitorias", frecuencia: "Mensual", evidencia: "Mayor contable y composición del saldo", alerta: "Alertar saldos pendientes sin depurar al cierre" },
  { nro: 21, tarea: "Control de retenciones no tomadas en F.931", frecuencia: "Mensual", evidencia: "Conciliación cuenta contable vs. F.931 / ARCA", alerta: "Alertar retenciones pendientes de tomar o diferencias acumuladas" },
  { nro: 22, tarea: "Control de SICORE / SIRE / retenciones practicadas", frecuencia: "Mensual", evidencia: "DDJJ, papeles de trabajo, VEP y asientos", alerta: "Alertar diferencias entre retenciones contabilizadas, declaradas y pagadas" },
  { nro: 23, tarea: "Control de IVA compras y ventas", frecuencia: "Mensual", evidencia: "Libro IVA, subdiarios, DDJJ y asiento contable", alerta: "Alertar diferencias entre libros, contabilidad y DDJJ" },
  { nro: 24, tarea: "Control de IVA Simple / clasificación de conceptos", frecuencia: "Mensual", evidencia: "Detalle de cuentas contables clasificadas por criterio fiscal", alerta: "Alertar cuentas sin criterio asignado o mal encuadradas" },
  { nro: 25, tarea: "Control de operaciones en moneda extranjera", frecuencia: "Mensual / por operación", evidencia: "Comprobante, tipo de cambio aplicado y asiento", alerta: "Alertar operaciones sin tipo de cambio respaldado o diferencias de valuación" },
  { nro: 26, tarea: "Control de cajas y arqueos mensuales", frecuencia: "Mensual", evidencia: "Archivo de arqueo, planilla firmada y mayor contable de las tres sucursales", alerta: "Alertar arqueos no enviados, diferencias de caja o falta de respaldo" },
  { nro: 27, tarea: "Control de asientos manuales", frecuencia: "Mensual", evidencia: "Mayor contable, detalle de asientos y documentación respaldatoria", alerta: "Alertar asientos manuales sin respaldo, sin autorización o con cuentas sensibles" },
  { nro: 28, tarea: "Control de bienes de uso / altas y bajas DEMOS y RODADOS", frecuencia: "Mensual / trimestral", evidencia: "Facturas, altas, bajas, amortizaciones y respaldo", alerta: "Alertar bienes sin registrar, bajas sin documentación o diferencias con inventario" },
  { nro: 29, tarea: "Control de Planes de PAGO ARCA", frecuencia: "Mensual", evidencia: "Contabilización y pago de cuotas de planes de Pago de F931", alerta: "Alertar falta de contabilización o falta de pago" },
  { nro: 30, tarea: "Control de vencimientos legales y societarios", frecuencia: "Mensual / anual", evidencia: "Libros, actas, presentaciones, IGJ/RPC, poderes, balances", alerta: "Alertar vencimientos próximos o documentación pendiente" },
  { nro: 31, tarea: "Control de Existencias Unidades Usadas", frecuencia: "Mensual", evidencia: "Listado de stock contable", alerta: "Alertar tomas de usados pendientes, vehículos que no realizan costeo automático y valores no razonables" },
  { nro: 32, tarea: "Control de vencimientos de seguros y contratos de servicio., con alerta de vencimiento próximo.", frecuencia: "Mensual / trimestral/Anual", evidencia: "Pólizas de la empresa, contratos con proveedores, locaciones, etc", alerta: "Alertar en vencimientos para renovaciones" },
  { nro: 33, tarea: "Control de Facturación de comisiones a Ford por patentamientos de plan de ahorro y ventas especiales", frecuencia: "Semanal", evidencia: "Resumenes de Entrega - Facturación en la ficha ovalo", alerta: "Alertar semanas sin facturación y cruzar con los depositos en el banco ICBC" },
];
