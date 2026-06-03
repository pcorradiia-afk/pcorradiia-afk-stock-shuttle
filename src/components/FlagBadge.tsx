import { useState } from "react";
import { getTeam } from "@/data/teams";
import { flagUrl } from "@/data/flags";

/**
 * Bandera circular estilo FIFA. Usa la imagen real de la bandera (flagcdn) y,
 * si no carga (sin internet o host bloqueado), cae al emoji de la bandera.
 */
export function FlagBadge({
  code,
  size = 28,
}: {
  code: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const team = getTeam(code);
  const url = flagUrl(code);
  const useImg = url && !failed;

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/10 overflow-hidden shrink-0 leading-none"
      style={{ width: size, height: size, fontSize: size * 0.95 }}
      aria-label={team?.name ?? code}
    >
      {useImg ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ transform: "scale(1.35)" }}>{team?.flag ?? "🏳️"}</span>
      )}
    </span>
  );
}
