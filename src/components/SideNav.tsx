import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  Flame,
  Home,
  Star,
  Trophy,
  BookOpen,
  Shield,
  User,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { GROUP_NAME, HOST_FLAGS } from "@/data/brand";

const items = [
  { to: "/", label: "Inicio", Icon: Home },
  { to: "/partidos", label: "Partidos", Icon: CalendarDays },
  { to: "/tabla", label: "Tabla", Icon: Trophy },
  { to: "/especiales", label: "Pronósticos Plus", Icon: Star },
  { to: "/asados", label: "Asados", Icon: Flame },
  { to: "/reglas", label: "Reglas y pozo", Icon: BookOpen },
  { to: "/perfil", label: "Mi perfil", Icon: User },
];

/** Nav fija de la izquierda. Sólo se ve en pantallas grandes (md+). */
export function SideNav() {
  const { profile } = useAuth();
  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-64 border-r border-border bg-card">
      <div className="wc-header pitch-stripes text-white px-5 py-5">
        <div className="h-1 w-full wc-rainbow rounded-full mb-3" />
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-extrabold leading-tight text-shadow">{GROUP_NAME}</p>
            <p className="text-[11px] text-white/80">Prode Mundial 2026</p>
          </div>
        </div>
        <p className="text-lg mt-2 tracking-widest">{HOST_FLAGS}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
        {profile?.is_admin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <Shield className="w-5 h-5" />
            Administración
          </NavLink>
        )}
      </nav>

      <div className="p-4 text-[11px] text-muted-foreground border-t">
        Que gane el mejor 😎
      </div>
    </aside>
  );
}
