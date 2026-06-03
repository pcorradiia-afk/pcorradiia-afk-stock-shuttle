import { Card } from "@/components/ui/card";

/** Se muestra cuando faltan las claves de Supabase (.env). */
export function SetupGuide() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">⚽️🏆</div>
        <h1 className="text-2xl font-extrabold">Prode Mundial 2026</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Falta un paso para que tus amigos puedan jugar online.
        </p>
      </div>

      <Card className="p-4 space-y-3 text-sm">
        <p className="font-bold">Conectar la base de datos (Supabase, gratis)</p>
        <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
          <li>
            Entrá a <b>supabase.com</b> y creá un proyecto nuevo (plan Free).
          </li>
          <li>
            En el panel: <b>SQL Editor</b> → pegá y ejecutá el archivo{" "}
            <code className="bg-muted px-1 rounded">supabase/schema.sql</code> del
            repo.
          </li>
          <li>
            En <b>Project Settings → API</b> copiá la{" "}
            <b>Project URL</b> y la <b>anon public key</b>.
          </li>
          <li>
            Pegalas en un archivo <code className="bg-muted px-1 rounded">.env</code>{" "}
            (mirá <code className="bg-muted px-1 rounded">.env.example</code>):
            <pre className="bg-muted rounded p-2 mt-1 overflow-x-auto text-xs">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
            </pre>
          </li>
          <li>
            Si lo subís a Vercel/Netlify, cargá esas 2 variables en el panel del
            hosting y volvé a deployar.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground pt-2 border-t">
          Todo el paso a paso (y cómo marcarte como admin) está en el{" "}
          <b>README.md</b>.
        </p>
      </Card>
    </div>
  );
}
