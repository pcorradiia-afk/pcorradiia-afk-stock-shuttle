import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Alta y activación/desactivación de usuarios — SOLO super admin.
// Usa la SERVICE ROLE KEY (secreta, solo servidor) para crear la credencial en
// Supabase Auth y dar de alta el perfil vía la función alta_usuario() de la base.

const EMPRESAS_VALIDAS = ["pc", "sapac"];
const ROLES_VALIDOS = [
  "super_admin", "recepcion", "vendedor", "supervisor_ventas", "administracion",
  "supervisor_administracion", "entregas", "analista_suscripciones", "gerencia",
];

async function requesterEsSuperAdmin(req: NextRequest): Promise<{ ok: boolean; error?: NextResponse; email?: string }> {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supaUrl || !supaAnon || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: NextResponse.json({ error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor." }, { status: 501 }) };
  }
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) return { ok: false, error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  const sb = createClient(supaUrl, supaAnon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data.user) return { ok: false, error: NextResponse.json({ error: "Sesión inválida." }, { status: 401 }) };
  const { data: roles } = await sb.from("usuario_rol").select("rol_id").eq("usuario_id", data.user.id);
  if (!(roles ?? []).some((r: { rol_id: string }) => r.rol_id === "super_admin")) {
    return { ok: false, error: NextResponse.json({ error: "Solo el administrador del sistema puede gestionar usuarios." }, { status: 403 }) };
  }
  return { ok: true, email: data.user.email ?? "" };
}

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function POST(req: NextRequest) {
  const gate = await requesterEsSuperAdmin(req);
  if (!gate.ok) return gate.error!;

  let b: {
    email?: string; password?: string; nombre?: string; empresa?: string;
    roles?: string[]; tipo?: string; gestion?: string | null; empresasExtra?: string[];
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const email = (b.email ?? "").trim().toLowerCase();
  const password = b.password ?? "";
  const nombre = (b.nombre ?? "").trim();
  const empresa = (b.empresa ?? "").trim();
  const roles = (b.roles ?? []).filter((r) => ROLES_VALIDOS.includes(r));
  const tipo = b.tipo === "terciarizada" ? "terciarizada" : "concesionario";
  const gestion = tipo === "terciarizada" ? (b.gestion ?? "").trim() || null : null;
  const empresasExtra = (b.empresasExtra ?? []).filter((e) => EMPRESAS_VALIDAS.includes(e) && e !== empresa);

  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  if (!nombre) return NextResponse.json({ error: "Falta el nombre." }, { status: 400 });
  if (!EMPRESAS_VALIDAS.includes(empresa)) return NextResponse.json({ error: "Empresa inválida." }, { status: 400 });
  if (roles.length === 0) return NextResponse.json({ error: "Elegí al menos un rol." }, { status: 400 });
  if (tipo === "terciarizada" && !gestion) return NextResponse.json({ error: "Una terciarizada necesita el nombre de su gestión." }, { status: 400 });

  const service = serviceClient();

  // 1) Credencial en Supabase Auth (si ya existe, seguimos: actualiza el perfil).
  const { error: authErr } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (authErr && !/already.*(registered|exists)/i.test(authErr.message)) {
    return NextResponse.json({ error: `Auth: ${authErr.message}` }, { status: 400 });
  }

  // 2) Perfil + roles + membresías con la función de la base (idempotente).
  const { data, error } = await service.rpc("alta_usuario", {
    p_email: email, p_nombre: nombre, p_empresa: empresa, p_roles: roles,
    p_tipo: tipo, p_gestion: gestion, p_empresas_extra: empresasExtra,
  });
  if (error) return NextResponse.json({ error: `alta_usuario: ${error.message}` }, { status: 400 });
  return NextResponse.json({ ok: true, detalle: String(data), yaExistiaCredencial: !!authErr });
}

export async function PATCH(req: NextRequest) {
  const gate = await requesterEsSuperAdmin(req);
  if (!gate.ok) return gate.error!;
  let b: { email?: string; activo?: boolean };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const email = (b.email ?? "").trim().toLowerCase();
  if (!email || typeof b.activo !== "boolean") return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  if (email === gate.email?.toLowerCase() && b.activo === false) {
    return NextResponse.json({ error: "No podés desactivarte a vos mismo." }, { status: 400 });
  }
  const { error } = await serviceClient().from("usuario").update({ activo: b.activo }).eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
