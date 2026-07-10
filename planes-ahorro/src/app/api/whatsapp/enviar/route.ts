import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizarTelefonoAR } from "@/lib/telefono";

// Envío de WhatsApp vía Twilio — SIEMPRE del lado servidor: las credenciales
// (TWILIO_AUTH_TOKEN) jamás llegan al navegador. La ruta exige un usuario de
// Supabase válido con rol autorizado para campañas.

const ROLES_AUTORIZADOS = ["super_admin", "administracion", "supervisor_administracion", "supervisor_ventas"];

// Número emisor POR EMPRESA (cada concesionaria tiene su propio WhatsApp Business):
// TWILIO_WHATSAPP_FROM_PC (Pedro Corradi), TWILIO_WHATSAPP_FROM_SAPAC (Fiorasi);
// TWILIO_WHATSAPP_FROM queda como comodín si algún día usan uno solo.
function fromDeEmpresa(empresaId: string): string | null {
  const porEmpresa = process.env[`TWILIO_WHATSAPP_FROM_${empresaId.toUpperCase()}`];
  return porEmpresa || process.env.TWILIO_WHATSAPP_FROM || null;
}

/** GET: estado de configuración (para que la UI avise qué empresa puede enviar). */
export async function GET() {
  const configurado = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  return NextResponse.json({
    proveedor: configurado ? "twilio" : "sin-configurar",
    empresas: {
      pc: configurado && !!fromDeEmpresa("pc"),
      sapac: configurado && !!fromDeEmpresa("sapac"),
    },
  });
}

export async function POST(req: NextRequest) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!sid || !token) {
    return NextResponse.json({ estado: "error", detalle: "Twilio no está configurado en el servidor (TWILIO_*)." }, { status: 501 });
  }
  if (!supaUrl || !supaAnon) {
    return NextResponse.json({ estado: "error", detalle: "Supabase no configurado." }, { status: 501 });
  }

  // --- Autenticación: token de Supabase del usuario logueado ---
  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) return NextResponse.json({ estado: "error", detalle: "No autenticado." }, { status: 401 });

  const sb = createClient(supaUrl, supaAnon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: userData, error: userErr } = await sb.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ estado: "error", detalle: "Sesión inválida." }, { status: 401 });
  }
  const { data: roles } = await sb.from("usuario_rol").select("rol_id").eq("usuario_id", userData.user.id);
  const autorizado = (roles ?? []).some((r: { rol_id: string }) => ROLES_AUTORIZADOS.includes(r.rol_id));
  if (!autorizado) {
    return NextResponse.json({ estado: "error", detalle: "Tu rol no puede enviar campañas." }, { status: 403 });
  }

  // --- Datos del envío ---
  let body: { telefono?: string; mensaje?: string; empresaId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ estado: "error", detalle: "Cuerpo inválido." }, { status: 400 });
  }
  const empresaId = (body.empresaId ?? "").trim();
  if (!empresaId) return NextResponse.json({ estado: "error", detalle: "Falta la empresa." }, { status: 400 });

  // El usuario debe pertenecer a la empresa por la que envía.
  const { data: membresias } = await sb.from("membresia_empresa").select("empresa_id").eq("usuario_id", userData.user.id);
  if (!(membresias ?? []).some((m: { empresa_id: string }) => m.empresa_id === empresaId)) {
    return NextResponse.json({ estado: "error", detalle: "No tenés acceso a esa empresa." }, { status: 403 });
  }

  const from = fromDeEmpresa(empresaId);
  if (!from) {
    return NextResponse.json({
      estado: "error",
      detalle: `La empresa "${empresaId}" todavía no tiene número emisor de WhatsApp configurado (TWILIO_WHATSAPP_FROM_${empresaId.toUpperCase()}).`,
    });
  }

  const e164 = normalizarTelefonoAR(body.telefono ?? "");
  const mensaje = (body.mensaje ?? "").trim();
  if (!e164) return NextResponse.json({ estado: "error", detalle: `Teléfono inválido: ${body.telefono ?? ""}` });
  if (!mensaje) return NextResponse.json({ estado: "error", detalle: "Mensaje vacío." });

  // --- Llamada a Twilio ---
  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
        To: `whatsapp:${e164}`,
        Body: mensaje,
      }),
    });
    const data = (await resp.json()) as { sid?: string; message?: string; code?: number };
    if (!resp.ok) {
      return NextResponse.json({ estado: "error", detalle: `Twilio ${data.code ?? resp.status}: ${data.message ?? "error"}` });
    }
    return NextResponse.json({ estado: "enviado", detalle: `Twilio SID ${data.sid} → ${e164}` });
  } catch (e) {
    return NextResponse.json({ estado: "error", detalle: `No se pudo contactar a Twilio: ${(e as Error).message}` });
  }
}
