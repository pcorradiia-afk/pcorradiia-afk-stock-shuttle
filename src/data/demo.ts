import type {
  CuentaCorriente,
  Departamento,
  DepartamentoTipo,
  Empresa,
  Hallazgo,
  Periodo,
  ResultadoDepto,
  Sucursal,
  Usuario,
  VentaUnidades,
} from "@/types";

// ⚠️ Datos ficticios de demostración. En la Fase 2 se reemplazan por la
// importación real de los reportes Excel del DMS hacia Supabase.

export const DEPARTAMENTOS: Departamento[] = [
  { tipo: "0km", nombre: "0km", color: "#2563eb" },
  { tipo: "usados", nombre: "Usados", color: "#7c3aed" },
  { tipo: "posventa", nombre: "Posventa / Taller", color: "#0891b2" },
  { tipo: "repuestos", nombre: "Repuestos", color: "#ca8a04" },
  { tipo: "admin", nombre: "Administración", color: "#64748b" },
];

export const EMPRESAS: Empresa[] = [
  { id: "e1", nombre: "Fiorasi Automotores", razonSocial: "Fiorasi Automotores S.A.", cuit: "30-71234567-8", localidad: "Rosario", provincia: "Santa Fe", marcas: ["Volkswagen"], consolida: true, activa: true },
  { id: "e2", nombre: "Fiorasi Norte", razonSocial: "Fiorasi Norte S.R.L.", cuit: "30-71234568-5", localidad: "Córdoba", provincia: "Córdoba", marcas: ["Toyota"], consolida: true, activa: true },
  { id: "e3", nombre: "Fiorasi Premium", razonSocial: "Fiorasi Premium S.A.", cuit: "30-71234569-2", localidad: "CABA", provincia: "Buenos Aires", marcas: ["Audi", "Volkswagen"], consolida: true, activa: true },
  { id: "e4", nombre: "Fiorasi Camiones", razonSocial: "Fiorasi Camiones S.A.", cuit: "30-71234570-6", localidad: "Santa Fe", provincia: "Santa Fe", marcas: ["Iveco"], consolida: true, activa: true },
  { id: "e5", nombre: "Fiorasi Usados Plus", razonSocial: "Fiorasi Usados S.R.L.", cuit: "30-71234571-3", localidad: "Rosario", provincia: "Santa Fe", marcas: ["Multimarca"], consolida: false, activa: true },
];

export const SUCURSALES: Sucursal[] = [
  { id: "s1", empresaId: "e1", nombre: "Casa Central", localidad: "Rosario" },
  { id: "s2", empresaId: "e1", nombre: "Sucursal Funes", localidad: "Funes" },
  { id: "s3", empresaId: "e2", nombre: "Casa Central", localidad: "Córdoba" },
  { id: "s4", empresaId: "e2", nombre: "Sucursal Villa María", localidad: "Villa María" },
  { id: "s5", empresaId: "e3", nombre: "Showroom Palermo", localidad: "CABA" },
  { id: "s6", empresaId: "e4", nombre: "Planta Santa Fe", localidad: "Santa Fe" },
  { id: "s7", empresaId: "e5", nombre: "Predio Usados", localidad: "Rosario" },
];

export const USUARIOS: Usuario[] = [
  { id: "u0", nombre: "Admin Sistema", email: "admin@fiorasi.com", rolId: "superadmin", scope: "grupo", empresaIds: [], cargo: "Administrador del sistema", activo: true },
  { id: "u1", nombre: "Fernando Bogliacino", email: "fernando@fiorasi.com", rolId: "direccion", scope: "grupo", empresaIds: [], cargo: "Dirección", activo: true },
  { id: "u2", nombre: "Laura Méndez", email: "laura@fiorasi.com", rolId: "controller", scope: "empresas", empresaIds: ["e1", "e2", "e5"], cargo: "Controller", activo: true },
  { id: "u3", nombre: "Diego Sosa", email: "diego@fiorasi.com", rolId: "auditor", scope: "grupo", empresaIds: [], cargo: "Auditor interno", activo: true },
  { id: "u4", nombre: "Marina Ruiz", email: "marina@fiorasi.com", rolId: "responsable", scope: "empresas", empresaIds: ["e3"], cargo: "Gerente Fiorasi Premium", activo: true },
];

// ---- Generación determinística de datos de gestión ----

