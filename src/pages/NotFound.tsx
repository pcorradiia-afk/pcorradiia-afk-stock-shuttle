import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-muted/30 p-6 text-center">
      <div>
        <div className="text-6xl font-black text-primary">404</div>
        <p className="mt-2 text-muted-foreground">No encontramos esa página.</p>
        <Button asChild className="mt-4">
          <Link to="/">Volver al tablero</Link>
        </Button>
      </div>
    </div>
  );
}
