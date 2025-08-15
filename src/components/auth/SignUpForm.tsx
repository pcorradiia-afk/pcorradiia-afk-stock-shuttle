import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/types/database';

interface SignUpFormProps {
  onToggleMode: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onToggleMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [rol, setRol] = useState<UserRole>('ventas');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !nombre || !apellido) {
      toast({
        title: 'Error',
        description: 'Por favor complete todos los campos',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, nombre, apellido, rol);
      toast({
        title: 'Éxito',
        description: 'Cuenta creada correctamente. Puede iniciar sesión.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al crear la cuenta',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Registrarse</CardTitle>
        <CardDescription>Crear nueva cuenta de usuario</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apellido">Apellido</Label>
              <Input
                id="apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Pérez"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan.perez@ejemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rol">Rol</Label>
            <Select value={rol} onValueChange={(value: UserRole) => setRol(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ventas">Ventas</SelectItem>
                <SelectItem value="logistica">Logística</SelectItem>
                <SelectItem value="gerencia">Gerencia</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Cuenta
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onToggleMode}
          >
            ¿Ya tiene cuenta? Iniciar Sesión
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};