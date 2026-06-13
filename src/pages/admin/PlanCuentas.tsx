import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { useImportaciones } from "@/data/useImportaciones";
import { gestionImportada } from "@/data/importedSelectors";
import { useClasificacionCuentas, setClasificacion, LINEAS_EERR } from "@/data/clasificacionCuentas";
import { DEPTOS_OLIAUTO, type LineaCuenta } from "@/lib/oliauto";
import { money } from "@/lib/format";
import { PageHeader } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

  // Clasificación AUTOMÁTICA (sin overrides) para conocer el valor base de cada cuenta.
  const auto = useMemo(() => gestionImportada(importaciones, empresaIdsActivos, {}), [importaciones, empresaIdsActivos]);

  const cuentas = useMemo<FilaCuenta[]>(() => {
    const map = new Map<string, FilaCuenta>();
    for (const c of auto.cuentas) {
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

  if (!auto.hayDatos) {
    return (
      <div>
        <PageHeader title="Plan de cuentas" description="Cómo se arma el estado de resultados, cuenta por cuenta." />
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Importá un balance parcial para ver y parametrizar las cuentas.
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
                        <Select value={depto} onValueChange={(v) => cambiar(c, "depto", v)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DEPTOS_OLIAUTO.map((d) => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
        {deptoLabel("0km")} y demás: los cambios se guardan y se comparten con el equipo; el estado de resultados se recalcula al instante.
      </p>
    </div>
  );
}
