import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/store/auth";

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
    <header className="sticky top-0 z-30 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 text-white safe-top">
      <div className="max-w-md mx-auto px-4 pt-2 pb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-white/80 truncate">{subtitle}</p>
          )}
        </div>
        {profile && (
          <button
            onClick={() => navigate("/perfil")}
            className="active:scale-95 transition-transform"
            aria-label="Mi perfil"
          >
            <Avatar name={profile.display_name} size={38} />
          </button>
        )}
      </div>
    </header>
  );
}
