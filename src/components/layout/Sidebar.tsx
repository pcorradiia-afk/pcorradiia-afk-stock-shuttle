import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  LayoutDashboard, 
  Car, 
  BookOpen, 
  ShoppingCart, 
  Upload, 
  BarChart3, 
  Settings,
  Users,
  History
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { profile } = useAuth();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['administrador', 'ventas', 'logistica', 'gerencia']
    },
    {
      id: 'catalog',
      label: 'Catálogo de Stock',
      icon: Car,
      roles: ['administrador', 'ventas', 'logistica', 'gerencia']
    },
    {
      id: 'holds',
      label: 'Compromisos',
      icon: BookOpen,
      roles: ['administrador', 'ventas', 'gerencia']
    },
    {
      id: 'sales',
      label: 'Ventas',
      icon: ShoppingCart,
      roles: ['administrador', 'ventas', 'gerencia']
    },
    {
      id: 'imports',
      label: 'Importaciones',
      icon: Upload,
      roles: ['administrador', 'logistica']
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: BarChart3,
      roles: ['administrador', 'gerencia']
    },
    {
      id: 'audit',
      label: 'Auditoría',
      icon: History,
      roles: ['administrador', 'gerencia']
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: Users,
      roles: ['administrador']
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: Settings,
      roles: ['administrador']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(profile?.rol || 'ventas')
  );

  return (
    <div className="w-64 bg-card border-r h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Menú Principal</h2>
        <nav className="space-y-2">
          {filteredMenuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeTab === item.id ? 'default' : 'ghost'}
              className={cn(
                'w-full justify-start',
                activeTab === item.id && 'bg-primary text-primary-foreground'
              )}
              onClick={() => onTabChange(item.id)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
};