import { Save } from "lucide-react";
import {
  guardarUnidadesPlan,
  unidadesDe,
  useUnidadesPlanes,
} from "@/data/unidadesPlanes";
import { periodoLabel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Carga manual de unidades de Planes de Ahorro (suscripciones y entregas) por
 * mes. No salen del balance: se tipean acá y se guardan en el dispositivo.
 */
export function UnidadesPlanesEditor({
  empresaId,
  empresaNombre,
  periodos,
  esGrupo,
}: {
  empresaId: string;
  empresaNombre: string;
  periodos: string[];
  esGrupo: boolean;
}) {
  const mapa = useUnidadesPlanes();

  if (esGrupo) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Unidades de Planes de Ahorro · carga manual</CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-sm text-muted-foreground">
          Elegí una <strong>empresa puntual</strong> en el selector de arriba para cargar sus
          suscripciones y entregas mes a mes.
        </CardContent>
      </Card>
    );
  }

  const set = (periodo: string, campo: "suscripciones" | "entregas", valor: string) => {
    const actual = unidadesDe(mapa, empresaId, periodo);
    const n = Math.max(0, Math.round(Number(valor) || 0));
    guardarUnidadesPlan(empresaId, periodo, { ...actual, [campo]: n });
  };

  const tot = periodos.reduce(
    (a, p) => {
      const u = unidadesDe(mapa, empresaId, p);
      return { s: a.s + u.suscripciones, e: a.e + u.entregas };
    },
    { s: 0, e: 0 },
  );

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Save className="h-4 w-4 text-primary" />
          Unidades de Planes de Ahorro · {empresaNombre}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Se cargan a mano (no salen del balance) y se guardan automáticamente.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Suscripciones</TableHead>
                <TableHead className="text-right">Entregas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodos.map((p) => {
                const u = unidadesDe(mapa, empresaId, p);
                return (
                  <TableRow key={p}>
                    <TableCell className="py-1.5 font-medium">{periodoLabel(p)}</TableCell>
                    <TableCell className="py-1.5 text-right">
                      <Input
                        type="number"
                        min={0}
                        value={u.suscripciones || ""}
                        onChange={(e) => set(p, "suscripciones", e.target.value)}
                        className="ml-auto h-8 w-24 text-right tabular-nums"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <Input
                        type="number"
                        min={0}
                        value={u.entregas || ""}
                        onChange={(e) => set(p, "entregas", e.target.value)}
                        className="ml-auto h-8 w-24 text-right tabular-nums"
                        placeholder="0"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{tot.s}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{tot.e}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
