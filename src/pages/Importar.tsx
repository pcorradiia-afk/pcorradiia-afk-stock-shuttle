import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Database,
  Eye,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Save,
  UploadCloud,
  X,
} from "lucide-react";
import { EMPRESAS } from "@/data/demo";
import { useAuth } from "@/auth/AuthContext";
import { guardarImportacion } from "@/data/importsStore";
import { useImportaciones } from "@/data/useImportaciones";
import { computarImportacion, type TipoImportacion } from "@/lib/importCompute";
import {
  detectarEmpresa,
  pareceBalanceGeneral,
  pareceBalanceParcial,
  pareceComposicion,
  pareceMayor,
} from "@/lib/oliauto";
import { isSupabaseConfigured } from "@/lib/supabase";
import { AnalisisBalanceParcial } from "@/components/AnalisisBalanceParcial";
import { AnalisisBalanceGeneral } from "@/components/AnalisisBalanceGeneral";
import { AnalisisComposicion } from "@/components/AnalisisComposicion";
import { AnalisisMayor } from "@/components/AnalisisMayor";
import { fecha, moneyShort, num } from "@/lib/format";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const TIPOS: TipoImportacion[] = ["balance_general", "balance_parcial", "composicion", "mayor"];

const TIPO_LABEL: Record<TipoImportacion, string> = {
  balance_general: "Situación patrimonial",
  balance_parcial: "Rentabilidad por depto.",
  composicion: "Cuentas corrientes",
  mayor: "Libro mayor",
};

interface ItemCola {
  id: string;
  fileName: string;
  aoa: unknown[][];
  tipo: TipoImportacion | "";
  metrica: string;
  ref: string; // periodo o corte, para detectar reemplazos
  detectada: string | null; // empresa sugerida por el contenido
  estado: "pendiente" | "guardando" | "guardado" | "error";
  error?: string;
}

function detectarTipo(header: unknown[]): TipoImportacion | "" {
  if (pareceBalanceParcial(header)) return "balance_parcial";
  if (pareceComposicion(header)) return "composicion";
  if (pareceBalanceGeneral(header)) return "balance_general";
  if (pareceMayor(header)) return "mayor";
  return "";
}

function resumenItem(tipo: TipoImportacion, aoa: unknown[][]): { metrica: string; ref: string } {
  try {
    const c = computarImportacion(tipo, aoa, 1);
    const r = c.resumen as Record<string, number>;
    const ref = c.periodo ?? c.corte ?? "";
    let metrica = "";
    if (tipo === "balance_parcial") metrica = `Resultado ${moneyShort(r.resultado ?? 0)}`;
    else if (tipo === "balance_general") metrica = `Activo ${moneyShort(r.activo ?? 0)}`;
    else if (tipo === "composicion") metrica = `Cartera ${moneyShort(r.totalDeudor ?? 0)}`;
    else metrica = `${num(r.movimientos ?? 0)} movimientos`;
    return { metrica, ref };
  } catch {
    return { metrica: "", ref: "" };
  }
}

