import { AppHeader } from "@/components/AppHeader";
import { FlagBadge } from "@/components/FlagBadge";
import { GROUPS } from "@/data/groups";
import { getTeam } from "@/data/teams";

export function Groups() {
  return (
    <>
      <AppHeader title="Grupos" subtitle="Los 12 grupos del Mundial 2026" />
      <div className="px-4 py-5">
        <h2 className="font-display text-lg font-extrabold uppercase tracking-tight mb-4">
          Los grupos del Mundial 2026
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(GROUPS).map(([key, codes]) => (
            <div
              key={key}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <h3 className="font-display text-base font-extrabold uppercase tracking-wide text-primary mb-3">
                Grupo {key}
              </h3>
              <ul className="space-y-2.5">
                {codes.map((code) => (
                  <li key={code} className="flex items-center gap-3">
                    <FlagBadge code={code} size={26} />
                    <span className="text-sm font-semibold uppercase tracking-tight">
                      {getTeam(code)?.name ?? code}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
