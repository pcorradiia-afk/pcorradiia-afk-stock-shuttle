import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download } from 'lucide-react';

interface ImportPreview {
  row: number;
  data: Record<string, any>;
  status: 'valid' | 'duplicate' | 'error';
  errors: string[];
  existingUnitId?: string;
}

interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

interface UnitImportProps {
  onImportComplete: () => void;
  onCancel: () => void;
}

const FIELD_MAPPINGS = {
  // Mapeo de columnas con sinónimos
  vin: ['vin', 'chasis', 'numero_chasis'],
  codigo_fabrica: ['codigo_fabrica', 'codigo', 'factory_code'],
  pedido_fabrica: ['pedido_fabrica', 'orden', 'pedido', 'nro_pedido_fabrica', 'order'],
  marca: ['marca', 'brand'],
  modelo: ['modelo', 'model'],
  version: ['version', 'variant'],
  anio_modelo: ['anio_modelo', 'año_modelo', 'my', 'year'],
  color_exterior: ['color_exterior', 'color', 'exterior_color'],
  color_interior: ['color_interior', 'interior_color'],
  estado_stock: ['estado_stock', 'estado', 'status', 'stock_status'],
  ubicacion: ['ubicacion', 'concesionario', 'sucursal', 'location'],
  precio_lista: ['precio_lista', 'list_price', 'precio'],
  precio_minimo: ['precio_minimo', 'min_price'],
  costo: ['costo', 'cost'],
  bonificacion: ['bonificacion', 'bonus'],
  impuestos: ['impuestos', 'taxes'],
  fecha_arribo_estimada: ['fecha_arribo_estimada', 'eta', 'estimated_arrival'],
  fecha_arribo_real: ['fecha_arribo_real', 'arrival_date'],
  lote: ['lote', 'batch', 'lot']
};

const STATUS_MAPPINGS = {
  'disponible': ['disponible', 'available', 'stock', 'en_stock'],
  'reservado': ['reservado', 'reserved', 'reserva'],
  'comprometido': ['comprometido', 'committed'],
  'vendido': ['vendido', 'sold'],
  'entregado': ['entregado', 'delivered'],
  'en_transito': ['en_transito', 'transito', 'transit', 'in_transit'],
  'taller': ['taller', 'workshop', 'service'],
  'demo': ['demo', 'demonstration']
};

const UBICACION_MAPPINGS = {
  'sucursal_central': ['central', 'sucursal_central', 'main'],
  'sucursal_neuquen': ['neuquen', 'neuquén', 'sucursal_neuquen'],
  'sucursal_rio_negro': ['rio_negro', 'río_negro', 'rionegro', 'sucursal_rio_negro'],
  'sucursal_trelew': ['trelew', 'sucursal_trelew'],
  'sucursal_esquel': ['esquel', 'sucursal_esquel'],
  'planta_fabrica': ['planta_fabrica', 'fabrica', 'factory', 'plant'],
  'transito': ['transito', 'tránsito', 'transit'],
  'taller': ['taller', 'workshop', 'service']
};

