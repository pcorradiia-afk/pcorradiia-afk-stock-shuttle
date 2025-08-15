import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Save, X, AlertCircle } from 'lucide-react';
import { Unit } from './UnitsManagement';

interface UnitFormProps {
  unit?: Unit | null;
  onSave: () => void;
  onCancel: () => void;
}

interface FormData {
  vin: string;
  codigo_fabrica: string;
  pedido_fabrica: string;
  marca: string;
  modelo: string;
  version: string;
  anio_modelo: number;
  color_exterior: string;
  color_interior: string;
  estado_stock: Unit['estado_stock'];
  ubicacion: Unit['ubicacion'];
  precio_lista: number;
  precio_minimo: number;
  costo: number;
  bonificacion: number;
  impuestos: number;
  fecha_arribo_estimada: string;
  fecha_arribo_real: string;
  lote: string;
}

const ESTADOS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'comprometido', label: 'Comprometido' },
  { value: 'vendido', label: 'Vendido' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'en_transito', label: 'En Tránsito' },
  { value: 'asignado_fabrica', label: 'Asignado Fábrica' }
];

const UBICACIONES = [
  { value: 'sucursal_central', label: 'Sucursal Central' },
  { value: 'sucursal_neuquen', label: 'Sucursal Neuquén' },
  { value: 'sucursal_rio_negro', label: 'Sucursal Río Negro' },
  { value: 'sucursal_trelew', label: 'Sucursal Trelew' },
  { value: 'sucursal_esquel', label: 'Sucursal Esquel' },
  { value: 'planta_fabrica', label: 'Planta Fábrica' },
  { value: 'transito', label: 'En Tránsito' },
  { value: 'taller', label: 'Taller' }
];

