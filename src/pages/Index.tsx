import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { AuthPage } from '@/pages/AuthPage';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { VehicleCatalog } from '@/components/units/VehicleCatalog';

const Index = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show demo interface when Supabase is not configured
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 bg-primary rounded"></div>
                <span className="text-xl font-bold">Stock Vehicular - DEMO</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Complete la integración de Supabase para usar la aplicación
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-4xl font-bold">Sistema de Gestión de Stock Vehicular</h1>
            <p className="text-xl text-muted-foreground">
              Una aplicación completa para gestionar inventario de vehículos 0km
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">🔧 Configuración Requerida</h3>
              <p className="text-yellow-700">
                Para usar esta aplicación, necesita completar la integración con Supabase:
              </p>
              <ol className="mt-2 text-left text-yellow-700 space-y-1">
                <li>1. Haga clic en el botón verde "Supabase" (arriba a la derecha)</li>
                <li>2. Complete el proceso de conexión</li>
                <li>3. La aplicación se activará automáticamente</li>
              </ol>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="bg-card border rounded-lg p-6">
                <h3 className="font-semibold mb-2">🚗 Gestión de Inventario</h3>
                <p className="text-sm text-muted-foreground">
                  Controle el stock de vehículos, estados, ubicaciones y precios
                </p>
              </div>
              <div className="bg-card border rounded-lg p-6">
                <h3 className="font-semibold mb-2">📊 Dashboard & KPIs</h3>
                <p className="text-sm text-muted-foreground">
                  Métricas en tiempo real y alertas de gestión
                </p>
              </div>
              <div className="bg-card border rounded-lg p-6">
                <h3 className="font-semibold mb-2">🔒 Control de Reservas</h3>
                <p className="text-sm text-muted-foreground">
                  Evite sobreasignaciones con sistema de compromisos
                </p>
              </div>
              <div className="bg-card border rounded-lg p-6">
                <h3 className="font-semibold mb-2">📈 Reportes & Auditoría</h3>
                <p className="text-sm text-muted-foreground">
                  Reportes exportables y trazabilidad completa
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'catalog':
        return <VehicleCatalog />;
      case 'units':
        return React.createElement(
          React.lazy(() => import('../components/units/UnitsManagement').then(m => ({ default: m.UnitsManagement })))
        );
      case 'holds':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Compromisos</h2>
            <p className="text-muted-foreground">Módulo en desarrollo</p>
          </div>
        );
      case 'sales':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ventas</h2>
            <p className="text-muted-foreground">Módulo en desarrollo</p>
          </div>
        );
      case 'imports':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Importaciones</h2>
            <p className="text-muted-foreground">Módulo en desarrollo</p>
          </div>
        );
      case 'reports':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Reportes</h2>
            <p className="text-muted-foreground">Módulo en desarrollo</p>
          </div>
        );
      case 'audit':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Auditoría</h2>
            <p className="text-muted-foreground">Módulo en desarrollo</p>
          </div>
        );
      case 'users':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Usuarios</h2>
            <p className="text-muted-foreground">Módulo en desarrollo</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Configuración</h2>
            <p className="text-muted-foreground">Módulo en desarrollo</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
