import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Car, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { StockStatus, HoldStatus } from '@/types/database';

interface DashboardStats {
  totalUnits: number;
  availableUnits: number;
  reservedUnits: number;
  committedUnits: number;
  soldUnits: number;
  expiringHolds: number;
  salesThisMonth: number;
  pendingArrivals: number;
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUnits: 0,
    availableUnits: 0,
    reservedUnits: 0,
    committedUnits: 0,
    soldUnits: 0,
    expiringHolds: 0,
    salesThisMonth: 0,
    pendingArrivals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Get unit statistics
      const { data: units } = await supabase
        .from('units')
        .select('estado_stock, fecha_arribo_estimada');

      // Get holds statistics
      const { data: holds } = await supabase
        .from('holds')
        .select('estado, fecha_vencimiento')
        .eq('estado', 'activo');

      // Get sales this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .gte('fecha_venta', startOfMonth.toISOString());

      if (units) {
        const totalUnits = units.length;
        const availableUnits = units.filter(u => u.estado_stock === 'disponible').length;
        const reservedUnits = units.filter(u => u.estado_stock === 'reservado').length;
        const committedUnits = units.filter(u => u.estado_stock === 'comprometido').length;
        const soldUnits = units.filter(u => u.estado_stock === 'vendido').length;
        
        const now = new Date();
        const pendingArrivals = units.filter(u => 
          u.fecha_arribo_estimada && 
          new Date(u.fecha_arribo_estimada) > now &&
          ['en_transito', 'asignado_fabrica'].includes(u.estado_stock)
        ).length;

        // Count holds expiring in next 48 hours
        const expiringHolds = holds?.filter(h => {
          const expirationDate = new Date(h.fecha_vencimiento);
          const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
          return expirationDate <= fortyEightHoursFromNow;
        }).length || 0;

        setStats({
          totalUnits,
          availableUnits,
          reservedUnits,
          committedUnits,
          soldUnits,
          expiringHolds,
          salesThisMonth: sales?.length || 0,
          pendingArrivals,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Unidades',
      value: stats.totalUnits,
      icon: Car,
      description: 'Total en inventario',
      color: 'bg-blue-500'
    },
    {
      title: 'Disponibles',
      value: stats.availableUnits,
      icon: CheckCircle,
      description: 'Listas para venta',
      color: 'bg-green-500'
    },
    {
      title: 'Reservadas',
      value: stats.reservedUnits,
      icon: Clock,
      description: 'En proceso de reserva',
      color: 'bg-yellow-500'
    },
    {
      title: 'Comprometidas',
      value: stats.committedUnits,
      icon: AlertTriangle,
      description: 'Asignadas a ventas',
      color: 'bg-orange-500'
    },
    {
      title: 'Vendidas',
      value: stats.soldUnits,
      icon: TrendingUp,
      description: 'Operaciones cerradas',
      color: 'bg-purple-500'
    },
    {
      title: 'Ventas del Mes',
      value: stats.salesThisMonth,
      icon: TrendingUp,
      description: 'Facturadas este mes',
      color: 'bg-green-600'
    },
    {
      title: 'Próximos Arribos',
      value: stats.pendingArrivals,
      icon: Calendar,
      description: 'Unidades en tránsito',
      color: 'bg-blue-600'
    },
    {
      title: 'Reservas por Vencer',
      value: stats.expiringHolds,
      icon: AlertTriangle,
      description: 'Próximas 48 horas',
      color: 'bg-red-500'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen del estado actual del inventario
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.color} bg-opacity-20`}>
                <card.icon className="h-4 w-4 text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.expiringHolds > 0 && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="h-5 w-5" />
              Alertas Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="destructive">
                {stats.expiringHolds} reserva(s) vencen en las próximas 48 horas
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};