export const PERIODOS: Periodo[] = (() => {
  const out: Periodo[] = [];
  // Últimos 6 meses hasta may-2026 (la app "corre" a jun-2026).
  let y = 2025, m = 12;
  for (let i = 0; i < 6; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
})();

// PRNG simple y estable para que la demo sea reproducible.
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const DEPTO_MIX: Record<DepartamentoTipo, { ing: number; mc: number; gasto: number }> = {
  // mc = margen de contribución aprox; gasto como % de ingresos del depto
  "0km": { ing: 1.0, mc: 0.09, gasto: 0.04 },
  usados: { ing: 0.45, mc: 0.13, gasto: 0.05 },
  posventa: { ing: 0.22, mc: 0.55, gasto: 0.28 },
  repuestos: { ing: 0.18, mc: 0.32, gasto: 0.12 },
  admin: { ing: 0.0, mc: 0, gasto: 0.0 },
};

const EMPRESA_ESCALA: Record<string, number> = { e1: 1.0, e2: 0.85, e3: 1.4, e4: 1.6, e5: 0.3 };

export const RESULTADOS: ResultadoDepto[] = (() => {
  const out: ResultadoDepto[] = [];
  EMPRESAS.forEach((emp, ei) => {
    const escala = EMPRESA_ESCALA[emp.id] ?? 1;
    PERIODOS.forEach((periodo, pi) => {
      const rand = rng((ei + 1) * 1000 + pi * 37 + 7);
      const baseFact = 90_000_000 * escala * (0.9 + rand() * 0.3); // facturación 0km base
      DEPARTAMENTOS.forEach((d) => {
        const mix = DEPTO_MIX[d.tipo];
        if (d.tipo === "admin") {
          // Administración: solo gastos de estructura, sin ingresos.
          out.push({
            empresaId: emp.id,
            periodo,
            depto: "admin",
            ingresos: 0,
            costos: 0,
            gastos: Math.round(baseFact * 0.05 * (0.9 + rand() * 0.2)),
          });
          return;
        }
        const ingresos = Math.round(baseFact * mix.ing * (0.85 + rand() * 0.3));
        const costos = Math.round(ingresos * (1 - mix.mc) * (0.97 + rand() * 0.06));
        const gastos = Math.round(ingresos * mix.gasto * (0.9 + rand() * 0.2));
        out.push({ empresaId: emp.id, periodo, depto: d.tipo, ingresos, costos, gastos });
      });
    });
  });
  return out;
})();

export const VENTAS: VentaUnidades[] = (() => {
  const out: VentaUnidades[] = [];
  (["0km", "usados"] as const).forEach((depto) => {
    EMPRESAS.forEach((emp, ei) => {
      const escala = EMPRESA_ESCALA[emp.id] ?? 1;
      PERIODOS.forEach((periodo, pi) => {
        const rand = rng((ei + 1) * 500 + pi * 13 + (depto === "0km" ? 1 : 2));
        const unidades = Math.round((depto === "0km" ? 28 : 18) * escala * (0.8 + rand() * 0.5));
        const precio = depto === "0km" ? 32_000_000 : 18_000_000;
        const facturacion = Math.round(unidades * precio * (0.95 + rand() * 0.1));
        const margen = Math.round(facturacion * (depto === "0km" ? 0.09 : 0.13) * (0.9 + rand() * 0.2));
        out.push({ empresaId: emp.id, periodo, depto, unidades, facturacion, margen });
      });
    });
  });
  return out;
})();

export const CUENTAS_CORRIENTES: CuentaCorriente[] = (() => {
  const out: CuentaCorriente[] = [];
  EMPRESAS.forEach((emp, ei) => {
    const escala = EMPRESA_ESCALA[emp.id] ?? 1;
    PERIODOS.forEach((periodo, pi) => {
      const rand = rng((ei + 1) * 900 + pi * 29 + 3);
      const base = 40_000_000 * escala;
      out.push({
        empresaId: emp.id,
        periodo,
        alDia: Math.round(base * (0.9 + rand() * 0.4)),
        d30: Math.round(base * 0.35 * (0.7 + rand() * 0.6)),
        d60: Math.round(base * 0.18 * (0.6 + rand() * 0.7)),
        d90: Math.round(base * 0.09 * (0.5 + rand() * 0.8)),
        mas90: Math.round(base * 0.07 * (0.4 + rand() * 1.0)),
      });
    });
  });
  return out;
})();

export const HALLAZGOS: Hallazgo[] = [
  { id: "h1", empresaId: "e1", titulo: "Desvío en gastos de Posventa", descripcion: "Los gastos de Posventa superan el 30% del ingreso por 2 meses consecutivos.", severidad: "media", estado: "abierto", responsable: "Laura Méndez", detectadoEl: "2026-05-12" },
  { id: "h2", empresaId: "e4", titulo: "Mora +90 días en aumento", descripcion: "La cartera vencida +90 creció 38% intermensual.", severidad: "alta", estado: "en_proceso", responsable: "Diego Sosa", detectadoEl: "2026-05-20" },
  { id: "h3", empresaId: "e3", titulo: "Margen 0km por debajo del objetivo", descripcion: "Margen de 0km al 6,5% vs objetivo 9%.", severidad: "media", estado: "abierto", responsable: "Marina Ruiz", detectadoEl: "2026-05-28" },
  { id: "h4", empresaId: "e2", titulo: "Conciliación de caja pendiente", descripcion: "Falta conciliar caja de Sucursal Villa María del período abr-2026.", severidad: "baja", estado: "resuelto", responsable: "Laura Méndez", detectadoEl: "2026-04-30" },
];
