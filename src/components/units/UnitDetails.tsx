import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Car, Calendar, MapPin, DollarSign, FileText, Edit2, 
  History, Image, Info, Clock, Package
} from 'lucide-react';
import { Unit } from './UnitsManagement';

interface UnitDetailsProps {
  unit: Unit;
  onClose: () => void;
  onEdit: () => void;
}

interface AuditEntry {
  id: string;
  accion: string;
  antes: any;
  despues: any;
  fecha: string;
  usuario_id: string;
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
  sucursal_central: 'Sucursal Central',
  sucursal_neuquen: 'Sucursal Neuquén',
  sucursal_rio_negro: 'Sucursal Río Negro', 
  sucursal_trelew: 'Sucursal Trelew',
  sucursal_esquel: 'Sucursal Esquel',
  planta_fabrica: 'Planta Fábrica',
  transito: 'En Tránsito',
  taller: 'Taller'
};

export const UnitDetails: React.FC<UnitDetailsProps> = ({ unit, onClose, onEdit }) => {
  const { profile } = useAuth();
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    fetchAuditLog();
  }, [unit.id]);

  const fetchAuditLog = async () => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entidad', 'units')
        .eq('entidad_id', unit.id)
        .order('fecha', { ascending: false });

      if (error) throw error;
      setAuditLog(data || []);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoadingAudit(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const canEdit = profile?.rol === 'administrador' || profile?.rol === 'logistica';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">
            {unit.marca} {unit.modelo}
          </h2>
          <p className="text-muted-foreground">
            {unit.version} · {unit.anio_modelo}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {getStatusBadge(unit.estado_stock)}
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Info className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financiero
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Image className="h-4 w-4 mr-2" />
            Fotos
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" />
            Auditoría
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vehicle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Car className="h-5 w-5 mr-2" />
                  Información del Vehículo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>VIN</Label>
                    <p className="font-mono text-sm">{unit.vin || 'No asignado'}</p>
                  </div>
                  <div>
                    <Label>Código Fábrica</Label>
                    <p className="font-mono text-sm">{unit.codigo_fabrica}</p>
                  </div>
                  <div>
                    <Label>Pedido Fábrica</Label>
                    <p className="font-mono text-sm">{unit.pedido_fabrica}</p>
                  </div>
                  <div>
                    <Label>Lote</Label>
                    <p className="text-sm">{unit.lote || 'No asignado'}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Marca</Label>
                    <p className="font-medium">{unit.marca}</p>
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <p className="font-medium">{unit.modelo}</p>
                  </div>
                  <div>
                    <Label>Versión</Label>
                    <p className="text-sm">{unit.version}</p>
                  </div>
                  <div>
                    <Label>Año Modelo</Label>
                    <p className="text-sm">{unit.anio_modelo}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Color Exterior</Label>
                    <p className="text-sm">{unit.color_exterior}</p>
                  </div>
                  <div>
                    <Label>Color Interior</Label>
                    <p className="text-sm">{unit.color_interior || 'No especificado'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status and Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Estado y Ubicación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Estado de Stock</Label>
                  <div className="mt-1">
                    {getStatusBadge(unit.estado_stock)}
                  </div>
                </div>
                
                <div>
                  <Label>Ubicación</Label>
                  <Badge variant="outline" className="mt-1">
                    {UBICACION_LABELS[unit.ubicacion]}
                  </Badge>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha Creación</Label>
                    <p className="text-sm">{formatDate(unit.created_at)}</p>
                  </div>
                  <div>
                    <Label>Última Actualización</Label>
                    <p className="text-sm">{formatDate(unit.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Fechas Importantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha Arribo Estimada</Label>
                    <p className="text-sm">
                      {unit.fecha_arribo_estimada 
                        ? new Date(unit.fecha_arribo_estimada).toLocaleDateString('es-AR')
                        : 'No programada'
                      }
                    </p>
                  </div>
                  <div>
                    <Label>Fecha Arribo Real</Label>
                    <p className="text-sm">
                      {unit.fecha_arribo_real 
                        ? new Date(unit.fecha_arribo_real).toLocaleDateString('es-AR')
                        : 'Pendiente'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Precios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Precio Lista</Label>
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(unit.precio_lista)}
                    </p>
                  </div>
                  <div>
                    <Label>Precio Mínimo</Label>
                    <p className="text-lg font-semibold">
                      {unit.precio_minimo ? formatPrice(unit.precio_minimo) : 'No definido'}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Costo</Label>
                    <p className="text-sm">{formatPrice(unit.costo)}</p>
                  </div>
                  <div>
                    <Label>Margen Bruto</Label>
                    <p className="text-sm font-medium">
                      {unit.precio_lista && unit.costo 
                        ? formatPrice(unit.precio_lista - unit.costo)
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deducciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Bonificación</Label>
                  <p className="text-lg font-semibold text-green-600">
                    {formatPrice(unit.bonificacion)}
                  </p>
                </div>
                
                <div>
                  <Label>Impuestos</Label>
                  <p className="text-lg font-semibold text-orange-600">
                    {formatPrice(unit.impuestos)}
                  </p>
                </div>

                <Separator />

                <div>
                  <Label>Precio Final Estimado</Label>
                  <p className="text-xl font-bold text-primary">
                    {formatPrice(unit.precio_lista - unit.bonificacion + unit.impuestos)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen Financiero</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Precio Lista:</span>
                  <span className="font-medium">{formatPrice(unit.precio_lista)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Bonificación:</span>
                  <span className="font-medium">-{formatPrice(unit.bonificacion)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Impuestos:</span>
                  <span className="font-medium">+{formatPrice(unit.impuestos)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">
                    {formatPrice(unit.precio_lista - unit.bonificacion + unit.impuestos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Margen sobre costo:</span>
                  <span>
                    {unit.costo > 0 
                      ? `${(((unit.precio_lista - unit.bonificacion + unit.impuestos - unit.costo) / unit.costo) * 100).toFixed(1)}%`
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Galería de Fotos</CardTitle>
              <CardDescription>
                Fotos e imágenes asociadas al vehículo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Image className="h-4 w-4" />
                <AlertDescription>
                  La funcionalidad de fotos estará disponible próximamente. 
                  Se podrán cargar múltiples imágenes del vehículo desde diferentes ángulos.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Cambios</CardTitle>
              <CardDescription>
                Registro completo de modificaciones realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAudit ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Cargando historial...</p>
                </div>
              ) : auditLog.length === 0 ? (
                <Alert>
                  <History className="h-4 w-4" />
                  <AlertDescription>
                    No hay registros de auditoría para esta unidad.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {entry.accion}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            por Usuario {entry.usuario_id.slice(0, 8)}...
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(entry.fecha)}
                        </span>
                      </div>
                      
                      {entry.antes && entry.despues && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Antes:</h4>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                              {JSON.stringify(entry.antes, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-1">Después:</h4>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                              {JSON.stringify(entry.despues, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper component for labels
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-sm font-medium text-muted-foreground">{children}</span>
);