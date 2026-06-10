import { Building2, Layers } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CompanySelector() {
  const { empresasVisibles, puedeConsolidar, seleccion, setSeleccion } = useAuth();

  return (
    <Select value={seleccion} onValueChange={setSeleccion}>
      <SelectTrigger className="w-[200px] sm:w-[240px]" aria-label="Seleccionar empresa">
        <SelectValue placeholder="Empresa" />
      </SelectTrigger>
      <SelectContent>
        {puedeConsolidar && (
          <SelectGroup>
            <SelectItem value="grupo">
              <span className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Grupo Fiorasi (consolidado)
              </span>
            </SelectItem>
          </SelectGroup>
        )}
        <SelectGroup>
          <SelectLabel>Empresas</SelectLabel>
          {empresasVisibles.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {e.nombre}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
