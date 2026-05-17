import { NavLink } from "react-router-dom";
import { BookOpen, Home, Sparkles, User } from "lucide-react";

const items = [
  { to: "/", label: "Inicio", Icon: Home },
  { to: "/album", label: "Álbum", Icon: BookOpen },
  { to: "/jugar", label: "Jugar", Icon: Sparkles, highlight: true },
  { to: "/perfil", label: "Yo", Icon: User },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-white/95 backdrop-blur safe-bottom">
      <ul className="grid grid-cols-4 max-w-md mx-auto">
        {items.map(({ to, label, Icon, highlight }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex items-center justify-center w-11 h-11 rounded-2xl transition-all ${
                      highlight
                        ? "bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/40 -mt-4 ring-4 ring-white"
                        : isActive
                        ? "bg-primary/10"
                        : ""
                    }`}
                  >
                    <Icon className={highlight ? "w-6 h-6" : "w-5 h-5"} />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
