import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { GROUP_NAME, HOST_FLAGS } from "@/data/brand";

export function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Poné un email válido");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Dejamos también el link como alternativa (sirve en la compu).
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      toast.error("No se pudo enviar el código", { description: error.message });
      return;
    }
    setSent(true);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length !== 6) {
      toast.error("El código tiene 6 números");
      return;
    }
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    setVerifying(false);
    if (error) {
      toast.error("Código incorrecto o vencido", {
        description: "Revisá el número o pedí uno nuevo.",
      });
      return;
    }
    // Listo: el cambio de sesión hace que la app entre sola.
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
            <form onSubmit={verifyCode} className="space-y-3 text-center">
              <div className="text-4xl">📩</div>
              <p className="font-bold">¡Te mandamos un código!</p>
              <p className="text-sm text-muted-foreground">
                Revisá <b>{email}</b> (y la carpeta de spam) y escribí acá el
                <b> código de 6 números</b>.
              </p>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="______"
                className="text-center text-2xl tracking-[0.5em] font-bold"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                autoFocus
              />
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying ? "Entrando…" : "Entrar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSent(false);
                  setCode("");
                }}
              >
                Usar otro email
              </Button>
            </form>
          ) : (
            <form onSubmit={sendCode} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Entrá con tu email. Te mandamos un <b>código</b> al correo, sin
                contraseñas.
              </p>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="tucorreo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? "Enviando…" : "Enviar código"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