export const UnitForm: React.FC<UnitFormProps> = ({ unit, onSave, onCancel }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [formData, setFormData] = useState<FormData>({
    vin: '',
    codigo_fabrica: '',
    pedido_fabrica: '',
    marca: '',
    modelo: '',
    version: '',
    anio_modelo: new Date().getFullYear(),
    color_exterior: '',
    color_interior: '',
    estado_stock: 'disponible',
    ubicacion: 'sucursal_central',
    precio_lista: 0,
    precio_minimo: 0,
    costo: 0,
    bonificacion: 0,
    impuestos: 0,
    fecha_arribo_estimada: '',
    fecha_arribo_real: '',
    lote: ''
  });

  useEffect(() => {
    if (unit) {
      setFormData({
        vin: unit.vin || '',
        codigo_fabrica: unit.codigo_fabrica,
        pedido_fabrica: unit.pedido_fabrica,
        marca: unit.marca,
        modelo: unit.modelo,
        version: unit.version,
        anio_modelo: unit.anio_modelo,
        color_exterior: unit.color_exterior,
        color_interior: unit.color_interior || '',
        estado_stock: unit.estado_stock,
        ubicacion: unit.ubicacion,
        precio_lista: unit.precio_lista,
        precio_minimo: unit.precio_minimo || 0,
        costo: unit.costo,
        bonificacion: unit.bonificacion,
        impuestos: unit.impuestos,
        fecha_arribo_estimada: unit.fecha_arribo_estimada || '',
        fecha_arribo_real: unit.fecha_arribo_real || '',
        lote: unit.lote || ''
      });
    }
  }, [unit]);

  const validateVin = (vin: string): boolean => {
    if (!vin) return true; // VIN is optional
    
    // VIN must be exactly 17 characters, alphanumeric, no I, O, Q
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(vin.toUpperCase());
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Required fields
    if (!formData.codigo_fabrica.trim()) {
      newErrors.codigo_fabrica = 'El código de fábrica es obligatorio';
    }
    if (!formData.pedido_fabrica.trim()) {
      newErrors.pedido_fabrica = 'El pedido de fábrica es obligatorio';
    }
    if (!formData.marca.trim()) {
      newErrors.marca = 'La marca es obligatoria';
    }
    if (!formData.modelo.trim()) {
      newErrors.modelo = 'El modelo es obligatorio';
    }
    if (!formData.version.trim()) {
      newErrors.version = 'La versión es obligatoria';
    }
    if (!formData.color_exterior.trim()) {
      newErrors.color_exterior = 'El color exterior es obligatorio';
    }

    // VIN validation
    if (formData.vin && !validateVin(formData.vin)) {
      newErrors.vin = 'VIN inválido (17 caracteres alfanuméricos, sin I/O/Q)';
    }

    // Year validation
    const currentYear = new Date().getFullYear();
    if (formData.anio_modelo < 2015 || formData.anio_modelo > 2030) {
      newErrors.anio_modelo = 'El año debe estar entre 2015 y 2030';
    }

    // Price validations
    if (formData.precio_lista <= 0) {
      newErrors.precio_lista = 'El precio de lista debe ser mayor a 0';
    }
    if (formData.costo < 0) {
      newErrors.costo = 'El costo no puede ser negativo';
    }
    if (formData.bonificacion < 0) {
      newErrors.bonificacion = 'La bonificación no puede ser negativa';
    }
    if (formData.impuestos < 0) {
      newErrors.impuestos = 'Los impuestos no pueden ser negativos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor corrija los errores en el formulario",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        vin: formData.vin.trim().toUpperCase() || null,
        codigo_fabrica: formData.codigo_fabrica.trim(),
        pedido_fabrica: formData.pedido_fabrica.trim(),
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        version: formData.version.trim(),
        color_exterior: formData.color_exterior.trim(),
        color_interior: formData.color_interior.trim() || null,
        fecha_arribo_estimada: formData.fecha_arribo_estimada || null,
        fecha_arribo_real: formData.fecha_arribo_real || null,
        lote: formData.lote.trim() || null,
        precio_minimo: formData.precio_minimo || null
      };

      if (unit) {
        // Update existing unit
        const { error } = await supabase
          .from('units')
          .update(submitData)
          .eq('id', unit.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Unidad actualizada correctamente",
        });
      } else {
        // Create new unit
        const { error } = await supabase
          .from('units')
          .insert([submitData]);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Unidad creada correctamente",
        });
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving unit:', error);
      
      let errorMessage = "No se pudo guardar la unidad";
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        if (error.message.includes('vin')) {
          errorMessage = "Ya existe una unidad con este VIN";
        } else if (error.message.includes('codigo_fabrica')) {
          errorMessage = "Ya existe una unidad con este código de fábrica";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const canEdit = profile?.rol === 'administrador' || profile?.rol === 'logistica';

  if (!canEdit && !unit) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          No tiene permisos para crear nuevas unidades
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identificación */}
        <Card>
          <CardHeader>
            <CardTitle>Identificación</CardTitle>
            <CardDescription>Datos de identificación del vehículo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="vin">VIN (Opcional)</Label>
              <Input
                id="vin"
                value={formData.vin}
                onChange={(e) => handleInputChange('vin', e.target.value)}
                placeholder="17 caracteres alfanuméricos"
                maxLength={17}
                className={errors.vin ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.vin && (
                <p className="text-sm text-destructive mt-1">{errors.vin}</p>
              )}
            </div>

            <div>
              <Label htmlFor="codigo_fabrica">Código Fábrica *</Label>
              <Input
                id="codigo_fabrica"
                value={formData.codigo_fabrica}
                onChange={(e) => handleInputChange('codigo_fabrica', e.target.value)}
                className={errors.codigo_fabrica ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.codigo_fabrica && (
                <p className="text-sm text-destructive mt-1">{errors.codigo_fabrica}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pedido_fabrica">Pedido Fábrica *</Label>
              <Input
                id="pedido_fabrica"
                value={formData.pedido_fabrica}
                onChange={(e) => handleInputChange('pedido_fabrica', e.target.value)}
                className={errors.pedido_fabrica ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.pedido_fabrica && (
                <p className="text-sm text-destructive mt-1">{errors.pedido_fabrica}</p>
              )}
            </div>

            <div>
              <Label htmlFor="lote">Lote</Label>
              <Input
                id="lote"
                value={formData.lote}
                onChange={(e) => handleInputChange('lote', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </CardContent>
        </Card>

        {/* Especificaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Especificaciones</CardTitle>
            <CardDescription>Datos técnicos del vehículo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="marca">Marca *</Label>
              <Input
                id="marca"
                value={formData.marca}
                onChange={(e) => handleInputChange('marca', e.target.value)}
                className={errors.marca ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.marca && (
                <p className="text-sm text-destructive mt-1">{errors.marca}</p>
              )}
            </div>

            <div>
              <Label htmlFor="modelo">Modelo *</Label>
              <Input
                id="modelo"
                value={formData.modelo}
                onChange={(e) => handleInputChange('modelo', e.target.value)}
                className={errors.modelo ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.modelo && (
                <p className="text-sm text-destructive mt-1">{errors.modelo}</p>
              )}
            </div>

            <div>
              <Label htmlFor="version">Versión *</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => handleInputChange('version', e.target.value)}
                className={errors.version ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.version && (
                <p className="text-sm text-destructive mt-1">{errors.version}</p>
              )}
            </div>

            <div>
              <Label htmlFor="anio_modelo">Año Modelo *</Label>
              <Input
                id="anio_modelo"
                type="number"
                value={formData.anio_modelo}
                onChange={(e) => handleInputChange('anio_modelo', parseInt(e.target.value) || 0)}
                min={2015}
                max={2030}
                className={errors.anio_modelo ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.anio_modelo && (
                <p className="text-sm text-destructive mt-1">{errors.anio_modelo}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Colores */}
        <Card>
          <CardHeader>
            <CardTitle>Colores</CardTitle>
            <CardDescription>Colores del vehículo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="color_exterior">Color Exterior *</Label>
              <Input
                id="color_exterior"
                value={formData.color_exterior}
                onChange={(e) => handleInputChange('color_exterior', e.target.value)}
                className={errors.color_exterior ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.color_exterior && (
                <p className="text-sm text-destructive mt-1">{errors.color_exterior}</p>
              )}
            </div>

            <div>
              <Label htmlFor="color_interior">Color Interior</Label>
              <Input
                id="color_interior"
                value={formData.color_interior}
                onChange={(e) => handleInputChange('color_interior', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </CardContent>
        </Card>

        {/* Estado y Ubicación */}
        <Card>
          <CardHeader>
            <CardTitle>Estado y Ubicación</CardTitle>
            <CardDescription>Estado actual y ubicación física</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="estado_stock">Estado *</Label>
              <Select
                value={formData.estado_stock}
                onValueChange={(value) => handleInputChange('estado_stock', value)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((estado) => (
                    <SelectItem key={estado.value} value={estado.value}>
                      {estado.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ubicacion">Ubicación *</Label>
              <Select
                value={formData.ubicacion}
                onValueChange={(value) => handleInputChange('ubicacion', value)}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UBICACIONES.map((ubicacion) => (
                    <SelectItem key={ubicacion.value} value={ubicacion.value}>
                      {ubicacion.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Precios */}
        <Card>
          <CardHeader>
            <CardTitle>Precios</CardTitle>
            <CardDescription>Información comercial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="precio_lista">Precio Lista *</Label>
              <Input
                id="precio_lista"
                type="number"
                step="0.01"
                value={formData.precio_lista}
                onChange={(e) => handleInputChange('precio_lista', parseFloat(e.target.value) || 0)}
                className={errors.precio_lista ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.precio_lista && (
                <p className="text-sm text-destructive mt-1">{errors.precio_lista}</p>
              )}
            </div>

            <div>
              <Label htmlFor="precio_minimo">Precio Mínimo</Label>
              <Input
                id="precio_minimo"
                type="number"
                step="0.01"
                value={formData.precio_minimo}
                onChange={(e) => handleInputChange('precio_minimo', parseFloat(e.target.value) || 0)}
                disabled={!canEdit}
              />
            </div>

            <div>
              <Label htmlFor="costo">Costo</Label>
              <Input
                id="costo"
                type="number"
                step="0.01"
                value={formData.costo}
                onChange={(e) => handleInputChange('costo', parseFloat(e.target.value) || 0)}
                className={errors.costo ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.costo && (
                <p className="text-sm text-destructive mt-1">{errors.costo}</p>
              )}
            </div>

            <div>
              <Label htmlFor="bonificacion">Bonificación</Label>
              <Input
                id="bonificacion"
                type="number"
                step="0.01"
                value={formData.bonificacion}
                onChange={(e) => handleInputChange('bonificacion', parseFloat(e.target.value) || 0)}
                className={errors.bonificacion ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.bonificacion && (
                <p className="text-sm text-destructive mt-1">{errors.bonificacion}</p>
              )}
            </div>

            <div>
              <Label htmlFor="impuestos">Impuestos</Label>
              <Input
                id="impuestos"
                type="number"
                step="0.01"
                value={formData.impuestos}
                onChange={(e) => handleInputChange('impuestos', parseFloat(e.target.value) || 0)}
                className={errors.impuestos ? 'border-destructive' : ''}
                disabled={!canEdit}
              />
              {errors.impuestos && (
                <p className="text-sm text-destructive mt-1">{errors.impuestos}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fechas */}
        <Card>
          <CardHeader>
            <CardTitle>Fechas</CardTitle>
            <CardDescription>Fechas de arribo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fecha_arribo_estimada">Fecha Arribo Estimada</Label>
              <Input
                id="fecha_arribo_estimada"
                type="date"
                value={formData.fecha_arribo_estimada}
                onChange={(e) => handleInputChange('fecha_arribo_estimada', e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div>
              <Label htmlFor="fecha_arribo_real">Fecha Arribo Real</Label>
              <Input
                id="fecha_arribo_real"
                type="date"
                value={formData.fecha_arribo_real}
                onChange={(e) => handleInputChange('fecha_arribo_real', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Actions */}
      {canEdit && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : (unit ? 'Actualizar' : 'Crear')}
          </Button>
        </div>
      )}
    </form>
  );
};