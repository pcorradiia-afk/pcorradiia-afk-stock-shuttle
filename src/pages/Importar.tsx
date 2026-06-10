import { CheckCircle2, FileSpreadsheet, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PLANTILLAS = [
  { nombre: "Mayor / Balance de sumas y saldos", desc: "Saldos mensuales por cuenta y departamento.", listo: true },
  { nombre: "Reporte de ventas de unidades", desc: "0km y usados: unidades, facturación y margen.", listo: true },
  { nombre: "Cuentas corrientes (antigüedad)", desc: "Deudores por tramo de mora.", listo: true },
];

export function Importar() {
  return (
    <div>
      <PageHeader
        title="Importar del DMS"
        description="Cargá los reportes Excel exportados del DMS. El sistema mapea columnas, valida y consolida."
      />

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div>
            <div className="font-semibold">Arrastrá un Excel del DMS o seleccionalo</div>
            <div className="text-sm text-muted-foreground">Formatos .xlsx y .csv</div>
          </div>
          <Button disabled>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Seleccionar archivo
          </Button>
          <Badge variant="secondary" className="mt-1">Disponible en la Fase 2</Badge>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Plantillas previstas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {PLANTILLAS.map((p) => (
            <div key={p.nombre} className="flex items-center gap-3 rounded-lg border p-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{p.nombre}</div>
                <div className="text-xs text-muted-foreground">{p.desc}</div>
              </div>
              <Badge variant="outline">Mapeo configurable</Badge>
            </div>
          ))}
          <p className="pt-2 text-sm text-muted-foreground">
            En cuanto me pases un Excel de muestra del DMS, ajusto el mapeo de columnas exacto a tus reportes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
