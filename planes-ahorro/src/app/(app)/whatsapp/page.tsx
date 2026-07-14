"use client";

import { useEffect, useMemo, useState } from "react";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import {
  suscribir, listarPlantillasWa, crearPlantillaWa, previaCampania, enviarCampania, auditar,
  listarCampanias, listarEnviosCampania, SEGMENTOS_CAMPANIA, type SegmentoCampania,
} from "@/lib/store";
import { CATEGORIA_LABEL, COSTO_CATEGORIA, VARIABLES_AYUDA, getEnviador, renderPlantilla, estadoProveedor } from "@/lib/whatsapp";
import { exportarExcel } from "@/lib/exportar";
import { fechaHora, pesos } from "@/lib/labels";
import type { CategoriaPlantilla, PlantillaWhatsApp } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageCircle, Send, Download, AlertTriangle } from "lucide-react";

export default function WhatsAppPage() {
  const { usuarioActivo, empresaActivaId } = useSesion();
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<"campanias" | "plantillas">("campanias");

  useEffect(() => suscribir(() => setTick((t) => t + 1)), []);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "campanias.enviar")) {
    return (
      <Card><CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Tu rol no puede gestionar campañas de WhatsApp.</CardDescription>
      </CardHeader></Card>
    );
  }
  if (!empresaActivaId) return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold"><MessageCircle className="h-6 w-6" /> Campañas de WhatsApp</h1>
        <p className="text-muted-foreground">
          Envíos masivos segmentados con plantillas pre-aprobadas. Solo a clientes con{" "}
          <strong>opt-in</strong> (el consentimiento se registra en la ficha).{" "}
          <Badge variant="warning">Proveedor: {getEnviador().nombre}</Badge>
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "campanias" ? "default" : "outline"} onClick={() => setTab("campanias")}>Campañas</Button>
        <Button variant={tab === "plantillas" ? "default" : "outline"} onClick={() => setTab("plantillas")}>Plantillas</Button>
      </div>

      {tab === "plantillas"
        ? <Plantillas empresaId={empresaActivaId} tick={tick} />
        : <Campanias empresaId={empresaActivaId} tick={tick} usuario={usuarioActivo} />}
    </div>
  );
}

