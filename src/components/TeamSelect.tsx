import { TEAMS, getTeam } from "@/data/teams";
import { PARTICIPATING_CODES } from "@/data/groups";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PARTICIPATING = new Set(PARTICIPATING_CODES);
const SORTED = TEAMS.filter((t) => PARTICIPATING.has(t.code)).sort((a, b) =>
  a.name.localeCompare(b.name, "es")
);

/** Etiqueta linda de un equipo a partir de su código (bandera + nombre). */
export function teamLabel(code: string | null | undefined): string {
  if (!code) return "—";
  const t = getTeam(code);
  return t ? `${t.flag} ${t.name}` : code;
}

export function TeamSelect({
  value,
  onChange,
  placeholder = "Elegí un equipo",
  disabled,
}: {
  value: string | null;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {SORTED.map((t) => (
          <SelectItem key={t.code} value={t.code}>
            {t.flag} {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
