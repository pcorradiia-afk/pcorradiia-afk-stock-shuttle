import { useState } from "react";
import { MessageSquarePlus, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { agregarAnotacion, borrarAnotacion, useAnotaciones } from "@/data/anotaciones";
import { fecha } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/**
 * Bloque de anotaciones de usuario para una pantalla o entidad.
 * `contexto` identifica dónde se anclan (ej. "tablero", "cuentas-corrientes:e1").
 */
export function Anotaciones({ contexto, empresaId, titulo = "Anotaciones" }: {
  contexto: string;
  empresaId?: string | null;
  titulo?: string;
}) {
  const { usuario } = useAuth();
  const notas = useAnotaciones(contexto);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await agregarAnotacion({ contexto, empresaId, texto, autor: usuario?.nombre ?? usuario?.email });
      setTexto("");
    } catch (e) {
      toast.error("No se pudo guardar la nota", { description: (e as Error).message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="h-4 w-4 text-primary" /> {titulo}
          {notas.length > 0 && <span className="text-sm font-normal text-muted-foreground">({notas.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribí una observación, alerta o comentario para el equipo…"
            className="min-h-[44px] flex-1"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") guardar();
            }}
          />
          <Button onClick={guardar} disabled={enviando || !texto.trim()} className="sm:self-end">
            <MessageSquarePlus className="mr-1.5 h-4 w-4" /> Agregar
          </Button>
        </div>

        {notas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin anotaciones todavía. Dejá la primera. 📝</p>
        ) : (
          <ul className="space-y-2">
            {notas.map((n) => (
              <li key={n.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm">{n.texto}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {n.autor ?? "—"} · {fecha(n.creado_el)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => borrarAnotacion(n.id)}
                  aria-label="Eliminar nota"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
