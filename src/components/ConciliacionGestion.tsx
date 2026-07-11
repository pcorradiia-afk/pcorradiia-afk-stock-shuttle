import { useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import {
  agregarAjuste,
  borrarAjuste,
  LINEAS_CUADRO,
  useAjustesExtra,
  type LineaCuadro,
} from "@/data/criteriosCuadro";
import { money, periodoLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const DEPTOS_AJUSTE = [
  { key: "0km", label: "Unidades 0km" },
  { key: "usados", label: "Unidades usados" },
  { key: "planes_susc", label: "Suscripciones de planes" },
  { key: "planes_ent", label: "Entregas de planes" },
  { key: "repuestos", label: "Repuestos" },
  { key: "posventa", label: "Servicios / Taller" },
  { key: "admin", label: "Estructura / Administración" },
];

/**
 * Concilia el resultado del cuadro de gestión (contable) contra el balance, y
 * permite cargar ajustes extracontables (prorrateos de compras anuales, etc.)
 * que explican las diferencias y arman el "resultado de gestión".
 */
export function ConciliacionGestion({
  empresaId,
  esGrupo,
  periodo,
  modo,
  periodos,
  resultadoCuadro,
  resultadoAcum,
  balanceResultado,
}: {
  empresaId: string;
  esGrupo: boolean;
  periodo: string;
  modo: string;
  periodos: string[];
  resultadoCuadro: number;
  resultadoAcum: number;
  balanceResultado: number | null;
}) {
  const ajustes = useAjustesExtra();
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [depto, setDepto] = useState("admin");
  const [linea, setLinea] = useState<LineaCuadro>("estructura");
  const [periodoAj, setPeriodoAj] = useState(modo === "acum" || modo === "prom" ? periodos[periodos.length - 1] : periodo);

  const mios = ajustes.filter((a) => (esGrupo ? true : a.empresaId === empresaId));
  const delPeriodo = modo === "acum" || modo === "prom" ? mios : mios.filter((a) => a.periodo === periodo);
  const sumaAjustes = delPeriodo.reduce((a, x) => a + x.monto, 0);

  // Conciliación contable: en acumulado se compara con el balance general (clase 5).
  const compara = modo === "acum" && balanceResultado != null;
  const contable = compara ? resultadoAcum : resultadoCuadro;
  const balance = compara ? balanceResultado! : resultadoCuadro;
  const dif = balance - contable;
  const concilia = Math.abs(dif) < 1000;
  const resultadoGestion = contable + sumaAjustes;

  function add() {
    const n = Number(String(monto).replace(/[^0-9.-]/g, ""));
    if (!concepto.trim() || !n) return;
    agregarAjuste({ periodo: periodoAj, depto, linea, concepto: concepto.trim(), monto: n, empresaId });
    setConcepto("");
    setMonto("");
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Conciliación con el balance</CardTitle>
        <p className="text-xs text-muted-foreground">
          {compara
            ? "Resultado del cuadro (acumulado) contra el balance general. Los ajustes extracontables explican las diferencias."
            : "Para conciliar contra el balance general, elegí el modo «Acumulado». Acá cargás los ajustes extracontables del período."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conciliación contable */}
        <div className="rounded-lg border">
          <div className="flex items-center justify-between px-4 py-2 text-sm">
            <span>Resultado del cuadro de gestión {compara ? "(acumulado)" : `· ${periodoLabel(periodo)}`}</span>
            <span className="font-semibold tabular-nums">{money(contable)}</span>
          </div>
          {compara && (
            <>
              <div className="flex items-center justify-between border-t px-4 py-2 text-sm">
                <span>Resultado contable del balance general (clase 5)</span>
                <span className="font-semibold tabular-nums">{money(balance)}</span>
              </div>
              <div className={cn("flex items-center justify-between border-t px-4 py-2 text-sm", concilia ? "bg-emerald-500/5" : "bg-amber-500/5")}>
                <span className="flex items-center gap-1.5 font-medium">
                  {concilia ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  {concilia ? "Concilia con el balance" : "Diferencia a explicar"}
                </span>
                <span className={cn("font-bold tabular-nums", !concilia && "text-amber-600")}>{money(dif)}</span>
              </div>
            </>
          )}
        </div>

        {/* Ajustes extracontables */}
        <div>
          <div className="mb-2 text-sm font-medium">
            Ajustes extracontables {modo === "acum" || modo === "prom" ? "(todos los meses)" : `· ${periodoLabel(periodo)}`}
          </div>
          {delPeriodo.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Depto / línea</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {delPeriodo.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="py-1.5">{a.concepto}</TableCell>
                      <TableCell className="py-1.5 text-sm text-muted-foreground">{periodoLabel(a.periodo)}</TableCell>
                      <TableCell className="py-1.5 text-sm text-muted-foreground">
                        {DEPTOS_AJUSTE.find((d) => d.key === a.depto)?.label ?? a.depto} ·{" "}
                        {LINEAS_CUADRO.find((l) => l.key === a.linea)?.label}
                      </TableCell>
                      <TableCell className={cn("py-1.5 text-right tabular-nums", a.monto < 0 && "text-destructive")}>{money(a.monto)}</TableCell>
                      <TableCell className="py-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => borrarAjuste(a.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin ajustes cargados.</p>
          )}
        </div>

        {/* Resultado de gestión */}
        <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-2.5">
          <span className="font-semibold">Resultado de gestión (cuadro + ajustes)</span>
          <span className="font-bold tabular-nums">{money(resultadoGestion)}</span>
        </div>

        {/* Alta de ajuste */}
        {!esGrupo && (
          <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]">
            <Input placeholder="Concepto (ej. prorrateo uniformes)" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="h-9" />
            <Select value={periodoAj} onValueChange={setPeriodoAj}>
              <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {periodos.map((p) => <SelectItem key={p} value={p}>{periodoLabel(p)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={depto} onValueChange={setDepto}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPTOS_AJUSTE.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Monto (- gasto)" value={monto} onChange={(e) => setMonto(e.target.value)} className="h-9 w-[130px] text-right" />
            <Button onClick={add} className="h-9"><Plus className="mr-1 h-4 w-4" /> Agregar</Button>
          </div>
        )}
        {esGrupo && (
          <p className="text-xs text-muted-foreground">Elegí una empresa puntual arriba para cargar ajustes extracontables.</p>
        )}
      </CardContent>
    </Card>
  );
}
