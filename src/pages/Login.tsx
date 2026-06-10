import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, TrendingUp } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { getRol } from "@/auth/permissions";
import { USUARIOS } from "@/data/demo";
import { Card, CardContent } from "@/components/ui/card";

export function Login() {
  const { usuario, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (usuario) navigate("/", { replace: true });
  }, [usuario, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel izquierdo (branding) */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-bold">Grupo Fiorasi</div>
            <div className="text-sm text-primary-foreground/80">Control · Auditoría · Gestión</div>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-bold leading-tight">
            Una sola plataforma para gestionar todo el grupo.
          </h2>
          <p className="max-w-md text-primary-foreground/85">
            Rentabilidad por departamento, ventas y márgenes, cuentas corrientes y auditoría —
            multiempresa y multiusuario, con la información de tu DMS.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">
          Versión demo · datos ficticios. Próximamente con autenticación Supabase.
        </p>
      </div>

      {/* Panel derecho (selección de perfil) */}
      <div className="flex items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="font-bold">Grupo Fiorasi</div>
          </div>

          <h1 className="text-xl font-bold">Ingresar al sistema</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            Elegí un perfil para ver cómo cambian los accesos según el rol.
          </p>

          <div className="space-y-2">
            {USUARIOS.map((u) => {
              const rol = getRol(u.rolId);
              const alcance =
                u.scope === "grupo" ? "Todas las empresas" : `${u.empresaIds.length} empresa(s)`;
              return (
                <Card
                  key={u.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => login(u.id)}
                  onKeyDown={(e) => e.key === "Enter" && login(u.id)}
                  className="cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                      {u.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{u.nombre}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {rol?.nombre} · <Building2 className="inline h-3 w-3" /> {alcance}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
