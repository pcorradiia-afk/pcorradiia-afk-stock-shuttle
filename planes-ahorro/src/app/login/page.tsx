"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSesion } from "@/lib/session";
import { USUARIOS } from "@/lib/demo-data";
import { nombreRol } from "@/lib/roles";
import { MODO_DEMO } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSesion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const ingresar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const r = await login(email, password);
    setEnviando(false);
    if (r.ok) router.replace("/dashboard");
    else setError(r.error ?? "No se pudo iniciar sesión.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary">Planes de Ahorro</h1>
          <p className="text-sm text-muted-foreground">Grupo Corradi · Pedro Corradi y SAPAC (Fiorasi)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ingresar</CardTitle>
            <CardDescription>
              {MODO_DEMO ? "Accedé con tu email corporativo." : "Accedé con tu email y contraseña."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={ingresar} className="space-y-3">
              <Input
                type="email"
                placeholder="tu.email@grupocorradi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              {!MODO_DEMO && (
                <Input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando ? "Ingresando…" : "Ingresar"}
              </Button>
              {!MODO_DEMO && (
                <p className="text-xs text-muted-foreground">
                  ¿Olvidaste la contraseña? Pedile al administrador que te la restablezca desde Supabase.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {MODO_DEMO && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modo demo</CardTitle>
              <CardDescription>
                Todavía no hay Supabase configurado. Probá la app entrando con cualquiera de
                estos usuarios de ejemplo (hacé clic para autocompletar):
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {USUARIOS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setEmail(u.email)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span>
                    <span className="font-medium">{u.nombre}</span>
                    <span className="block text-xs text-muted-foreground">{u.email}</span>
                  </span>
                  <span className="flex flex-wrap justify-end gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r} variant="secondary">{nombreRol(r)}</Badge>
                    ))}
                    {u.tipoPerfil === "terciarizada" && <Badge variant="warning">terciarizada</Badge>}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
