import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Database, FileSpreadsheet, Loader2, Save, UploadCloud, X } from "lucide-react";
import { EMPRESAS } from "@/data/demo";
import { useAuth } from "@/auth/AuthContext";
import { guardarImportacion, isSupabaseConfigured, type TipoImportacion } from "@/data/importsStore";
import { pareceBalanceParcial, pareceComposicion } from "@/lib/oliauto";
import { AnalisisBalanceParcial } from "@/components/AnalisisBalanceParcial";
import { AnalisisComposicion } from "@/components/AnalisisComposicion";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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

// DMS en uso en el grupo (cada uno exporta con su propio formato).
const DMS_EN_USO = Array.from(new Set(EMPRESAS.map((e) => e.dms))).map((dms) => ({
  dms,
  empresas: EMPRESAS.filter((e) => e.dms === dms),
}));

interface CampoDestino {
  key: string;
  label: string;
  req: boolean;
  hints: string[];
}

const REPORTES: Record<string, { label: string; campos: CampoDestino[] }> = {
  mayor: {
    label: "Mayor / Balance de sumas y saldos",
    campos: [
      { key: "cuenta", label: "Cuenta (código)", req: true, hints: ["cuenta", "codigo", "cod"] },
      { key: "descripcion", label: "Descripción", req: false, hints: ["descrip", "detalle", "nombre", "concepto"] },
      { key: "departamento", label: "Departamento / sector", req: false, hints: ["depart", "sector", "centro", "rubro"] },
      { key: "debe", label: "Debe", req: false, hints: ["debe"] },
      { key: "haber", label: "Haber", req: false, hints: ["haber"] },
      { key: "saldo", label: "Saldo", req: true, hints: ["saldo", "resultado", "importe", "monto", "total"] },
    ],
  },
  ventas: {
    label: "Ventas de unidades",
    campos: [
      { key: "fecha", label: "Fecha / período", req: true, hints: ["fecha", "periodo", "mes"] },
      { key: "tipo", label: "Tipo (0km / usado)", req: false, hints: ["tipo", "condicion", "0km", "usado"] },
      { key: "marca", label: "Marca", req: false, hints: ["marca"] },
      { key: "modelo", label: "Modelo", req: false, hints: ["modelo", "vehiculo", "unidad"] },
      { key: "facturacion", label: "Facturación", req: true, hints: ["factur", "venta", "precio", "importe", "total"] },
      { key: "costo", label: "Costo", req: false, hints: ["costo", "compra"] },
      { key: "vendedor", label: "Vendedor", req: false, hints: ["vendedor", "asesor"] },
    ],
  },
  cuentas_corrientes: {
    label: "Cuentas corrientes (antigüedad)",
    campos: [
      { key: "cliente", label: "Cliente", req: true, hints: ["cliente", "razon", "nombre", "cuenta"] },
      { key: "saldo", label: "Saldo total", req: true, hints: ["saldo", "total", "deuda"] },
      { key: "alDia", label: "Al día", req: false, hints: ["al dia", "corriente", "vigente"] },
      { key: "d30", label: "1-30 días", req: false, hints: ["30"] },
      { key: "d60", label: "31-60 días", req: false, hints: ["60"] },
      { key: "d90", label: "61-90 días", req: false, hints: ["90"] },
      { key: "mas90", label: "+90 días", req: false, hints: ["+90", "mas 90", "mayor"] },
    ],
  },
};

const SIN_MAPEAR = "—";

