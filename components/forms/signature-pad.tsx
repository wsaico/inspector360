'use client';

/**
 * Componente de Firma Digital - Solución Simple y Efectiva
 * - Usa solo estado local + refs para evitar loops
 * - Auto-persiste en localStorage SIN notificar al padre constantemente
 * - Notifica al padre SOLO cuando el usuario presiona "Guardar"
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { optimizeSignature } from '@/lib/utils/signature';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Eraser, Check, X, Edit2, CheckCircle, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  onCancel?: () => void;
  label?: string;
  required?: boolean;
  onChange?: (signature: string) => void;
  initialValue?: string;
  storageKey?: string;
}

export default function SignaturePad({
  onSave,
  onCancel,
  label = 'Firma Digital',
  required = false,
  onChange,
  initialValue,
  storageKey,
}: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const hasInitialized = useRef(false);

  // Configuración: deshabilitar persistencia local para exigir firma cada vez
  const enableLocalStorage = false;

  // SOLO cargar al montar - UNA VEZ
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    try {
      const stored = enableLocalStorage && storageKey && typeof window !== 'undefined'
        ? localStorage.getItem(storageKey)
        : null;
      const signatureToUse = initialValue || stored || null;

      if (signatureToUse) {
        setSavedSignature(signatureToUse);
        setShowCanvas(false);
        setIsEmpty(false);
      } else {
        setShowCanvas(true);
        setIsEmpty(true);
      }
    } catch (error) {
      console.error('Error loading signature:', error);
      setShowCanvas(true);
    }
  }, []); // Sin dependencias - solo una vez

  const handleClear = useCallback(() => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setIsDrawing(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      // Intentar usar el lienzo recortado si la librería lo expone
      // Use getCanvas() directly. Our optimizeSignature utility handles trimming manually.
      const rawCanvas: HTMLCanvasElement | undefined = (sigCanvas.current as any).getCanvas?.();

      // Optimizar en el navegador para tamaño ~3–4 KB
      let dataURL: string;
      if (rawCanvas) {
        dataURL = await optimizeSignature(rawCanvas);
      } else {
        // Fallback: optimizar a partir del DataURL si no podemos acceder al canvas
        const pngDataURL = sigCanvas.current.toDataURL('image/png');
        const img = new Image();
        img.src = pngDataURL;
        await new Promise((res) => (img.onload = res));
        const tmp = document.createElement('canvas');
        tmp.width = img.width;
        tmp.height = img.height;
        const ctx = tmp.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        dataURL = await optimizeSignature(tmp);
      }

      // Guardar en estado local
      setSavedSignature(dataURL);
      setShowCanvas(false);
      setIsEmpty(false);

      // Persistencia deshabilitada intencionalmente para forzar firma cada vez
      if (enableLocalStorage && storageKey) {
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, dataURL);
          }
        } catch (error) {
          console.error('Error saving to localStorage:', error);
        }
      }

      // AHORA SÍ notificar al padre
      onSave(dataURL);
      if (onChange) onChange(dataURL);

      toast.success('Firma guardada correctamente', { duration: 2000 });
    } else if (savedSignature) {
      // Ya hay firma guardada
      setShowCanvas(false);
      onSave(savedSignature);
      if (onChange) onChange(savedSignature);
      toast.success('Firma guardada correctamente', { duration: 2000 });
    } else {
      toast.error('Debe firmar antes de guardar');
    }
  }, [savedSignature, onSave, onChange, storageKey]);

  const handleEdit = useCallback(() => {
    setShowCanvas(true);
    // Restaurar firma en canvas
    setTimeout(() => {
      if (savedSignature && sigCanvas.current) {
        try {
          sigCanvas.current.fromDataURL(savedSignature);
          setIsEmpty(false);
        } catch (error) {
          console.error('Error loading signature for edit:', error);
        }
      }
    }, 100);
  }, [savedSignature]);

  const handleBegin = useCallback(() => {
    setIsDrawing(true);
  }, []);

  const handleEnd = useCallback(async () => {
    setIsDrawing(false);
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsEmpty(false);

      // AUTO-GUARDAR local deshabilitado (sin localStorage)
      try {
        if (!sigCanvas.current) return;

        // Use getCanvas() directly. Our optimizeSignature utility handles trimming manually.
        const rawCanvas: HTMLCanvasElement | undefined = (sigCanvas.current as any).getCanvas?.();
        let dataURL: string;
        if (rawCanvas) {
          dataURL = await optimizeSignature(rawCanvas);
        } else {
          const pngDataURL = sigCanvas.current.toDataURL('image/png');
          const img = new Image();
          img.src = pngDataURL;
          await new Promise((res) => (img.onload = res));
          const tmp = document.createElement('canvas');
          tmp.width = img.width;
          tmp.height = img.height;
          const ctx = tmp.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          dataURL = await optimizeSignature(tmp);
        }
        // mantener en estado local para vista previa
        setSavedSignature(dataURL);
      } catch (error) {
        console.error('Error auto-saving signature:', error);
      }
    }
  }, [storageKey]);

  const handleRemove = useCallback(() => {
    setSavedSignature(null);
    setShowCanvas(true);
    setIsEmpty(true);
    handleClear();

    // Persistencia en localStorage está deshabilitada

    // Notificar al padre que se eliminó
    onSave('');
    if (onChange) onChange('');
  }, [handleClear, onSave, onChange, storageKey]);

  return (
    <div className="w-full space-y-3">
      {/* Header */}
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

      {/* Vista previa */}
      {savedSignature && !showCanvas && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[30px] border-4 border-[#B3D400]/30 bg-white p-6 shadow-inner">
            <img
              src={savedSignature}
              alt="Firma guardada"
              className="mx-auto h-32 w-full object-contain"
            />
            <div className="absolute right-4 top-4 rounded-xl bg-[#B3D400] p-2 shadow-lg">
              <Check className="h-4 w-4 text-[#0A3161]" />
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleEdit}
              className="flex-1 h-12 rounded-2xl border-2 border-[#0A3161] text-[#0A3161] font-black uppercase text-[10px] tracking-widest hover:bg-[#0A3161] hover:text-white transition-all"
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              className="flex-1 h-12 rounded-2xl text-red-600 border-2 border-red-100 hover:bg-red-50 font-black uppercase text-[10px] tracking-widest transition-all"
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </div>
      )}

      {/* Canvas */}
      {(!savedSignature || showCanvas) && (
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-[30px] border-4 border-slate-100 bg-white shadow-inner p-1">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-48 sm:h-64 cursor-crosshair touch-none',
                style: { touchAction: 'none' },
              }}
              backgroundColor="white"
              penColor="#0A3161"
              onBegin={handleBegin}
              onEnd={handleEnd}
            />
            {isEmpty && !isDrawing && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center space-y-2">
                <PenTool className="w-8 h-8 text-slate-100" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                  Firme su Atala aquí
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={isEmpty}
                className="flex-1 h-14 rounded-2xl border-2 border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all"
              >
                <Eraser className="mr-2 h-4 w-4" />
                REINICIAR
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isEmpty}
                className="flex-1 h-14 rounded-2xl bg-[#0A3161] text-white hover:bg-[#0c3c75] font-black uppercase text-[10px] tracking-widest shadow-xl transition-all"
              >
                <Check className="mr-2 h-4 w-4 text-[#B3D400]" />
                GUARDAR FIRMA
              </Button>
            </div>
          </div>

          <p className="text-[9px] font-black text-center text-slate-300 uppercase tracking-widest">
            Biometría Digital • Inspector 360 Core
          </p>
        </div>
      )
      }
    </div >
  );
}