export function Importar() {
  const { usuario, empresasVisibles, empresaIdsActivos, seleccion } = useAuth();
  const opciones = empresasVisibles.length > 0 ? empresasVisibles : EMPRESAS;
  const importaciones = useImportaciones(empresaIdsActivos);
  const fileInput = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<ItemCola[]>([]);
  // Empresa para TODA la carga: si ya elegiste una empresa puntual arriba, la usamos.
  const [empresaId, setEmpresaId] = useState<string>(seleccion !== "grupo" ? seleccion : "");
  const [drag, setDrag] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verId, setVerId] = useState<string | null>(null);

  const configurado = isSupabaseConfigured();

  // Claves ya guardadas, para avisar "reemplaza" (empresa|tipo|ref).
  const yaGuardadas = useMemo(() => {
    const s = new Set<string>();
    for (const imp of importaciones) s.add(`${imp.empresa_id}|${imp.tipo}|${imp.periodo ?? imp.corte ?? ""}`);
    return s;
  }, [importaciones]);

  async function agregar(files: File[]) {
    const hints = opciones.map((e) => ({ id: e.id, nombre: e.nombre, marcas: e.marcas }));
    const nuevos: ItemCola[] = [];
    const sugeridas: string[] = [];
    for (const file of files) {
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], {
          header: 1,
          blankrows: false,
          defval: "",
        });
        const tipo = detectarTipo(aoa[0] ?? []);
        const det = detectarEmpresa(aoa, hints);
        if (det.empresaId && det.confianza !== "baja") sugeridas.push(det.empresaId);
        const { metrica, ref } = tipo ? resumenItem(tipo, aoa) : { metrica: "", ref: "" };
        nuevos.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          aoa,
          tipo,
          metrica,
          ref,
          detectada: det.empresaId,
          estado: "pendiente",
        });
      } catch {
        nuevos.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          aoa: [],
          tipo: "",
          metrica: "",
          ref: "",
          detectada: null,
          estado: "error",
          error: "No pude leer el archivo (¿Excel/CSV válido?)",
        });
      }
    }
    setItems((prev) => [...prev, ...nuevos]);

    // Si todavía no hay empresa elegida, sugerimos la más frecuente detectada.
    if (!empresaId && sugeridas.length > 0) {
      const conteo = sugeridas.reduce<Record<string, number>>((a, id) => ((a[id] = (a[id] ?? 0) + 1), a), {});
      const top = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (top) setEmpresaId(top);
    }
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const fs = Array.from(e.target.files ?? []);
    if (fs.length) agregar(fs);
    if (fileInput.current) fileInput.current.value = "";
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const fs = Array.from(e.dataTransfer.files).filter((f) => /\.(xlsx?|csv)$/i.test(f.name));
    if (fs.length) agregar(fs);
  }

  function actualizar(id: string, patch: Partial<ItemCola>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function quitar(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (verId === id) setVerId(null);
  }
  function cambiarTipo(id: string, tipo: TipoImportacion) {
    const it = items.find((x) => x.id === id);
    const { metrica, ref } = it ? resumenItem(tipo, it.aoa) : { metrica: "", ref: "" };
    actualizar(id, { tipo, metrica, ref });
  }

  const pendientes = items.filter((it) => it.estado !== "guardado" && it.tipo).length;
  const sinTipo = items.some((it) => it.estado !== "guardado" && it.aoa.length > 0 && !it.tipo);
  const empresaSugeridaDistinta =
    !!empresaId && items.some((it) => it.detectada && it.detectada !== empresaId && it.estado !== "guardado");

  async function guardarTodos() {
    if (!empresaId) {
      toast.error("Elegí la empresa de los archivos primero");
      return;
    }
    setGuardando(true);
    let ok = 0;
    let err = 0;
    for (const it of items) {
      if (it.estado === "guardado" || !it.tipo) continue;
      actualizar(it.id, { estado: "guardando", error: undefined });
      try {
        await guardarImportacion({
          empresaId,
          tipo: it.tipo,
          archivo: it.fileName,
          aoa: it.aoa,
          headerRow: 1,
          creadoPor: usuario?.email,
        });
        actualizar(it.id, { estado: "guardado" });
        ok++;
      } catch (e) {
        actualizar(it.id, { estado: "error", error: (e as Error).message });
        err++;
      }
    }
    setGuardando(false);
    if (ok) toast.success(`${ok} importación(es) guardada(s)`);
    if (err) toast.error(`${err} con error — revisá la lista`);
  }

  const verItem = items.find((it) => it.id === verId) ?? null;
  const nombreEmpresa = opciones.find((e) => e.id === empresaId)?.nombre;

  return (
    <div>
      <PageHeader
        title="Importar del DMS"
        description="Arrastrá los reportes de Oliauto de una empresa. Detecto el tipo de cada uno y los guardás todos juntos."
      />

      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        className="hidden"
        onChange={onInput}
      />

      {/* Paso 1 · Empresa */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
            <span className="font-medium">Empresa de los archivos</span>
          </div>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger className={cn("w-64", !empresaId && "border-amber-500")}>
              <Building2 className="mr-1.5 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Elegí la empresa…" />
            </SelectTrigger>
            <SelectContent>
              {opciones.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {empresaSugeridaDistinta && (
            <span className="flex items-center gap-1 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Algún archivo parece de otra empresa: verificá.
            </span>
          )}
        </CardContent>
      </Card>

      {/* Paso 2 · Archivos */}
      <Card
        className={cn("border-dashed transition-colors", drag && "border-primary bg-primary/5")}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div>
            <div className="font-semibold">Arrastrá tus Excel acá, o seleccionalos</div>
            <div className="text-sm text-muted-foreground">Podés cargar varios a la vez · .xlsx, .xls y .csv</div>
          </div>
          <Button onClick={() => fileInput.current?.click()}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Seleccionar archivos
          </Button>
        </CardContent>
      </Card>

      {/* Cola */}
      {items.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Archivos {nombreEmpresa ? <>de <span className="text-primary">{nombreEmpresa}</span></> : ""} ({items.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setItems([])}>
              <X className="mr-1 h-4 w-4" /> Limpiar lista
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Archivo</TableHead>
                    <TableHead>Tipo de reporte</TableHead>
                    <TableHead>Resumen</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const reemplaza =
                      empresaId && it.tipo && yaGuardadas.has(`${empresaId}|${it.tipo}|${it.ref}`);
                    return (
                      <TableRow key={it.id}>
                        <TableCell className="max-w-[220px]">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="truncate">{it.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select value={it.tipo} onValueChange={(v) => cambiarTipo(it.id, v as TipoImportacion)}>
                            <SelectTrigger className={cn("h-8 w-[185px]", !it.tipo && "border-destructive text-destructive")}>
                              <SelectValue placeholder="Elegí el tipo…" />
                            </SelectTrigger>
                            <SelectContent>
                              {TIPOS.map((t) => (
                                <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground tabular-nums">
                          {it.metrica}
                          {reemplaza && it.estado !== "guardado" && (
                            <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-600">
                              <RefreshCw className="mr-1 h-3 w-3" /> Reemplaza
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {it.estado === "guardado" ? (
                            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600" variant="outline">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Guardado
                            </Badge>
                          ) : it.estado === "guardando" ? (
                            <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Guardando</Badge>
                          ) : it.estado === "error" ? (
                            <span title={it.error} className="inline-flex">
                              <Badge variant="outline" className="border-destructive text-destructive">
                                <AlertTriangle className="mr-1 h-3 w-3" /> Error
                              </Badge>
                            </span>
                          ) : (
                            <Badge variant="secondary">Pendiente</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            {it.tipo && it.aoa.length > 0 && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVerId(verId === it.id ? null : it.id)} aria-label="Ver análisis">
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => quitar(it.id)} aria-label="Quitar">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
            <div className="text-sm">
              {!empresaId ? (
                <span className="text-amber-600">Elegí la empresa (paso 1) antes de guardar.</span>
              ) : sinTipo ? (
                <span className="text-destructive">Hay archivos sin tipo detectado: elegilo en la lista.</span>
              ) : pendientes > 0 ? (
                <span className="text-muted-foreground">{pendientes} archivo(s) listo(s) para guardar.</span>
              ) : (
                <span className="text-emerald-600">Todo guardado ✓</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{configurado ? "Se sincroniza con la nube" : "Se guarda en este dispositivo"}</Badge>
              <Button onClick={guardarTodos} disabled={guardando || pendientes === 0 || !empresaId || sinTipo}>
                {guardando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
                Guardar todos ({pendientes})
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Análisis del archivo seleccionado */}
      {verItem && verItem.tipo && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{TIPO_LABEL[verItem.tipo]} · {verItem.fileName}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setVerId(null)}>
              <X className="mr-1 h-4 w-4" /> Cerrar
            </Button>
          </CardHeader>
          <CardContent>
            {verItem.tipo === "balance_parcial" && <AnalisisBalanceParcial aoa={verItem.aoa} headerRow={1} />}
            {verItem.tipo === "balance_general" && <AnalisisBalanceGeneral aoa={verItem.aoa} headerRow={1} />}
            {verItem.tipo === "composicion" && <AnalisisComposicion aoa={verItem.aoa} headerRow={1} />}
            {verItem.tipo === "mayor" && <AnalisisMayor aoa={verItem.aoa} headerRow={1} />}
          </CardContent>
        </Card>
      )}

      {/* DMS del grupo */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">DMS del grupo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {Array.from(new Set(EMPRESAS.map((e) => e.dms))).map((dms) => {
            const empresas = EMPRESAS.filter((e) => e.dms === dms);
            return (
              <div key={dms} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{dms}</span>
                  <Badge variant="secondary">{empresas.length} empresa(s)</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{empresas.map((e) => e.nombre).join(" · ")}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
