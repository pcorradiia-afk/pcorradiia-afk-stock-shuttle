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

  if (!user) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'catalog':
        return <VehicleCatalog />;
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
