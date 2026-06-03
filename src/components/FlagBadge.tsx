import { getTeam } from "@/data/teams";

/**
 * Bandera circular estilo FIFA. Usa el emoji de bandera dentro de un círculo
 * blanco (funciona offline, sin depender de imágenes externas).
 */
export function FlagBadge({
  code,
  size = 28,
}: {
  code: string;
  size?: number;
}) {
  const team = getTeam(code);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/10 overflow-hidden shrink-0 leading-none"
      style={{ width: size, height: size, fontSize: size * 0.95 }}
      aria-hidden
    >
      <span style={{ transform: "scale(1.35)" }}>{team?.flag ?? "🏳️"}</span>
    </span>
  );
}
