import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Unit, StockStatus, LocationType } from '@/types/database';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  Search, 
  Filter, 
  Eye, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Car,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const VehicleCatalog: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<LocationType | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    filterUnits();
  }, [units, searchTerm, statusFilter, locationFilter, brandFilter, modelFilter]);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUnits(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Error al cargar el catálogo: ' + error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUnits = () => {
    let filtered = units;

    if (searchTerm) {
      filtered = filtered.filter(unit => 
        unit.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.codigo_fabrica.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.version.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(unit => unit.estado_stock === statusFilter);
    }

    if (locationFilter !== 'all') {
      filtered = filtered.filter(unit => unit.ubicacion === locationFilter);
    }

    if (brandFilter !== 'all') {
      filtered = filtered.filter(unit => unit.marca === brandFilter);
    }

    if (modelFilter !== 'all') {
      filtered = filtered.filter(unit => unit.modelo === modelFilter);
    }

    setFilteredUnits(filtered);
  };

  const getStatusBadge = (status: StockStatus) => {
    const statusConfig = {
      disponible: { variant: 'default' as const, label: 'Disponible', color: 'bg-green-100 text-green-800' },
      reservado: { variant: 'secondary' as const, label: 'Reservado', color: 'bg-yellow-100 text-yellow-800' },
      comprometido: { variant: 'outline' as const, label: 'Comprometido', color: 'bg-orange-100 text-orange-800' },
      vendido: { variant: 'default' as const, label: 'Vendido', color: 'bg-blue-100 text-blue-800' },
      entregado: { variant: 'default' as const, label: 'Entregado', color: 'bg-purple-100 text-purple-800' },
      cancelado: { variant: 'destructive' as const, label: 'Cancelado', color: 'bg-red-100 text-red-800' },
      en_transito: { variant: 'outline' as const, label: 'En Tránsito', color: 'bg-blue-100 text-blue-800' },
      asignado_fabrica: { variant: 'outline' as const, label: 'Asignado Fábrica', color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: StockStatus) => {
    switch (status) {
      case 'disponible': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'reservado': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'comprometido': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default: return <Car className="h-4 w-4 text-gray-600" />;
    }
  };

  const uniqueBrands = [...new Set(units.map(unit => unit.marca))];
  const uniqueModels = [...new Set(units.map(unit => unit.modelo))];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const exportToCsv = () => {
    const headers = [
      'VIN', 'Código Fábrica', 'Marca', 'Modelo', 'Versión', 'Año', 
      'Color Exterior', 'Estado', 'Ubicación', 'Precio Lista'
    ];
    
    const csvData = filteredUnits.map(unit => [
      unit.vin || '',
      unit.codigo_fabrica,
      unit.marca,
      unit.modelo,
      unit.version,
      unit.anio_modelo,
      unit.color_exterior,
      unit.estado_stock,
      unit.ubicacion,
      unit.precio_lista
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `catalogo-vehiculos-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Vehículos</h1>
          <p className="text-muted-foreground">
            Gestión completa del inventario vehicular
          </p>
        </div>
        <Button onClick={exportToCsv} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por VIN, código, marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={(value: StockStatus | 'all') => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="reservado">Reservado</SelectItem>
                <SelectItem value="comprometido">Comprometido</SelectItem>
                <SelectItem value="vendido">Vendido</SelectItem>
                <SelectItem value="en_transito">En Tránsito</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={(value: LocationType | 'all') => setLocationFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Ubicación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las ubicaciones</SelectItem>
                <SelectItem value="sucursal_central">Sucursal Central</SelectItem>
                <SelectItem value="sucursal_norte">Sucursal Norte</SelectItem>
                <SelectItem value="sucursal_sur">Sucursal Sur</SelectItem>
                <SelectItem value="deposito_principal">Depósito Principal</SelectItem>
                <SelectItem value="en_transito">En Tránsito</SelectItem>
              </SelectContent>
            </Select>

            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {uniqueBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los modelos</SelectItem>
                {uniqueModels.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resultados ({filteredUnits.length} {filteredUnits.length === 1 ? 'vehículo' : 'vehículos'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(unit.estado_stock)}
                        {getStatusBadge(unit.estado_stock)}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {unit.vin || 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {unit.codigo_fabrica}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{unit.marca} {unit.modelo}</div>
                        <div className="text-sm text-muted-foreground">{unit.version}</div>
                      </div>
                    </TableCell>
                    <TableCell>{unit.anio_modelo}</TableCell>
                    <TableCell>{unit.color_exterior}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {unit.ubicacion.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(unit.precio_lista)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};