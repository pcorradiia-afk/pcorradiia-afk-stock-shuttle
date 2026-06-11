import { cn } from "@/lib/utils";

/** Color institucional del Grupo Fiorasi (azul marino del logo). */
export const FIORASI_NAVY = "#2b2a80";

/**
 * Wordmark del Grupo Fiorasi: "GRUPO" (liviano) + "FIORASI" (bold), como el logo.
 * Hereda el color del contenedor (usar `text-[#2b2a80]` en claro o `text-white` en oscuro).
 */
export function Logo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-sans uppercase leading-none tracking-tight",
        className,
      )}
      style={style}
      aria-label="Grupo Fiorasi"
    >
      <span className="font-medium">Grupo</span>
      <span className="font-extrabold">Fiorasi</span>
    </span>
  );
}
