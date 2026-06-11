import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Eye,
  FileSpreadsheet,
  Loader2,
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
  empresaId: string;
  confianza: "alta" | "media" | "baja";
  metrica: string;
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

function metricaDe(tipo: TipoImportacion, aoa: unknown[][]): string {
  try {
    const r = computarImportacion(tipo, aoa, 1).resumen as Record<string, number>;
    if (tipo === "balance_parcial") return `Resultado ${moneyShort(r.resultado ?? 0)}`;
    if (tipo === "balance_general") return `Activo ${moneyShort(r.activo ?? 0)}`;
    if (tipo === "composicion") return `Cartera ${moneyShort(r.totalDeudor ?? 0)}`;
    return `${num(r.movimientos ?? 0)} movimientos`;
  } catch {
    return "";
  }
}

/** Panel con la última fecha de importación por empresa y tipo de reporte. */
function UltimaActualizacion({ empresaIds }: { empresaIds: string[] }) {
  const importaciones = useImportaciones(empresaIds);
  if (importaciones.length === 0) return null;

  // map[empresaId][tipo] = fecha más reciente
  const ultima: Record<string, Record<string, string>> = {};
  for (const imp of importaciones) {
    const e = (ultima[imp.empresa_id] ??= {});
    if (!e[imp.tipo] || e[imp.tipo] < imp.creado_el) e[imp.tipo] = imp.creado_el;
  }
  const empresas = EMPRESAS.filter((e) => ultima[e.id]);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Última actualización por empresa</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                {TIPOS.map((t) => (
                  <TableHead key={t} className="text-center">{TIPO_LABEL[t]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nombre}</TableCell>
                  {TIPOS.map((t) => {
                    const f = ultima[e.id]?.[t];
                    return (
                      <TableCell key={t} className="text-center text-sm tabular-nums">
                        {f ? fecha(f) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function Importar() {
  const { usuario, empresasVisibles, empresaIdsActivos } = useAuth();
  const opciones = empresasVisibles.length > 0 ? empresasVisibles : EMPRESAS;
  const fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ItemCola[]>([]);
  const [drag, setDrag] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [verId, setVerId] = useState<string | null>(null);

  const configurado = isSupabaseConfigured();

  async function agregar(files: File[]) {
    const hints = opciones.map((e) => ({ id: e.id, nombre: e.nombre, marcas: e.marcas }));
    const nuevos: ItemCola[] = [];
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
        nuevos.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          aoa,
          tipo,
          empresaId: det.empresaId ?? "",
          confianza: det.confianza,
          metrica: tipo ? metricaDe(tipo, aoa) : "",
          estado: "pendiente",
        });
      } catch {
        nuevos.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          aoa: [],
          tipo: "",
          empresaId: "",
          confianza: "baja",
          metrica: "",
          estado: "error",
          error: "No pude leer el archivo (¿Excel/CSV válido?)",
        });
      }
    }
    setItems((prev) => [...prev, ...nuevos]);
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
    actualizar(id, { tipo, metrica: it ? metricaDe(tipo, it.aoa) : "" });
  }

  const pendientes = items.filter((it) => it.estado !== "guardado" && it.tipo && it.empresaId).length;
  const sinTipo = items.some((it) => it.estado !== "guardado" && !it.tipo);
  const sinEmpresa = items.some((it) => it.estado !== "guardado" && it.tipo && !it.empresaId);

  async function guardarTodos() {
    setGuardando(true);
    let ok = 0;
    let err = 0;
    for (const it of items) {
      if (it.estado === "guardado" || !it.tipo || !it.empresaId) continue;
      actualizar(it.id, { estado: "guardando", error: undefined });
      try {
        await guardarImportacion({
          empresaId: it.empresaId,
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

  return (
    <div>
      <PageHeader
        title="Importar del DMS"
        description="Arrastrá uno o varios reportes de Oliauto. Detecto el tipo y la empresa de cada uno y los guardás todos juntos."
      />

      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        className="hidden"
        onChange={onInput}
      />

      <UltimaActualizacion empresaIds={empresaIdsActivos} />

      {/* Zona de carga (siempre visible) */}
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
            <div className="text-sm text-muted-foreground">
              Podés cargar varios a la vez · .xlsx, .xls y .csv
            </div>
          </div>
          <Button onClick={() => fileInput.current?.click()}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Seleccionar archivos
          </Button>
        </CardContent>
      </Card>

      {/* Cola de importación */}
      {items.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Archivos a importar ({items.length})</CardTitle>
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
                    <TableHead>Tipo</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Resumen</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{it.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={it.tipo} onValueChange={(v) => cambiarTipo(it.id, v as TipoImportacion)}>
                          <SelectTrigger className={cn("h-8 w-[180px]", !it.tipo && "border-destructive text-destructive")}>
                            <SelectValue placeholder="Elegí el tipo…" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS.map((t) => (
                              <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Select value={it.empresaId} onValueChange={(v) => actualizar(it.id, { empresaId: v })}>
                            <SelectTrigger className={cn("h-8 w-[170px]", !it.empresaId && "border-destructive text-destructive")}>
                              <SelectValue placeholder="Elegí la empresa…" />
                            </SelectTrigger>
                            <SelectContent>
                              {opciones.map((e) => (
                                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {it.empresaId && it.confianza !== "alta" && it.estado !== "guardado" && (
                            <span title="Detección aproximada: verificá la empresa">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{it.metrica}</TableCell>
                      <TableCell>
                        {it.estado === "guardado" ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setVerId(verId === it.id ? null : it.id)}
                              aria-label="Ver análisis"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => quitar(it.id)}
                            aria-label="Quitar"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
            <div className="text-sm">
              {sinTipo ? (
                <span className="text-destructive">Hay archivos sin tipo detectado: elegilo en la lista.</span>
              ) : sinEmpresa ? (
                <span className="text-destructive">Hay archivos sin empresa: asignala en la lista.</span>
              ) : pendientes > 0 ? (
                <span className="text-muted-foreground">{pendientes} archivo(s) listo(s) para guardar.</span>
              ) : (
                <span className="text-emerald-600">Todo guardado ✓</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {configurado ? "Se sincroniza con la nube" : "Se guarda en este dispositivo"}
              </Badge>
              <Button onClick={guardarTodos} disabled={guardando || pendientes === 0}>
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
            <CardTitle className="text-base">
              {TIPO_LABEL[verItem.tipo]} · {verItem.fileName}
            </CardTitle>
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
                <div className="mt-2 text-xs text-muted-foreground">
                  {empresas.map((e) => e.nombre).join(" · ")}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
