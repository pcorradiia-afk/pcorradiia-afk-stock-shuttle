import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import type { Permiso } from "@/types";

/** Pantalla mínima mientras se restaura la sesión real (Supabase). */
function Restaurando() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Restaurando sesión…
    </div>
  );
}

/** Protege una ruta: requiere sesión y, opcionalmente, un permiso. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Restaurando />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequirePermiso({ permiso, children }: { permiso: Permiso; children: React.ReactNode }) {
  const { usuario, can, cargando } = useAuth();
  if (cargando) return <Restaurando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!can(permiso)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Muestra el contenido solo si el usuario tiene el permiso (sin redirigir). */
export function Can({ permiso, children }: { permiso: Permiso; children: React.ReactNode }) {
  const { can } = useAuth();
  return can(permiso) ? <>{children}</> : null;
}
