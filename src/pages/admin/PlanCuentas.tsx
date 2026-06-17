import { useMemo, useState } from "react";
import { Scale, Search } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useImportaciones } from "@/data/useImportaciones";
import { gestionImportada } from "@/data/importedSelectors";
import { useClasificacionCuentas, setClasificacion, LINEAS_EERR, type RepartoCuenta } from "@/data/clasificacionCuentas";
import { DEPTOS_OLIAUTO, type LineaCuenta } from "@/lib/oliauto";
import { money, pct as pctFmt } from "@/lib/format";
import { PageHeader } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface FilaCuenta {
  codigo: string;
  nombre: string;
  deptoAuto: string;
  lineaAuto: LineaCuenta;
  total: number;
}

export function PlanCuentas() {
  const { empresaIdsActivos } = useAuth();
  const importaciones = useImportaciones(empresaIdsActivos);
  const clasif = useClasificacionCuentas();
  const [q, setQ] = useState("");
  const [repartir, setRepartir] = useState<FilaCuenta | null>(null);

  // Clasificación AUTOMÁTICA (sin overrides) para conocer el valor base de cada cuenta.
  const auto = useMemo(() => gestionImportada(importaciones, empresaIdsActivos, {}), [importaciones, empresaIdsActivos]);

  const cuentas = useMemo<FilaCuenta[]>(() => {
    const map = new Map<string, FilaCuenta>();
    for (const c of auto.cuentas) {
      // Saltea asientos sintéticos (traspasos calculados, código no numérico).
      if (!/^\d/.test(c.codigo)) continue;
      const f = map.get(c.codigo) ?? { codigo: c.codigo, nombre: c.nombre, deptoAuto: c.depto, lineaAuto: c.linea, total: 0 };
      f.total += Object.values(c.valores).reduce((a, b) => a + b, 0);
      map.set(c.codigo, f);
    }
    return [...map.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [auto.cuentas]);

  const filtradas = cuentas.filter(
    (c) => !q || c.codigo.includes(q) || c.nombre.toLowerCase().includes(q.toLowerCase()),
  );
  const conOverride = cuentas.filter((c) => clasif[c.codigo]).length;

  const deptoLabel = (k: string) => DEPTOS_OLIAUTO.find((d) => d.key === k)?.label ?? k;

  function cambiar(c: FilaCuenta, campo: "depto" | "linea", valor: string) {
    const actual = clasif[c.codigo] ?? {};
    const depto = campo === "depto" ? valor : actual.depto ?? c.deptoAuto;
    const linea = (campo === "linea" ? valor : actual.linea ?? c.lineaAuto) as LineaCuenta;
    // Guardar solo lo que difiere de la automática (para no fijar lo que ya está bien).
    setClasificacion(c.codigo, {
      depto: depto === c.deptoAuto ? undefined : depto,
      linea: linea === c.lineaAuto ? undefined : linea,
    });
  }

  if (!auto.hayDatos || cuentas.length === 0) {
    return (
      <div>
        <PageHeader title="Plan de cuentas" description="Cómo se arma el estado de resultados, cuenta por cuenta." />
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          {!auto.hayDatos ? (
            <>Importá un balance parcial para ver y parametrizar las cuentas.</>
          ) : (
            <>
              El balance parcial cargado es anterior a esta función (no trae el detalle por cuenta).
              <br />
              Reimportalo desde <strong>Importar del DMS</strong> (mismo archivo, misma empresa) y volvé acá.
            </>
          )}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Plan de cuentas"
        description="Definí a qué departamento y a qué línea del estado de resultados va cada cuenta. Lo que no toques usa la clasificación automática."
        action={<Badge variant="secondary">{cuentas.length} cuentas · {conOverride} ajustadas</Badge>}
      />

      <div className="relative mb-3 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por código o descripción…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-auto">
            <Table className="text-sm">
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Saldo acum.</TableHead>
                  <TableHead className="w-[180px]">Departamento</TableHead>
                  <TableHead className="w-[170px]">Línea del EERR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((c) => {
                  const ov = clasif[c.codigo];
                  const depto = ov?.depto ?? c.deptoAuto;
                  const linea = ov?.linea ?? c.lineaAuto;
                  return (
                    <TableRow key={c.codigo} className={ov ? "bg-primary/[0.04]" : undefined}>
                      <TableCell className="py-1 font-mono text-xs">{c.codigo}</TableCell>
                      <TableCell className="max-w-[260px] truncate py-1" title={c.nombre}>{c.nombre}</TableCell>
                      <TableCell className="py-1 text-right tabular-nums">{money(c.total)}</TableCell>
                      <TableCell className="py-1">
                        {ov?.reparto ? (
                          <button
                            type="button"
                            onClick={() => setRepartir(c)}
                            className="flex h-8 w-full items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-2 text-left text-xs"
                          >
                            <Scale className="h-3.5 w-3.5 text-primary" />
                            <span className="truncate">
                              Reparto: {ov.reparto.deptos.map((d) => deptoLabel(d)).join(" + ")}
                            </span>
                          </button>
                        ) : (
                          <Select
                            value={depto}
                            onValueChange={(v) => (v === "__repartir__" ? setRepartir(c) : cambiar(c, "depto", v))}
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DEPTOS_OLIAUTO.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                              <SelectItem value="__repartir__">⚖️ Repartir entre deptos…</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <Select value={linea} onValueChange={(v) => cambiar(c, "linea", v)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LINEAS_EERR.map((l) => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Los cambios se guardan y se comparten con el equipo; el estado de resultados se recalcula al instante.
      </p>

      {repartir && (
        <EditorReparto
          fila={repartir}
          inicial={clasif[repartir.codigo]?.reparto}
          lineaActual={clasif[repartir.codigo]?.linea}
          onClose={() => setRepartir(null)}
        />
      )}
    </div>
  );
}

function EditorReparto({
  fila,
  inicial,
  lineaActual,
  onClose,
}: {
  fila: FilaCuenta;
  inicial?: RepartoCuenta;
  lineaActual?: LineaCuenta;
  onClose: () => void;
}) {
  const [modo, setModo] = useState<"ventas" | "fijo">(inicial?.modo ?? "ventas");
  const [deptos, setDeptos] = useState<string[]>(inicial?.deptos ?? [fila.deptoAuto]);
  const [pct, setPct] = useState<Record<string, number>>(inicial?.pct ?? {});

  const sumaPct = deptos.reduce((a, d) => a + (pct[d] ?? 0), 0);
  const pctOk = modo !== "fijo" || Math.abs(sumaPct - 100) < 0.5;

  function toggle(d: string, on: boolean) {
    setDeptos((prev) => (on ? [...prev, d] : prev.filter((x) => x !== d)));
  }

  function guardar() {
    if (deptos.length < 2) return;
    setClasificacion(fila.codigo, {
      linea: lineaActual,
      reparto: { modo, deptos, pct: modo === "fijo" ? pct : undefined },
    });
    onClose();
  }

  function quitarReparto() {
    setClasificacion(fila.codigo, { linea: lineaActual });
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Repartir cuenta entre departamentos</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-sm">
            <span className="font-mono text-xs text-muted-foreground">{fila.codigo}</span> · {fila.nombre}
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Criterio</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={modo === "ventas" ? "default" : "outline"} onClick={() => setModo("ventas")}>
                Por % de ventas
              </Button>
              <Button type="button" size="sm" variant={modo === "fijo" ? "default" : "outline"} onClick={() => setModo("fijo")}>
                % fijo
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Departamentos {modo === "fijo" && <span className="text-xs text-muted-foreground">(deben sumar 100%)</span>}</span>
            <div className="space-y-1 rounded-md border p-2">
              {DEPTOS_OLIAUTO.map((d) => {
                const on = deptos.includes(d.key);
                return (
                  <div key={d.key} className="flex items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox checked={on} onCheckedChange={(c) => toggle(d.key, !!c)} />
                      {d.label}
                    </label>
                    {modo === "fijo" && on && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={pct[d.key] ?? ""}
                          onChange={(e) => setPct((p) => ({ ...p, [d.key]: Number(e.target.value) || 0 }))}
                          className="h-7 w-16 text-right"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {modo === "fijo" && (
              <div className={pctOk ? "text-xs text-emerald-600" : "text-xs text-destructive"}>
                Suma: {pctFmt(sumaPct, 0)} {pctOk ? "✓" : "(debe ser 100%)"}
              </div>
            )}
            {modo === "ventas" && (
              <p className="text-xs text-muted-foreground">Se reparte según las ventas de cada depto en el mes.</p>
            )}
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          {inicial ? (
            <Button variant="ghost" className="text-destructive" onClick={quitarReparto}>Quitar reparto</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} disabled={deptos.length < 2 || !pctOk}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
