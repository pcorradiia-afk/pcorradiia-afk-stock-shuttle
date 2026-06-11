import { Database, FileSpreadsheet, Trash2, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { EMPRESAS } from "@/data/demo";
import { useImportaciones } from "@/data/useImportaciones";
import { borrarImportacion, isSupabaseConfigured, type Importacion } from "@/data/importsStore";
import { fecha, money, moneyShort, num, pct } from "@/lib/format";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TIPO_LABEL: Record<string, string> = {
  balance_parcial: "Rentabilidad por depto.",
  balance_general: "Situación patrimonial",
  composicion: "Cuentas corrientes",
  mayor: "Libro mayor",
};

function Metrica({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Detalle({ imp }: { imp: Importacion }) {
  const r = imp.resumen as Record<string, number>;
  if (imp.tipo === "balance_parcial") {
    return (
      <>
        <Metrica label="Ingresos" value={money(r.ingresos ?? 0)} />
        <Metrica label="Resultado" value={money(r.resultado ?? 0)} />
      </>
    );
  }
  if (imp.tipo === "balance_general") {
    return (
      <>
        <Metrica label="Activo" value={moneyShort(r.activo ?? 0)} />
        <Metrica label="Patrimonio neto" value={moneyShort(r.patrimonioNeto ?? 0)} />
        <Metrica label="Resultado" value={moneyShort(r.resultado ?? 0)} />
        <Metrica label="Liquidez" value={(r.liquidez ?? 0).toFixed(2).replace(".", ",")} />
      </>
    );
  }
  if (imp.tipo === "composicion") {
    return (
      <>
        <Metrica label="Cartera deudora" value={money(r.totalDeudor ?? 0)} />
        <Metrica label="+90 días" value={money(r.mas90 ?? 0)} />
        <Metrica label="Clientes deudores" value={num(r.clientesDeudores ?? 0)} />
      </>
    );
  }
  return (
    <>
      <Metrica label="Movimientos" value={num(r.movimientos ?? 0)} />
      <Metrica label="Sin comprobante" value={`${num(r.sinComprobante ?? 0)} (${pct(r.movimientos ? ((r.sinComprobante ?? 0) / r.movimientos) * 100 : 0, 0)})`} />
      <Metrica label="Total Debe" value={moneyShort(r.totalDebe ?? 0)} />
    </>
  );
}

export function Importaciones() {
  const { empresaIdsActivos } = useAuth();
  const importaciones = useImportaciones(empresaIdsActivos);

  return (
    <div>
      <PageHeader
        title="Importaciones guardadas"
        description="Reportes del DMS que cargaste y persististe, con sus métricas clave."
        action={
          <Button asChild>
            <Link to="/importar">
              <UploadCloud className="mr-1.5 h-4 w-4" /> Importar
            </Link>
          </Button>
        }
      />

      {!isSupabaseConfigured() && importaciones.length > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          <Database className="mr-1 inline h-3.5 w-3.5" />
          Guardadas en este dispositivo. Configurá Supabase (ver <code>SUPABASE_SETUP.md</code>) para
          compartirlas entre usuarios.
        </p>
      )}

      {importaciones.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            <div className="text-sm text-muted-foreground">
              Todavía no guardaste ninguna importación.
            </div>
            <Button asChild>
              <Link to="/importar">Importar un reporte</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {importaciones.map((imp) => {
            const empresa = EMPRESAS.find((e) => e.id === imp.empresa_id)?.nombre ?? imp.empresa_id;
            const ref = imp.periodo ?? (imp.corte ? fecha(imp.corte) : "");
            return (
              <Card key={imp.id}>
                <CardHeader className="space-y-1 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{TIPO_LABEL[imp.tipo] ?? imp.tipo}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => borrarImportacion(imp.id)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-base">{empresa}</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {ref && <span>{ref} · </span>}
                    {imp.archivo}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <Detalle imp={imp} />
                  <div className="pt-1 text-[11px] text-muted-foreground">
                    Guardada {fecha(imp.creado_el)}
                    {imp.creado_por && ` · ${imp.creado_por}`}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
