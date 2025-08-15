import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  Search, Plus, Upload, Download, Edit2, Trash2, Eye, 
  Car, Calendar, MapPin, DollarSign, FileText, Camera,
  Filter, SortAsc, SortDesc, RefreshCw
} from 'lucide-react';
import { UnitForm } from './UnitForm';
import { UnitImport } from './UnitImport';
import { UnitDetails } from './UnitDetails';

export interface Unit {
  id: string;
  vin?: string;
  codigo_fabrica: string;
  pedido_fabrica: string;
  marca: string;
  modelo: string;
  version: string;
  anio_modelo: number;
  color_exterior: string;
  color_interior?: string;
  estado_stock: 'disponible' | 'reservado' | 'comprometido' | 'vendido' | 'entregado' | 'cancelado' | 'en_transito' | 'asignado_fabrica';
  ubicacion: 'sucursal_central' | 'sucursal_neuquen' | 'sucursal_rio_negro' | 'sucursal_trelew' | 'sucursal_esquel' | 'planta_fabrica' | 'transito' | 'taller';
  precio_lista: number;
  precio_minimo?: number;
  costo: number;
  bonificacion: number;
  impuestos: number;
  fecha_arribo_estimada?: string;
  fecha_arribo_real?: string;
  lote?: string;
  created_at: string;
  updated_at: string;
}

const ESTADO_COLORS = {
  disponible: 'hsl(var(--status-disponible))',
  reservado: 'hsl(var(--status-reservado))', 
  comprometido: 'hsl(var(--status-comprometido))',
  vendido: 'hsl(var(--status-vendido))',
  entregado: 'hsl(var(--status-entregado))',
  cancelado: 'hsl(var(--status-cancelado))',
  en_transito: 'hsl(var(--status-en-transito))',
  asignado_fabrica: 'hsl(var(--status-asignado))'
};

const UBICACION_LABELS = {
  sucursal_central: 'Central',
  sucursal_neuquen: 'Neuquén',
  sucursal_rio_negro: 'Río Negro', 
  sucursal_trelew: 'Trelew',
  sucursal_esquel: 'Esquel',
  planta_fabrica: 'Planta Fábrica',
  transito: 'En Tránsito',
  taller: 'Taller'
};

