'use client';

/**
 * Componente de Firma Digital Mejorado
 * - Persistencia automática mientras el usuario dibuja
 * - Vista previa de firma guardada
 * - Resistente al cierre de teclado móvil
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, Check, X, Edit2, CheckCircle } from 'lucide-react';

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
  const [savedSignature, setSavedSignature] = useState<string | null>(initialValue || null);
  const [showCanvas, setShowCanvas] = useState(!initialValue); // Mostrar canvas solo si NO hay firma inicial
  const [isDrawing, setIsDrawing] = useState(false);

  // Sincronizar savedSignature con initialValue cuando cambia
  useEffect(() => {
    if (initialValue && initialValue !== savedSignature) {
      setSavedSignature(initialValue);
      setShowCanvas(false); // Ocultar canvas si hay firma
    } else if (!initialValue && savedSignature) {
      // Si se limpia initialValue desde el padre, mantener savedSignature pero mostrar que está guardada
      // No hacer nada, mantener la firma guardada localmente
    }
  }, [initialValue]);

  const handleClear = useCallback(() => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setIsDrawing(false);
  }, []);

  const handleSave = useCallback(() => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataURL = sigCanvas.current.toDataURL('image/png');
      setSavedSignature(dataURL);
      setShowCanvas(false); // Ocultar canvas para mostrar preview
      onSave(dataURL); // Notificar al padre con toast
      toast.success('Firma guardada', { duration: 2000 });
    } else if (savedSignature) {
      // Si ya hay una firma guardada (del auto-save), solo ocultar canvas
      setShowCanvas(false);
      toast.success('Firma guardada', { duration: 2000 });
    } else {
      toast.error('Debe firmar antes de guardar');
    }
  }, [onSave, savedSignature]);

  const handleEdit = useCallback(() => {
    setShowCanvas(true);
    // Restaurar firma guardada en el canvas para editar
    setTimeout(() => {
      if (savedSignature && sigCanvas.current) {
        try {
          sigCanvas.current.fromDataURL(savedSignature);
          setIsEmpty(false);
        } catch (error) {
          console.error('Error loading signature:', error);
        }
      }
    }, 100);
  }, [savedSignature]);

  const handleBegin = useCallback(() => {
    setIsDrawing(true);
  }, []);

  const handleEnd = useCallback(() => {
    setIsDrawing(false);
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsEmpty(false);
      // Auto-guardar mientras dibuja (persistencia inmediata)
      try {
        const dataURL = sigCanvas.current.toDataURL('image/png');
        // Guardar localmente para que no se pierda
        setSavedSignature(dataURL);
        // Notificar al padre que hay cambios (sin mostrar toast)
        if (onChange) onChange(dataURL);
      } catch (error) {
        console.error('Error saving signature:', error);
      }
    }
  }, [onChange]);

  const handleRemove = useCallback(() => {
    setSavedSignature(null);
    setShowCanvas(true);
    handleClear();
    onSave('');
  }, [handleClear, onSave]);

  return (
    <div className="w-full space-y-3">
      {/* Header con indicador de estado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </span>
          {savedSignature && !showCanvas && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle className="h-3 w-3" />
              Guardada
            </span>
          )}
        </div>
      </div>

      {/* Vista previa de firma guardada */}
      {savedSignature && !showCanvas && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border-2 border-green-300 bg-white p-4">
            <img
              src={savedSignature}
              alt="Firma guardada"
              className="mx-auto h-32 w-full object-contain"
            />
            <div className="absolute right-2 top-2 rounded-full bg-green-500 p-1">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleEdit}
              className="flex-1"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Editar Firma
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
      )}

      {/* Canvas de firma (solo visible cuando no hay firma guardada o en modo edición) */}
      {(!savedSignature || showCanvas) && (
        <Card className="border-2 border-dashed">
          <CardContent className="p-4 space-y-3">
            {/* Canvas */}
            <div className="relative overflow-hidden rounded-lg border-2 border-gray-300 bg-white">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'w-full h-40 sm:h-48 cursor-crosshair touch-none',
                  style: { touchAction: 'none' },
                }}
                backgroundColor="white"
                penColor="#093071"
                onBegin={handleBegin}
                onEnd={handleEnd}
              />
              {isEmpty && !isDrawing && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-gray-400 text-center px-4">
                    Firme aquí con el dedo o el mouse
                  </p>
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={isEmpty}
                className="flex-1"
              >
                <Eraser className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
              {savedSignature && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCanvas(false)}
                  className="flex-1"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                onClick={handleSave}
                disabled={isEmpty}
                className="flex-1 bg-primary"
              >
                <Check className="mr-2 h-4 w-4" />
                Guardar
              </Button>
            </div>

            {/* Instrucción compacta */}
            <p className="text-xs text-center text-gray-500">
              La firma se guarda automáticamente mientras dibuja
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