export const UnitImport: React.FC<UnitImportProps> = ({ onImportComplete, onCancel }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'confirm'>('upload');
  const [defaultValues, setDefaultValues] = useState<Record<string, any>>({});
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateVin = (vin: string): boolean => {
    if (!vin) return true;
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(vin.toUpperCase());
  };

  const parsePrice = (value: string): number => {
    if (!value || value === '') return 0;
    // Handle different number formats: 1.234.567,89 or 1,234,567.89
    const cleanValue = value.toString()
      .replace(/[^\d.,]/g, '') // Remove non-numeric chars except . and ,
      .replace(/\.(?=.*\.)/g, '') // Remove dots that aren't the last one
      .replace(/,(?=.*,)/g, '') // Remove commas that aren't the last one
      .replace(',', '.'); // Convert comma decimal separator to dot
    
    return parseFloat(cleanValue) || 0;
  };

  const parseDate = (value: string): string | null => {
    if (!value) return null;
    
    // Try different date formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // dd/mm/yyyy or mm/dd/yyyy
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // yyyy-mm-dd
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // dd-mm-yyyy
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        try {
          let [, part1, part2, part3] = match;
          let year, month, day;

          if (format === formats[1]) { // yyyy-mm-dd
            year = parseInt(part1);
            month = parseInt(part2);
            day = parseInt(part3);
          } else {
            // Assume dd/mm/yyyy for Spanish format
            day = parseInt(part1);
            month = parseInt(part2);
            year = parseInt(part3);
          }

          const date = new Date(year, month - 1, day);
          if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    return null;
  };

  const findFieldMapping = (header: string, mappings: Record<string, string[]>): string | null => {
    const normalizedHeader = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    
    for (const [field, synonyms] of Object.entries(mappings)) {
      if (synonyms.some(synonym => 
        normalizedHeader.includes(synonym.toLowerCase()) || 
        synonym.toLowerCase().includes(normalizedHeader)
      )) {
        return field;
      }
    }
    
    return null;
  };

  const normalizeValue = (field: string, value: string): any => {
    if (!value || value.trim() === '') return null;

    switch (field) {
      case 'vin':
        return value.toUpperCase().trim();
      case 'anio_modelo':
        const year = parseInt(value);
        return isNaN(year) ? null : year;
      case 'precio_lista':
      case 'precio_minimo':
      case 'costo':
      case 'bonificacion':
      case 'impuestos':
        return parsePrice(value);
      case 'fecha_arribo_estimada':
      case 'fecha_arribo_real':
        return parseDate(value);
      case 'estado_stock':
        const normalizedStatus = value.toLowerCase().trim();
        for (const [status, synonyms] of Object.entries(STATUS_MAPPINGS)) {
          if (synonyms.some(syn => normalizedStatus.includes(syn))) {
            return status;
          }
        }
        return 'disponible'; // Default
      case 'ubicacion':
        const normalizedLocation = value.toLowerCase().trim();
        for (const [location, synonyms] of Object.entries(UBICACION_MAPPINGS)) {
          if (synonyms.some(syn => normalizedLocation.includes(syn))) {
            return location;
          }
        }
        return null;
      default:
        return value.trim();
    }
  };

  const validateRow = (data: Record<string, any>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Required fields
    if (!data.codigo_fabrica) errors.push('Código de fábrica es obligatorio');
    if (!data.pedido_fabrica) errors.push('Pedido de fábrica es obligatorio');
    if (!data.marca) errors.push('Marca es obligatoria');
    if (!data.modelo) errors.push('Modelo es obligatorio');
    if (!data.color_exterior) errors.push('Color exterior es obligatorio');

    // VIN validation
    if (data.vin && !validateVin(data.vin)) {
      errors.push('VIN inválido (17 caracteres alfanuméricos, sin I/O/Q)');
    }

    // Year validation
    if (data.anio_modelo && (data.anio_modelo < 2015 || data.anio_modelo > 2030)) {
      errors.push('Año debe estar entre 2015 y 2030');
    }

    // Price validation
    if (data.precio_lista && data.precio_lista <= 0) {
      errors.push('Precio de lista debe ser mayor a 0');
    }

    return { isValid: errors.length === 0, errors };
  };

  const processFile = async (file: File) => {
    setLoading(true);
    setProgress(10);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('El archivo está vacío');
      }

      setProgress(30);

      // Find header row (first row with >= 3 typical fields)
      let headerIndex = 0;
      let headers: string[] = [];
      
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const row = lines[i].split(',').map(cell => cell.replace(/['"]/g, '').trim());
        const mappedFields = row.filter(header => 
          findFieldMapping(header, FIELD_MAPPINGS) !== null
        );
        
        if (mappedFields.length >= 3) {
          headerIndex = i;
          headers = row;
          break;
        }
      }

      if (headers.length === 0) {
        throw new Error('No se pudo detectar la cabecera del archivo');
      }

      setProgress(50);

      // Create field mapping
      const fieldMapping: Record<number, string> = {};
      headers.forEach((header, index) => {
        const mappedField = findFieldMapping(header, FIELD_MAPPINGS);
        if (mappedField) {
          fieldMapping[index] = mappedField;
        }
      });

      // Process data rows
      const dataLines = lines.slice(headerIndex + 1);
      const processedRows: ImportPreview[] = [];
      const existingVins = new Set();
      const existingCodes = new Set();

      // Get existing VINs and codes from database
      const { data: existingUnits } = await supabase
        .from('units')
        .select('vin, codigo_fabrica');
      
      existingUnits?.forEach(unit => {
        if (unit.vin) existingVins.add(unit.vin);
        existingCodes.add(unit.codigo_fabrica);
      });

      setProgress(70);

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const cells = line.split(',').map(cell => cell.replace(/['"]/g, '').trim());
        
        const rowData: Record<string, any> = {};
        
        // Map fields
        Object.entries(fieldMapping).forEach(([cellIndex, fieldName]) => {
          const cellValue = cells[parseInt(cellIndex)] || '';
          rowData[fieldName] = normalizeValue(fieldName, cellValue);
        });

        // Validate row
        const { isValid, errors } = validateRow(rowData);
        
        let status: 'valid' | 'duplicate' | 'error' = 'valid';
        
        if (!isValid) {
          status = 'error';
        } else if (
          (rowData.vin && existingVins.has(rowData.vin)) ||
          existingCodes.has(rowData.codigo_fabrica)
        ) {
          status = 'duplicate';
        }

        processedRows.push({
          row: headerIndex + i + 2, // +2 because arrays are 0-indexed and we want 1-indexed row numbers
          data: rowData,
          status,
          errors
        });
      }

      setProgress(90);

      // Generate summary
      const newSummary: ImportSummary = {
        totalRows: processedRows.length,
        validRows: processedRows.filter(r => r.status === 'valid').length,
        invalidRows: processedRows.filter(r => r.status === 'error').length,
        duplicateRows: processedRows.filter(r => r.status === 'duplicate').length,
        errors: processedRows
          .filter(r => r.status === 'error')
          .flatMap(r => r.errors.map(error => ({ 
            row: r.row, 
            field: '', 
            message: error 
          })))
      };

      setPreview(processedRows);
      setSummary(newSummary);
      setStep('preview');
      setProgress(100);

      toast({
        title: "Archivo procesado",
        description: `${newSummary.totalRows} filas procesadas`,
      });

    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo procesar el archivo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview.length) return;

    setLoading(true);
    setProgress(0);

    try {
      const validRows = preview.filter(r => r.status === 'valid');
      const batchSize = 10;
      let imported = 0;

      for (let i = 0; i < validRows.length; i += batchSize) {
        const batch = validRows.slice(i, i + batchSize);
        const insertData = batch.map(row => ({
          ...row.data,
          // Apply default values for missing fields
          ubicacion: row.data.ubicacion || defaultValues.ubicacion || 'sucursal_central',
          estado_stock: row.data.estado_stock || defaultValues.estado_stock || 'disponible'
        }));

        const { error } = await supabase
          .from('units')
          .insert(insertData);

        if (error) throw error;

        imported += batch.length;
        setProgress(Math.round((imported / validRows.length) * 100));
      }

      toast({
        title: "Importación exitosa",
        description: `${imported} unidades importadas correctamente`,
      });

      onImportComplete();

    } catch (error: any) {
      console.error('Error importing units:', error);
      toast({
        title: "Error en la importación",
        description: error.message || "No se pudieron importar las unidades",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      valid: { color: 'hsl(var(--success))', icon: CheckCircle },
      duplicate: { color: 'hsl(var(--warning))', icon: AlertCircle },
      error: { color: 'hsl(var(--destructive))', icon: XCircle }
    };

    const variant = variants[status as keyof typeof variants];
    const Icon = variant.icon;

    return (
      <Badge style={{ backgroundColor: variant.color, color: 'white' }}>
        <Icon className="h-3 w-3 mr-1" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (step === 'upload') {
    return (
      <div className="space-y-6">
        {/* Instructions */}
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Formato esperado:</strong> CSV con datos de vehículos. 
            El sistema detectará automáticamente la cabecera y mapeará las columnas.
            <br />
            <strong>Campos requeridos:</strong> Código Fábrica, Pedido, Marca, Modelo, Color Exterior
          </AlertDescription>
        </Alert>

        {/* Upload Area */}
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Subir archivo de importación</h3>
                <p className="text-muted-foreground">
                  Arrastra tu archivo CSV aquí o haz clic para seleccionar
                </p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()}>
                Seleccionar archivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {loading && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Procesando archivo...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{summary?.totalRows}</div>
              <div className="text-sm text-muted-foreground">Total Filas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{summary?.validRows}</div>
              <div className="text-sm text-muted-foreground">Válidas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary?.duplicateRows}</div>
              <div className="text-sm text-muted-foreground">Duplicadas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{summary?.invalidRows}</div>
              <div className="text-sm text-muted-foreground">Con Errores</div>
            </CardContent>
          </Card>
        </div>

        {/* Default Values */}
        <Card>
          <CardHeader>
            <CardTitle>Valores por Defecto</CardTitle>
            <CardDescription>
              Configure valores por defecto para campos faltantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Ubicación por defecto</Label>
                <Select 
                  value={defaultValues.ubicacion || ''} 
                  onValueChange={(value) => setDefaultValues(prev => ({ ...prev, ubicacion: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sucursal_central">Sucursal Central</SelectItem>
                    <SelectItem value="sucursal_neuquen">Sucursal Neuquén</SelectItem>
                    <SelectItem value="sucursal_rio_negro">Sucursal Río Negro</SelectItem>
                    <SelectItem value="sucursal_trelew">Sucursal Trelew</SelectItem>
                    <SelectItem value="sucursal_esquel">Sucursal Esquel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado por defecto</Label>
                <Select 
                  value={defaultValues.estado_stock || ''} 
                  onValueChange={(value) => setDefaultValues(prev => ({ ...prev, estado_stock: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="en_transito">En Tránsito</SelectItem>
                    <SelectItem value="reservado">Reservado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Datos</CardTitle>
            <CardDescription>
              Revise los datos antes de confirmar la importación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fila</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Errores</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 50).map((row) => (
                    <TableRow key={row.row}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.data.codigo_fabrica || '-'}
                      </TableCell>
                      <TableCell>{row.data.marca || '-'}</TableCell>
                      <TableCell>{row.data.modelo || '-'}</TableCell>
                      <TableCell>{row.data.anio_modelo || '-'}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <div className="text-sm text-destructive">
                            {row.errors.join(', ')}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {preview.length > 50 && (
              <div className="text-sm text-muted-foreground mt-2">
                Mostrando primeras 50 filas de {preview.length}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep('upload')}>
            Volver
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={!summary || summary.validRows === 0}
            >
              Confirmar Importación ({summary?.validRows || 0} unidades)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};