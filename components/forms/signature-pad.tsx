'use client';

/**
 * Componente de Firma Digital
 * Utiliza react-signature-canvas para capturar firmas
 */

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, Check, X } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel?: () => void;
  label?: string;
  required?: boolean;
}

export default function SignaturePad({
  onSave,
  onCancel,
  label = 'Firma Digital',
  required = false,
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
    }
  };

  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsEmpty(false);
    }
  };

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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isEmpty}
          >
            <Eraser className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
          <div className="flex-1" />
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isEmpty}
            className="bg-primary"
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
