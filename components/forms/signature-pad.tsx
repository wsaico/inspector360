'use client';

/**
 * Componente de Firma Digital
 * Utiliza react-signature-canvas para capturar firmas
 */

import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, Check, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel?: () => void;
  label?: string;
  required?: boolean;
  onChange?: (signature: string) => void;
  initialValue?: string;
}

export default function SignaturePad({
  onSave,
  onCancel,
  label = 'Firma Digital',
  required = false,
  onChange,
  initialValue,
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataURL = sigCanvas.current.toDataURL('image/png');
      onSave(dataURL);
      toast.success('Firma guardada');
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsEmpty(false);
      try {
        const dataURL = sigCanvas.current.toDataURL('image/png');
        if (onChange) onChange(dataURL);
      } catch {}
    }
  };

  // Cargar una firma inicial si existe (rehidratar en móviles al re-render)
  useEffect(() => {
    try {
      if (initialValue && sigCanvas.current) {
        // Solo si el canvas está vacío para evitar sobreescribir firmas nuevas
        if (sigCanvas.current.isEmpty()) {
          sigCanvas.current.fromDataURL(initialValue);
          setIsEmpty(false);
        }
      }
    } catch {}
  }, [initialValue]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas de firma */}
        <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: 'w-full h-48 cursor-crosshair touch-none',
              style: { touchAction: 'none' },
            }}
            backgroundColor="white"
            penColor="#093071"
            onEnd={handleEnd}
          />
          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-gray-400">
                Firme aquí usando el mouse o touch
              </p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isEmpty}
            className="w-full sm:w-auto"
          >
            <Eraser className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isEmpty}
            className="bg-primary w-full sm:w-auto"
          >
            <Check className="mr-2 h-4 w-4" />
            Guardar Firma
          </Button>
        </div>

        {/* Instrucciones */}
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-blue-900">
            💡 <strong>Instrucciones:</strong> Firme dentro del recuadro usando
            el mouse (computadora) o el dedo (tablet/móvil). Puede limpiar y
            volver a firmar si es necesario.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
