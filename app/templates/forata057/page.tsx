"use client";
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import FORATA057Template from '../../../components/pages/forata057-template';
import { FOR_ATA_057_FOOTER_NOTE } from '@/lib/constants';
import { InspectionProvider, useInspectionForm } from '@/context/inspection-context';
import { useSearchParams } from 'next/navigation';
import { InspectionService } from '@/lib/services';
import { supabase } from '@/lib/supabase/client';
import { isChecklistItemApplicable } from '@/lib/checklist-logic';

function TemplateWithData() {
  const { formData } = useInspectionForm();
  const searchParams = useSearchParams();
  const inspectionId = searchParams.get('id');
  const isPdfMode = searchParams.get('pdf') === '1';
  const defaultLogo = useMemo(() => {
    const p = searchParams.get('logo');
    // Usa tu logo por defecto si no se especifica parámetro
    return p && p.trim().length > 0 ? p : '/logo.png';
  }, [searchParams]);
  const [remote, setRemote] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!inspectionId) return;
      const { data } = await InspectionService.getInspectionById(inspectionId);
      if (data) setRemote(data);
    };
    load();
  }, [inspectionId]);

  // Flag global para que el endpoint sepa que el render está listo
  useEffect(() => {
    try {
      (window as any).__forata057_ready = false;
    } catch { }
    return () => {
      try { delete (window as any).__forata057_ready; } catch { }
    };
  }, []);

  useEffect(() => {
    try {
      if (inspectionId) {
        (window as any).__forata057_ready = !!remote;
      } else {
        // Cuando no hay id (preview desde formulario), lo damos por listo
        (window as any).__forata057_ready = true;
      }
    } catch { }
  }, [inspectionId, remote]);

  // ✅ Auto print cuando DOM y recursos (imágenes) están listos
  useEffect(() => {
    const shouldPrint = searchParams.get('print') === 'true';
    if (!shouldPrint) return;

    // Si hay inspectionId, DEBE haber datos remotos
    if (inspectionId && !remote) {
      console.log('[PDF] Esperando datos de inspección ID:', inspectionId);
      return;
    }

    let cancelled = false;
    const timeoutMs = 8000; // tiempo máximo de espera por imágenes

    const waitForImagesReady = (): Promise<void> => {
      const imgs = Array.from(document.querySelectorAll('img'));
      if (imgs.length === 0) return Promise.resolve();

      const allReady = imgs.every((img) => img.complete && img.naturalWidth > 0);
      if (allReady) return Promise.resolve();

      return new Promise<void>((resolve) => {
        let done = false;
        const cleanup: Array<() => void> = [];
        const tryResolve = () => {
          if (done) return;
          const ok = imgs.every((img) => img.complete && img.naturalWidth > 0);
          if (ok) {
            done = true;
            cleanup.forEach((fn) => fn());
            resolve();
          }
        };
        imgs.forEach((img) => {
          const onLoad = () => tryResolve();
          const onError = () => tryResolve(); // si falla, continuar para no bloquear
          img.addEventListener('load', onLoad);
          img.addEventListener('error', onError);
          cleanup.push(() => {
            img.removeEventListener('load', onLoad);
            img.removeEventListener('error', onError);
          });
        });
        // Chequeo periódico por si algunos eventos no disparan
        const interval = setInterval(tryResolve, 200);
        cleanup.push(() => clearInterval(interval));
        // Fallback por timeout
        const t = setTimeout(() => {
          if (done) return;
          done = true;
          cleanup.forEach((fn) => fn());
          resolve();
        }, timeoutMs);
        cleanup.push(() => clearTimeout(t));
      });
    };

    const run = async () => {
      try {
        await waitForImagesReady();
        if (cancelled) return;
        // Pequeño respiro para layout final antes de imprimir
        setTimeout(() => {
          try {
            console.log('[PDF] Imprimiendo con recursos listos');
            window.print();
          } catch (e) {
            console.error('[PDF] Error al imprimir:', e);
            window.print(); // fallback
          }
        }, 100);
      } catch (e) {
        console.error('[PDF] Error esperando imágenes:', e);
        window.print();
      }
    };

    run();
    return () => { cancelled = true; };
  }, [searchParams, inspectionId, remote]);

  const data = useMemo(() => {
    const LONG_NOTE = 'Para hacer la revisión inicial 360 de los vehículos motorizados el operador asignado a la operación de su equipo tiene la responsabilidad y obligación de verificar lo siguiente antes de operar la unidad siguiendo los puntos que se encuentran en los stickers de color amarillo en cada equipo, de encontrar alguna falla o algún problema en el equipo deberá ser reportado inmediatamente a su supervisor y al equipo de mantenimiento.';
    const deriveObservationsFromEquipmentLocal = (
      equipmentList: any[] | undefined,
      existing: any[] = []
    ) => {
      if (!equipmentList || equipmentList.length === 0) return [] as any[];
      const existingKeys = new Set((existing || []).map((o) => `${o.equipment_code}::${o.obs_id}`));
      const derived: any[] = [];
      equipmentList.forEach((eq) => {
        const entries = Object.entries(eq.checklist_data || {});
        entries.forEach(([code, item]: any, index) => {
          const isNC = item?.status === 'no_conforme'; if (isNC) {
            const key = `${eq.code}::${code}`;
            if (!existingKeys.has(key)) {
              derived.push({
                inspection_id: eq.inspection_id,
                obs_id: code,
                equipment_code: eq.code,
                obs_operator: '',
                obs_maintenance: null,
                order_index: index,
              });
            }
          }
        });
      });
      return derived;
    };
    const getHour = (val: any): string => {
      if (!val) return '';
      try {
        const d = typeof val === 'string' ? new Date(val) : new Date(val);
        if (isNaN(d.getTime())) return '';
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mi}`;
      } catch {
        return '';
      }
    };
    // Si viene id, usar datos remotos (inspección persistida)
    if (remote) {
      const equipment = (remote.equipment || []).map((eq: any) => ({
        code: eq.code,
        // Hora por equipo: prioriza updated_at, luego created_at, y finalmente la fecha global
        hour: getHour((eq as any)?.updated_at || (eq as any)?.created_at || remote.inspection_date),
        hour: getHour((eq as any)?.updated_at || (eq as any)?.created_at || remote.inspection_date),
        checklist_data: (Object.fromEntries(
          Array.from({ length: 14 }, (_, i) => {
            const code = `CHK-${String(i + 1).padStart(2, '0')}`;
            let status = eq.checklist_data?.[code]?.status;

            // Force N/A if not applicable based on rules
            const equipmentSignal = `${eq.code} ${eq.type || ''}`;
            if (!isChecklistItemApplicable(code, equipmentSignal)) {
              status = 'no_aplica';
            }

            return [code, { status }];
          })
        )) as Record<string, { status?: 'conforme' | 'no_conforme' | 'no_aplica' }>,
        inspector_signature_url: eq.inspector_signature_url ?? undefined,
      }));

      const observationsExplicit = (remote.observations || []).map((obs: any) => ({
        obs_id: obs.obs_id,
        equipment_code: obs.equipment_code,
        obs_operator: obs.obs_operator,
        obs_maintenance: obs.obs_maintenance ?? '',
      }));
      const observationsDerived = observationsExplicit.length > 0
        ? observationsExplicit
        : deriveObservationsFromEquipmentLocal(remote.equipment as any[] | undefined);

      return {
        logo_url: (remote as any)?.logo_url ?? defaultLogo,
        form_code: remote.form_code ?? 'FOR-ATA-057',
        form_version: '3',
        form_issue_date: '17/09/2025',
        inspection_date: remote.inspection_date,
        inspector_name: remote.inspector_name,
        legend_text: LONG_NOTE,
        note_text: '',
        equipment,
        observations: observationsDerived,
        supervisor_name: remote.supervisor_name ?? '',
        supervisor_signature_url: remote.supervisor_signature_url ?? '',
        supervisor_signature_date: remote.supervisor_signature_date,
        mechanic_name: remote.mechanic_name ?? '',
        mechanic_signature_url: remote.mechanic_signature_url ?? '',
        mechanic_signature_date: remote.mechanic_signature_date,
        footer_text: FOR_ATA_057_FOOTER_NOTE,
      };
    }

    // Mapear datos del contexto si no hay id
    const inspection_date = formData.general?.inspection_date ?? '';
    const inspector_name = formData.general?.inspector_name ?? '';

    const hour = getHour(formData.general?.inspection_date);
    const equipment = (formData.equipment || []).map((eq) => ({
      code: eq.code,
      hour,
      checklist_data: (Object.fromEntries(
        Array.from({ length: 14 }, (_, i) => {
          const code = `CHK-${String(i + 1).padStart(2, '0')}`;
          let status = formData.checklists?.[eq.code]?.[code]?.status;

          // Force N/A if not applicable based on rules
          const equipmentSignal = `${eq.code} ${eq.type || ''}`;
          if (!isChecklistItemApplicable(code, equipmentSignal)) {
            status = 'no_aplica';
          }

          return [code, { status }];
        })
      )) as Record<string, { status?: 'conforme' | 'no_conforme' | 'no_aplica' }>,
      inspector_signature_url: formData.equipmentSignatures?.[eq.code] ?? undefined,
    }));

    const observationsExplicit = (formData.observations || []).map((obs) => ({
      obs_id: obs.obs_id,
      equipment_code: obs.equipment_code,
      obs_operator: obs.obs_operator,
      obs_maintenance: obs.obs_maintenance ?? '',
    }));

    // Derivar observaciones del checklist si no hay explícitas
    const equipmentForDerive = (formData.equipment || []).map((eq) => ({
      code: eq.code,
      checklist_data: formData.checklists?.[eq.code] || {},
    }));
    const observationsDerived = observationsExplicit.length > 0
      ? observationsExplicit
      : deriveObservationsFromEquipmentLocal(equipmentForDerive);

    return {
      logo_url: defaultLogo,
      form_code: 'FOR-ATA-057',
      form_version: '3',
      form_issue_date: '17/09/2025',
      inspection_date,
      inspector_name,
      legend_text: LONG_NOTE,
      note_text: '',
      equipment,
      observations: observationsDerived,
      supervisor_name: formData.signatures?.supervisor_name ?? '',
      supervisor_signature_url: formData.signatures?.supervisor_signature ?? '',
      supervisor_signature_date: formData.signatures?.supervisor_signature ? new Date() : undefined,
      mechanic_name: formData.signatures?.mechanic_name ?? '',
      mechanic_signature_url: formData.signatures?.mechanic_signature ?? '',
      mechanic_signature_date: formData.signatures?.mechanic_signature ? new Date() : undefined,
      footer_text: FOR_ATA_057_FOOTER_NOTE,
    };
  }, [formData, remote]);

  // ✅ OPTIMIZADO: Mostrar loader mientras carga datos
  const isLoading = inspectionId && !remote;
  const shouldPrint = searchParams.get('print') === 'true';

  if (isLoading && shouldPrint) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 20, animation: 'spin 1s linear infinite' }}>⏳</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Cargando datos de la inspección...</h2>
        <p style={{ margin: '10px 0 0', fontSize: 14, color: '#666' }}>Por favor espera mientras preparamos el documento PDF</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: isPdfMode ? 0 : 16 }}>
      {!isPdfMode && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Vista FOR-ATA-057</h2>
          <button
            onClick={async () => {
              try {
                const params = new URLSearchParams(window.location.search);
                const id = params.get('id');
                if (!id) {
                  alert('Error: No se encontró el ID de la inspección en la URL.');
                  return;
                }

                // Obtener token de sesión para Authorization: Bearer <token>
                const { data: { session } } = await supabase.auth.getSession();
                const headers: Record<string, string> = {};
                if (session?.access_token) {
                  headers['Authorization'] = `Bearer ${session.access_token}`;
                }

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 45000);
                const res = await fetch(`/api/inspections/${encodeURIComponent(id)}/pdf`, {
                  method: 'GET',
                  headers,
                  credentials: 'include',
                  signal: controller.signal,
                });
                clearTimeout(timeout);

                if (!res.ok) {
                  const errText = await res.text().catch(() => 'Unknown error');
                  console.error('Error backend PDF:', res.status, errText);
                  alert(`Error generando PDF (Status ${res.status}):\n${errText}`);
                  return;
                }

                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `FOR-ATA-057-${id}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              } catch (error: any) {
                console.error('Error generando/descargando PDF:', error);
                alert(`Error inesperado al descargar PDF:\n${error.message || error}`);
              }
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid #C1C7D0',
              background: '#1f2937',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Descargar PDF
          </button>
        </div>
      )}
      <FORATA057Template
        data={data}
        headerMode={'text'}
        compact={isPdfMode}
        padRows={!isPdfMode}
      />
    </div>
  );
}

export default function Page() {
  return (
    <InspectionProvider>
      <Suspense fallback={<div />}>\n      <TemplateWithData />\n      </Suspense>
    </InspectionProvider>
  );
}