import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, KeyRound, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { getRol } from "@/auth/rolesStore";
import { USUARIOS } from "@/data/demo";
import { Logo, FIORASI_NAVY } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Formulario de login real (email + contraseña contra Supabase Auth). */
function LoginReal() {
  const { loginReal } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const err = await loginReal(email, password);
    setEnviando(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@empresa.com.ar"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9"
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-9"
            required
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Ingresar
      </Button>
      <p className="text-xs text-muted-foreground">
        ¿Sin acceso? Pedile al administrador que cree tu usuario y tu perfil.
      </p>
    </form>
  );
}

/** Selección de perfil (modo demostración, sin Supabase). */
function LoginDemo() {
  const { login } = useAuth();
  return (
    <div className="space-y-2">
      {USUARIOS.map((u) => {
        const rol = getRol(u.rolId);
        const alcance = u.scope === "grupo" ? "Todas las empresas" : `${u.empresaIds.length} empresa(s)`;
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
  );
}

export function Login() {
  const { usuario, modoReal, cargando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (usuario) navigate("/", { replace: true });
  }, [usuario, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel izquierdo (branding) */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div>
          <Logo className="text-3xl text-white" />
          <div className="mt-1 text-sm text-primary-foreground/80">Control · Auditoría · Gestión</div>
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
          {modoReal ? "Acceso con usuario y contraseña." : "Versión demo · datos ficticios."}
        </p>
      </div>

      {/* Panel derecho */}
      <div className="flex items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Logo className="text-2xl" style={{ color: FIORASI_NAVY }} />
          </div>

          <h1 className="text-xl font-bold">Ingresar al sistema</h1>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">
            {modoReal
              ? "Ingresá con tu email y contraseña."
              : "Elegí un perfil para ver cómo cambian los accesos según el rol."}
          </p>

          {cargando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Restaurando sesión…
            </div>
          ) : modoReal ? (
            <LoginReal />
          ) : (
            <LoginDemo />
          )}
        </div>
      </div>
    </div>
  );
}
