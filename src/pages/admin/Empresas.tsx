import { Plus } from "lucide-react";
import { EMPRESAS, SUCURSALES } from "@/data/demo";
import { PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function Empresas() {
  return (
    <div>
      <PageHeader
        title="Empresas del grupo"
        description="Alta y configuración de empresas, sucursales y marcas representadas."
        action={
          <Button>
            <Plus className="mr-1.5 h-4 w-4" />
            Nueva empresa
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CUIT</TableHead>
                  <TableHead>Marcas</TableHead>
                  <TableHead>DMS</TableHead>
                  <TableHead>Provincia</TableHead>
                  <TableHead className="text-center">Suc.</TableHead>
                  <TableHead className="text-center">Consolida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EMPRESAS.map((e) => {
                  const sucs = SUCURSALES.filter((s) => s.empresaId === e.id).length;
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="font-medium">{e.nombre}</div>
                        {e.sitio && (
                          <a
                            href={e.sitio}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {e.sitio.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{e.cuit}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {e.marcas.map((m) => (
                            <Badge key={m} variant="secondary">{m}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.dms}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {[e.localidad, e.provincia].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{sucs}</TableCell>
                      <TableCell className="text-center">
                        {e.consolida ? <Badge>Sí</Badge> : <Badge variant="outline">No</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