/** Barra para persistir un análisis (balance parcial / composición) en Supabase. */
function BarraGuardar({
  tipo,
  aoa,
  headerRow,
  fileName,
}: {
  tipo: TipoImportacion;
  aoa: unknown[][];
  headerRow: number;
  fileName: string;
}) {
  const { usuario, empresasVisibles, seleccion } = useAuth();
  const configurado = isSupabaseConfigured();
  const opciones = empresasVisibles.length > 0 ? empresasVisibles : EMPRESAS;
  const [empresaId, setEmpresaId] = useState<string>(
    seleccion !== "grupo" ? seleccion : opciones.length === 1 ? opciones[0].id : "",
  );
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    if (!empresaId) return;
    setGuardando(true);
    try {
      const fila = await guardarImportacion({
        empresaId,
        tipo,
        archivo: fileName,
        aoa,
        headerRow,
        creadoPor: usuario?.email,
      });
      const ref = fila.periodo ?? fila.corte ?? "";
      toast.success("Importación guardada", {
        description: `${opciones.find((e) => e.id === empresaId)?.nombre ?? empresaId}${ref ? ` · ${ref}` : ""}`,
      });
    } catch (e) {
      toast.error("No se pudo guardar", { description: (e as Error).message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end justify-between gap-3 py-4">
        <div className="space-y-1.5">
          <Label>Empresa</Label>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger className="w-60"><SelectValue placeholder="Elegí la empresa…" /></SelectTrigger>
            <SelectContent>
              {opciones.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {!configurado && (
            <Badge variant="secondary">Configurá Supabase para guardar (ver SUPABASE_SETUP.md)</Badge>
          )}
          <Button onClick={guardar} disabled={!configurado || !empresaId || guardando}>
            {guardando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Guardar en la base
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function normalizar(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function Importar() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [aoa, setAoa] = useState<unknown[][]>([]);
  const [headerRow, setHeaderRow] = useState(1); // 1-indexado
  const [tipo, setTipo] = useState<string>("mayor");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>("");

  const headers = useMemo<string[]>(() => {
    const row = aoa[headerRow - 1] ?? [];
    return row.map((c, i) => (String(c ?? "").trim() || `Columna ${i + 1}`));
  }, [aoa, headerRow]);

  const dataRows = useMemo(() => aoa.slice(headerRow), [aoa, headerRow]);

  function autoMapear(hs: string[], tipoSel: string): Record<string, string> {
    const campos = REPORTES[tipoSel].campos;
    const next: Record<string, string> = {};
    for (const campo of campos) {
      const found = hs.find((h) => campo.hints.some((hint) => normalizar(h).includes(normalizar(hint))));
      next[campo.key] = found ?? SIN_MAPEAR;
    }
    return next;
  }

  async function onFile(file: File) {
    setError("");
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: "" });
      setFileName(file.name);
      setAoa(rows);
      setHeaderRow(1);
      // Autodetectar el tipo de reporte de Oliauto.
      if (pareceBalanceParcial(rows[0] ?? [])) {
        setTipo("balance_parcial");
      } else if (pareceComposicion(rows[0] ?? [])) {
        setTipo("composicion");
      } else {
        const hs = (rows[0] ?? []).map((c, i) => String(c ?? "").trim() || `Columna ${i + 1}`);
        const t = tipo === "balance_parcial" || tipo === "composicion" ? "mayor" : tipo;
        setMapping(autoMapear(hs, t));
      }
    } catch {
      setError("No pude leer el archivo. Verificá que sea un Excel (.xlsx) o CSV válido.");
    }
  }

  function cambiarHeaderRow(n: number) {
    setHeaderRow(n);
    const row = aoa[n - 1] ?? [];
    const hs = row.map((c, i) => String(c ?? "").trim() || `Columna ${i + 1}`);
    setMapping(autoMapear(hs, tipo));
  }

  function cambiarTipo(t: string) {
    setTipo(t);
    if (t !== "balance_parcial" && t !== "composicion") setMapping(autoMapear(headers, t));
  }

  function limpiar() {
    setFileName("");
    setAoa([]);
    setMapping({});
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  const esBP = tipo === "balance_parcial";
  const esComp = tipo === "composicion";
  const campos = esBP || esComp ? [] : REPORTES[tipo].campos;
  const faltanReq = campos.filter((c) => c.req && (!mapping[c.key] || mapping[c.key] === SIN_MAPEAR));
  const hayArchivo = aoa.length > 0;

  return (
    <div>
      <PageHeader
        title="Importar del DMS"
        description="Cargá un reporte Excel/CSV del DMS. Detecto las columnas y las mapeo a los campos del sistema."
      />

      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {!hayArchivo ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <div className="font-semibold">Seleccioná un Excel del DMS</div>
              <div className="text-sm text-muted-foreground">Formatos .xlsx, .xls y .csv</div>
            </div>
            <Button onClick={() => fileInput.current?.click()}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Seleccionar archivo
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Configuración */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                <FileSpreadsheet className="mr-1.5 inline h-4 w-4 text-primary" />
                {fileName}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={limpiar}>
                <X className="mr-1 h-4 w-4" /> Quitar
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de reporte</Label>
                <Select value={tipo} onValueChange={cambiarTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance_parcial">Balance parcial / Rentabilidad por depto. (Oliauto)</SelectItem>
                    <SelectItem value="composicion">Composición de saldos / Cuentas corrientes (Oliauto)</SelectItem>
                    {Object.entries(REPORTES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fila de encabezados</Label>
                <Select value={String(headerRow)} onValueChange={(v) => cambiarHeaderRow(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.min(aoa.length, 12) }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={String(n)}>Fila {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {esBP ? (
            <>
              <AnalisisBalanceParcial aoa={aoa} headerRow={headerRow} />
              <BarraGuardar tipo="balance_parcial" aoa={aoa} headerRow={headerRow} fileName={fileName} />
            </>
          ) : esComp ? (
            <>
              <AnalisisComposicion aoa={aoa} headerRow={headerRow} />
              <BarraGuardar tipo="composicion" aoa={aoa} headerRow={headerRow} fileName={fileName} />
            </>
          ) : (
          <>
          {/* Mapeo de columnas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mapeo de columnas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {campos.map((c) => (
                <div key={c.key} className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    {c.label}
                    {c.req && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    value={mapping[c.key] ?? SIN_MAPEAR}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [c.key]: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SIN_MAPEAR}>— sin mapear —</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={`${h}-${i}`} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Vista previa */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Vista previa</CardTitle>
              <Badge variant="secondary">{dataRows.length} fila(s)</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataRows.slice(0, 8).map((row, ri) => (
                      <TableRow key={ri}>
                        {headers.map((_, ci) => (
                          <TableCell key={ci} className="whitespace-nowrap text-sm">
                            {String((row as unknown[])[ci] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Acción */}
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="text-sm">
                {faltanReq.length > 0 ? (
                  <span className="text-destructive">
                    Falta mapear: {faltanReq.map((c) => c.label).join(", ")}
                  </span>
                ) : (
                  <span className="text-emerald-600">Mapeo completo ✓ listo para importar.</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">El guardado de reportes mapeados a medida llega pronto</Badge>
                <Button disabled={faltanReq.length > 0 || true}>Confirmar e importar</Button>
              </div>
            </CardContent>
          </Card>
          </>
          )}
        </div>
      )}

      {/* DMS del grupo */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">DMS del grupo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {DMS_EN_USO.map(({ dms, empresas }) => (
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
          ))}
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Una vez definido el mapeo de cada DMS (Oliauto y Autologica), se guarda como{" "}
            <strong>plantilla</strong> y se aplica automáticamente según la empresa.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
