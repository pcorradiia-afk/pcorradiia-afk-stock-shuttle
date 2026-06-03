import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GROUP_NAME, HOST_FLAGS } from "@/data/brand";

export function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Poné un email válido");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error("No se pudo enviar el link", { description: error.message });
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen wc-header text-white grid place-items-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-2">⚽️🏆</div>
          <h1 className="text-3xl font-extrabold leading-tight text-shadow">
            {GROUP_NAME}
          </h1>
          <p className="text-white/90 mt-1 font-semibold">Prode Mundial 2026</p>
          <p className="text-2xl mt-2 tracking-widest">{HOST_FLAGS}</p>
        </div>

        <Card className="p-5 text-foreground">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-4xl">📩</div>
              <p className="font-bold">¡Te mandamos un link!</p>
              <p className="text-sm text-muted-foreground">
                Revisá <b>{email}</b> (y la carpeta de spam) y tocá el link para
                entrar. Se abre solo en esta app.
              </p>
              <Button variant="ghost" onClick={() => setSent(false)}>
                Usar otro email
              </Button>
            </div>
          ) : (
            <form onSubmit={sendLink} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Entrá con tu email. Te mandamos un link mágico, sin contraseñas.
              </p>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tucorreo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando…" : "Entrar"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
