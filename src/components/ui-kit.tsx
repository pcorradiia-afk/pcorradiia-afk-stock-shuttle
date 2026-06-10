import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/** Encabezado de página con título y descripción. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Tarjeta de indicador con variación opcional respecto del período anterior. */
export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  delta?: number; // variación % vs período anterior
  hint?: string;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  const toneRing = {
    default: "text-primary bg-primary/10",
    positive: "text-emerald-600 bg-emerald-500/10",
    negative: "text-destructive bg-destructive/10",
    warning: "text-amber-600 bg-amber-500/10",
  }[tone];

  const up = (delta ?? 0) >= 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {Icon && (
            <span className={cn("grid h-8 w-8 place-items-center rounded-lg", toneRing)}>
              <Icon className="h-4 w-4" />
            </span>
          )}
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {typeof delta === "number" && (
            <span className={cn("flex items-center gap-0.5 font-medium", up ? "text-emerald-600" : "text-destructive")}>
              {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(delta).toFixed(1).replace(".", ",")}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