export const UnitsManagement = () => {
  const { user, profile } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [sortField, setSortField] = useState<keyof Unit>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Dialogs state
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las unidades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  // Filter and sort logic
  const filteredAndSortedUnits = useMemo(() => {
    let filtered = units.filter(unit => {
      const matchesSearch = !searchTerm || 
        Object.values(unit).some(value => 
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesStatus = !statusFilter || unit.estado_stock === statusFilter;
      const matchesLocation = !locationFilter || unit.ubicacion === locationFilter;
      const matchesBrand = !brandFilter || unit.marca.toLowerCase().includes(brandFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesLocation && matchesBrand;
    });

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredUnits(filtered);
    return filtered;
  }, [units, searchTerm, statusFilter, locationFilter, brandFilter, sortField, sortDirection]);

  // Pagination
  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedUnits.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedUnits, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedUnits.length / itemsPerPage);

  const handleSort = (field: keyof Unit) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (unitId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta unidad?')) return;

    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Unidad eliminada correctamente",
      });
      
      fetchUnits();
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la unidad",
        variant: "destructive",
      });
    }
  };

  const exportToCsv = () => {
    const headers = [
      'VIN', 'Código Fábrica', 'Pedido', 'Marca', 'Modelo', 'Versión', 
      'Año', 'Color Exterior', 'Estado', 'Ubicación', 'Precio Lista', 
      'Precio Mínimo', 'Costo', 'Bonificación'
    ];
    
    const csvData = filteredUnits.map(unit => [
      unit.vin || '',
      unit.codigo_fabrica,
      unit.pedido_fabrica,
      unit.marca,
      unit.modelo,
      unit.version,
      unit.anio_modelo,
      unit.color_exterior,
      unit.estado_stock,
      UBICACION_LABELS[unit.ubicacion],
      unit.precio_lista,
      unit.precio_minimo || '',
      unit.costo,
      unit.bonificacion
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `unidades_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusBadge = (status: Unit['estado_stock']) => {
    return (
      <Badge 
        style={{ 
          backgroundColor: ESTADO_COLORS[status],
          color: 'white',
          borderColor: ESTADO_COLORS[status]
        }}
      >
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const uniqueBrands = [...new Set(units.map(unit => unit.marca))];
  const uniqueStatuses = [...new Set(units.map(unit => unit.estado_stock))];
  const uniqueLocations = [...new Set(units.map(unit => unit.ubicacion))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando unidades...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Unidades 0km</h1>
          <p className="text-muted-foreground mt-2">
            Administre el inventario completo de vehículos
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCsv} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setShowImport(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button onClick={() => {
            setEditingUnit(null);
            setShowForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Unidad
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-primary" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Unidades</p>
                <p className="text-2xl font-bold">{units.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-success" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Disponibles</p>
                <p className="text-2xl font-bold">
                  {units.filter(u => u.estado_stock === 'disponible').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-warning" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Comprometidas</p>
                <p className="text-2xl font-bold">
                  {units.filter(u => ['reservado', 'comprometido'].includes(u.estado_stock)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-info" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Vendidas</p>
                <p className="text-2xl font-bold">
                  {units.filter(u => ['vendido', 'entregado'].includes(u.estado_stock)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ubicación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las ubicaciones</SelectItem>
                {uniqueLocations.map(location => (
                  <SelectItem key={location} value={location}>
                    {UBICACION_LABELS[location]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las marcas</SelectItem>
                {uniqueBrands.map(brand => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setLocationFilter('');
                setBrandFilter('');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Units Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unidades ({filteredAndSortedUnits.length})</CardTitle>
          <CardDescription>
            Listado completo de vehículos en inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('estado_stock')}
                  >
                    Estado
                    {sortField === 'estado_stock' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4 inline ml-1" /> : <SortDesc className="h-4 w-4 inline ml-1" />
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('vin')}
                  >
                    VIN
                    {sortField === 'vin' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4 inline ml-1" /> : <SortDesc className="h-4 w-4 inline ml-1" />
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('codigo_fabrica')}
                  >
                    Código
                    {sortField === 'codigo_fabrica' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4 inline ml-1" /> : <SortDesc className="h-4 w-4 inline ml-1" />
                    )}
                  </TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('anio_modelo')}
                  >
                    Año
                    {sortField === 'anio_modelo' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4 inline ml-1" /> : <SortDesc className="h-4 w-4 inline ml-1" />
                    )}
                  </TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead 
                    className="cursor-pointer"
                    onClick={() => handleSort('ubicacion')}
                  >
                    Ubicación
                    {sortField === 'ubicacion' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4 inline ml-1" /> : <SortDesc className="h-4 w-4 inline ml-1" />
                    )}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer text-right"
                    onClick={() => handleSort('precio_lista')}
                  >
                    Precio Lista
                    {sortField === 'precio_lista' && (
                      sortDirection === 'asc' ? <SortAsc className="h-4 w-4 inline ml-1" /> : <SortDesc className="h-4 w-4 inline ml-1" />
                    )}
                  </TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      {getStatusBadge(unit.estado_stock)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {unit.vin || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {unit.codigo_fabrica}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {unit.marca} {unit.modelo}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {unit.version}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{unit.anio_modelo}</TableCell>
                    <TableCell>{unit.color_exterior}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {UBICACION_LABELS[unit.ubicacion]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(unit.precio_lista)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUnit(unit);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(profile?.rol === 'administrador' || profile?.rol === 'logistica') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUnit(unit);
                                setShowForm(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(unit.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAndSortedUnits.length)} de {filteredAndSortedUnits.length} unidades
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (page > totalPages) return null;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? 'Editar Unidad' : 'Nueva Unidad'}
            </DialogTitle>
            <DialogDescription>
              {editingUnit ? 'Modifique los datos de la unidad' : 'Complete los datos de la nueva unidad'}
            </DialogDescription>
          </DialogHeader>
          <UnitForm
            unit={editingUnit}
            onSave={() => {
              setShowForm(false);
              setEditingUnit(null);
              fetchUnits();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingUnit(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Unidades</DialogTitle>
            <DialogDescription>
              Cargue un archivo CSV o Excel con los datos de las unidades
            </DialogDescription>
          </DialogHeader>
          <UnitImport
            onImportComplete={() => {
              setShowImport(false);
              fetchUnits();
            }}
            onCancel={() => setShowImport(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Unidad</DialogTitle>
            <DialogDescription>
              Información completa de la unidad
            </DialogDescription>
          </DialogHeader>
          {selectedUnit && (
            <UnitDetails
              unit={selectedUnit}
              onClose={() => {
                setShowDetails(false);
                setSelectedUnit(null);
              }}
              onEdit={() => {
                setEditingUnit(selectedUnit);
                setShowDetails(false);
                setShowForm(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};