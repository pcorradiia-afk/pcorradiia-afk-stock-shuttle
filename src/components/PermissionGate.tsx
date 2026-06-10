import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import type { Permiso } from "@/types";

/** Protege una ruta: requiere sesión y, opcionalmente, un permiso. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function RequirePermiso({ permiso, children }: { permiso: Permiso; children: React.ReactNode }) {
  const { usuario, can } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (!can(permiso)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Muestra el contenido solo si el usuario tiene el permiso (sin redirigir). */
export function Can({ permiso, children }: { permiso: Permiso; children: React.ReactNode }) {
  const { can } = useAuth();
  return can(permiso) ? <>{children}</> : null;
}
