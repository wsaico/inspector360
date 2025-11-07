"use client";
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import FORATA057Template from '../../../components/pages/forata057-template';
import { FOR_ATA_057_FOOTER_NOTE } from '@/lib/constants';
import { InspectionProvider, useInspectionForm } from '@/context/inspection-context';
import { useSearchParams } from 'next/navigation';
import { InspectionService } from '@/lib/services';
import { supabase } from '@/lib/supabase/client';

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
    } catch {}
    return () => {
      try { delete (window as any).__forata057_ready; } catch {}
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
    } catch {}
  }, [inspectionId, remote]);

  // ✅ OPTIMIZADO: Auto print SOLO cuando los datos están 100% listos
  useEffect(() => {
    const shouldPrint = searchParams.get('print') === 'true';
    if (!shouldPrint) return;

    // Si hay inspectionId, DEBE haber datos remotos
    if (inspectionId && !remote) {
      console.log('[PDF] Esperando datos de inspección ID:', inspectionId);
      return;
    }

    console.log('[PDF] Datos listos, iniciando impresión en 1000ms...');

    // Delay aumentado para asegurar que TODO el DOM esté renderizado
    const t = setTimeout(() => {
      try {
        console.log('[PDF] Activando window.print()');
        window.print();
      } catch (e) {
        console.error('[PDF] Error al imprimir:', e);
      }
    }, 1000); // Aumentado a 1 segundo para garantizar render completo

    return () => clearTimeout(t);
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
      if (typeof val === 'string') {
        const m = val.match(/T(\d{2}):(\d{2})/);
        if (m) return `${m[1]}:${m[2]}`;
        return '';
      }
      try {
        const d = new Date(val);
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
        checklist_data: (Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => {
            const code = `CHK-${String(i + 1).padStart(2, '0')}`;
            const status = eq.checklist_data?.[code]?.status;
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
        Array.from({ length: 12 }, (_, i) => {
          const code = `CHK-${String(i + 1).padStart(2, '0')}`;
          const status = formData.checklists?.[eq.code]?.[code]?.status;
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
                  window.print();
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
                  // Fallback: si el backend no responde, usar impresión del navegador
                  console.error('Error descargando PDF desde backend:', res.status, await res.text().catch(() => ''));
                  window.print();
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
              } catch (error) {
                console.error('Error generando/descargando PDF:', error);
                // Fallback de último recurso
                window.print();
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