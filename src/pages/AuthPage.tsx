import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { Car } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Car className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Sistema de Gestión
          </h1>
          <p className="text-muted-foreground mt-2">
            Stock Vehicular - Concesionaria
          </p>
        </div>

        {isLogin ? (
          <LoginForm onToggleMode={() => setIsLogin(false)} />
        ) : (
          <SignUpForm onToggleMode={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
};

export default AuthPage;