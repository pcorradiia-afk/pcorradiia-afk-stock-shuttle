import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function Onboarding() {
  const { session, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    const display = name.trim();
    if (display.length < 2) {
      toast.error("Poné tu nombre (como te conocen en el grupo)");
      return;
    }
    if (!session?.user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").insert({
      id: session.user.id,
      display_name: display,
    });
    setLoading(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    await refreshProfile();
    toast.success(`¡Bienvenido, ${display}!`);
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">👋</div>
          <h1 className="text-2xl font-extrabold">¿Cómo te llamás?</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Así te ven en la tabla tus amigos.
          </p>
        </div>
        <Card className="p-5">
          <form onSubmit={createProfile} className="space-y-3">
            <Input
              placeholder="Tu nombre o apodo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando…" : "Empezar a jugar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={signOut}
            >
              Salir
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