function Plantillas({ empresaId, tick }: { empresaId: string; tick: number }) {
  const plantillas = useMemo(() => listarPlantillasWa(empresaId), [empresaId, tick]);
  const [form, setForm] = useState({ nombre: "", categoria: "utility" as CategoriaPlantilla, cuerpo: "", aprobadaMeta: false });

  const crear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.cuerpo.trim()) return;
    crearPlantillaWa({
      empresaId, nombre: form.nombre.trim(), categoria: form.categoria,
      idioma: "es_AR", cuerpo: form.cuerpo.trim(), aprobadaMeta: form.aprobadaMeta, activo: true,
    });
    setForm({ nombre: "", categoria: "utility", cuerpo: "", aprobadaMeta: false });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nueva plantilla</CardTitle>
          <CardDescription>
            Los envíos masivos requieren plantillas pre-aprobadas por Meta. Variables disponibles: {VARIABLES_AYUDA}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={crear} className="space-y-3">
            <Input placeholder="Nombre (ej: recordatorio_mora)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaPlantilla })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {(Object.keys(CATEGORIA_LABEL) as CategoriaPlantilla[]).map((c) => (
                <option key={c} value={c}>{CATEGORIA_LABEL[c]} — {pesos(COSTO_CATEGORIA[c])}/mensaje aprox.</option>
              ))}
            </select>
            <textarea
              value={form.cuerpo}
              onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
              placeholder={"Hola {{primer_nombre}}, te recordamos que tenés cuotas pendientes de tu plan {{modelo}} (grupo {{grupo}}/{{orden}})…"}
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.aprobadaMeta} onChange={(e) => setForm({ ...form, aprobadaMeta: e.target.checked })} />
              Plantilla ya aprobada por Meta
            </label>
            <Button type="submit">Guardar plantilla</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Catálogo ({plantillas.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {plantillas.length === 0 && <p className="text-sm text-muted-foreground">Sin plantillas todavía.</p>}
          {plantillas.map((t) => (
            <div key={t.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{t.nombre}</span>
                <span className="flex gap-1">
                  <Badge variant={t.categoria === "marketing" ? "warning" : "secondary"}>{t.categoria}</Badge>
                  {t.aprobadaMeta ? <Badge variant="success">aprobada Meta</Badge> : <Badge variant="outline">pendiente Meta</Badge>}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{t.cuerpo}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Campanias({ empresaId, tick, usuario }: { empresaId: string; tick: number; usuario: NonNullable<ReturnType<typeof useSesion>["usuarioActivo"]> }) {
  const plantillas = useMemo(() => listarPlantillasWa(empresaId).filter((t) => t.activo), [empresaId, tick]);
  const campanias = useMemo(() => listarCampanias(empresaId), [empresaId, tick]);
  const [nombre, setNombre] = useState("");
  const [plantillaId, setPlantillaId] = useState("");
  const [segmento, setSegmento] = useState<SegmentoCampania>("mora");
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [proveedor, setProveedor] = useState<{ puedeEnviar: boolean; detalle: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    estadoProveedor(empresaId).then((r) => { if (vivo) setProveedor(r); });
    return () => { vivo = false; };
  }, [empresaId]);

  const plantilla: PlantillaWhatsApp | undefined = plantillas.find((t) => t.id === plantillaId);
  const previa = useMemo(
    () => (plantilla ? previaCampania(empresaId, usuario, segmento, plantilla.categoria) : null),
    [empresaId, usuario, segmento, plantilla, tick]
  );

  const enviar = async () => {
    if (!plantilla || !previa || previa.destinatarios.length === 0) return;
    const msj = `Vas a enviar "${plantilla.nombre}" a ${previa.destinatarios.length} cliente(s) (costo estimado ${pesos(previa.costoEstimado)}). ¿Confirmás?`;
    if (!window.confirm(msj)) return;
    setEnviando(true);
    try {
      const camp = await enviarCampania({ empresaId, usuario, nombre: nombre.trim() || plantilla.nombre, plantilla, segmento });
      auditar(empresaId, usuario.nombre, "campania_wa", `Envió la campaña "${camp.nombre}" (${camp.enviados} enviados de ${camp.totalSegmento} del segmento)`);
      setOk(`Campaña enviada (${getEnviador().esSimulado ? "SIMULADA — ningún mensaje real salió" : "real"}).`);
      setNombre("");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Nueva campaña</CardTitle>
          <CardDescription>Elegí plantilla y segmento; el sistema muestra alcance y costo antes de confirmar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Nombre de la campaña (opcional)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <select value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Elegir plantilla…</option>
              {plantillas.map((t) => <option key={t.id} value={t.id}>{t.nombre} ({t.categoria})</option>)}
            </select>
            <select value={segmento} onChange={(e) => setSegmento(e.target.value as SegmentoCampania)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {SEGMENTOS_CAMPANIA.map((s) => <option key={s.valor} value={s.valor}>{s.label}</option>)}
            </select>
          </div>

          {proveedor && !proveedor.puedeEnviar && (
            <p className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {proveedor.detalle} Las campañas de esta empresa quedan bloqueadas hasta configurarlo.
            </p>
          )}
          {plantilla?.categoria === "marketing" && (
            <p className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4" /> Plantilla de <strong>Marketing</strong>: es la categoría más cara. Para recordatorios usá Utility.
            </p>
          )}
          {plantilla && !plantilla.aprobadaMeta && (
            <p className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4" /> Esta plantilla figura como <strong>pendiente de aprobación de Meta</strong>: el BSP la rechazará hasta que esté aprobada.
            </p>
          )}

          {previa && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p><strong>Alcance:</strong> {previa.totalSegmento} en el segmento · {previa.sinTelefono} sin teléfono · {previa.sinOptIn} sin opt-in →{" "}
                <strong className="text-primary">{previa.destinatarios.length} destinatario(s)</strong></p>
              <p><strong>Costo estimado:</strong> {pesos(previa.costoEstimado)} ({pesos(COSTO_CATEGORIA[plantilla!.categoria])} por mensaje, a confirmar con el BSP)</p>
              {previa.destinatarios[0] && (
                <p className="mt-1 text-muted-foreground"><strong>Vista previa</strong> ({previa.destinatarios[0].nombreCompleto}): “{renderPlantilla(plantilla!.cuerpo, previa.destinatarios[0])}”</p>
              )}
              {previa.destinatarios.length === 0 && (
                <p className="mt-1 text-amber-700">Sin destinatarios: los clientes del segmento no tienen opt-in registrado (se carga en la ficha de cada cliente).</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={enviar} disabled={!plantilla || !previa || previa.destinatarios.length === 0 || enviando || (proveedor ? !proveedor.puedeEnviar : false)}>
              <Send className="h-4 w-4" /> {enviando ? "Enviando…" : "Enviar campaña"}
            </Button>
            {ok && <span className="text-sm text-emerald-700">{ok}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial ({campanias.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Campaña</TableHead>
                <TableHead>Plantilla</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead className="text-right">Enviados</TableHead>
                <TableHead className="text-right">Costo est.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campanias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-muted-foreground">{fechaHora(c.fecha)}</TableCell>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>{c.plantillaNombre} <Badge variant={c.categoria === "marketing" ? "warning" : "secondary"}>{c.categoria}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{c.segmentoLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.enviados} / {c.totalSegmento}</TableCell>
                  <TableCell className="text-right tabular-nums">{pesos(c.costoEstimado)}</TableCell>
                  <TableCell>{c.estado === "enviada_simulada" ? <Badge variant="warning">simulada</Badge> : <Badge variant="success">enviada</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() =>
                      exportarExcel(
                        listarEnviosCampania(c.id).map((e) => ({
                          "Cliente": e.clienteNombre, "Teléfono": e.telefono, "Mensaje": e.mensaje,
                          "Estado": e.estado, "Detalle": e.detalle, "Fecha": fechaHora(e.fecha), "Costo": e.costoEstimado,
                        })),
                        `campania-${c.nombre}`
                      )}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {campanias.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Sin campañas todavía.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
