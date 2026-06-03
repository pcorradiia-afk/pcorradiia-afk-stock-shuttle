import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, Shield, BookOpen, Check, X } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/store/auth";
import { useLeaderboard } from "@/store/queries";
import { supabase } from "@/lib/supabase";

export function Profile() {
  const { profile, session, signOut, refreshProfile } = useAuth();
  const { rows } = useLeaderboard();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? "");

  const myRow = rows.find((r) => r.profile.id === profile?.id);
  const myPos = rows.findIndex((r) => r.profile.id === profile?.id);

  async function saveName() {
    const display = name.trim();
    if (display.length < 2) {
      toast.error("Nombre muy corto");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: display })
      .eq("id", profile!.id);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    await refreshProfile();
    setEditing(false);
    toast.success("Listo");
  }

  if (!profile) return null;

  return (
    <>
      <AppHeader title="Mi perfil" />
      <div className="px-4 py-4 space-y-4">
        <Card className="p-5 flex items-center gap-4">
          <Avatar name={profile.display_name} size={64} />
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
                <button onClick={saveName} className="text-emerald-600">
                  <Check />
                </button>
                <button onClick={() => setEditing(false)} className="text-muted-foreground">
                  <X />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setName(profile.display_name);
                  setEditing(true);
                }}
                className="text-left"
              >
                <p className="text-xl font-extrabold leading-tight">
                  {profile.display_name}
                </p>
                <p className="text-xs text-muted-foreground">Tocá para editar</p>
              </button>
            )}
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {session?.user.email}
            </p>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Puntaje</p>
            <p className="text-2xl font-extrabold">{myRow?.breakdown.total ?? 0}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Posición</p>
            <p className="text-2xl font-extrabold">
              {myPos >= 0 ? `#${myPos + 1}` : "—"}
            </p>
          </Card>
        </div>

        <Card className="p-3 flex items-center justify-between">
          <span className="text-sm">Entrada pagada</span>
          {profile.paid ? (
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              ✓ Sí
            </span>
          ) : (
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              Pendiente
            </span>
          )}
        </Card>

        <Link to="/reglas">
          <Card className="p-3 flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="w-4 h-4 text-primary" /> Reglas y pozo
          </Card>
        </Link>

        {profile.is_admin && (
          <Link to="/admin">
            <Card className="p-3 flex items-center gap-2 text-sm font-semibold">
              <Shield className="w-4 h-4 text-primary" /> Panel de administración
            </Card>
          </Link>
        )}

        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="w-4 h-4 mr-1" /> Cerrar sesión
        </Button>
      </div>
    </>
  );
}
