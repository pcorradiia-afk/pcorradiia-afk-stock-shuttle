import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/store/auth";
import { GROUP_NAME, HOST_FLAGS } from "@/data/brand";

export function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 text-white safe-top wc-header">
      <div className="h-1 w-full wc-rainbow" />
      <div className="max-w-4xl mx-auto px-4 pt-2 pb-4">
        <div className="flex items-center justify-between gap-3">
          {/* Marca del grupo (móvil) */}
          <div className="flex items-center gap-2 min-w-0 md:hidden">
            <span className="text-2xl drop-shadow">🏆</span>
            <div className="min-w-0">
              <p className="font-display font-extrabold uppercase leading-tight tracking-tight truncate text-shadow">
                {GROUP_NAME}
              </p>
              <p className="text-[10px] text-white/80 leading-none">
                Prode Mundial 2026 · {HOST_FLAGS}
              </p>
            </div>
          </div>

          {/* Título de la pantalla (desktop) */}
          <h1 className="hidden md:block font-display text-2xl font-extrabold uppercase tracking-tight leading-tight">
            {title}
          </h1>

          {profile && (
            <button
              onClick={() => navigate("/perfil")}
              className="active:scale-95 transition-transform shrink-0 ring-2 ring-white/40 rounded-full"
              aria-label="Mi perfil"
            >
              <Avatar name={profile.display_name} size={38} />
            </button>
          )}
        </div>

        {/* Título de la pantalla (móvil) */}
        <div className="mt-3 md:hidden">
          <h1 className="font-display text-xl font-extrabold uppercase tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-white/85">{subtitle}</p>}
        </div>
        {subtitle && (
          <p className="hidden md:block text-xs text-white/85 mt-1">{subtitle}</p>
        )}
      </div>
    </header>
  );
}
