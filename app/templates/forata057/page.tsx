"use client";
import React, { useEffect, useMemo, useState } from 'react';
import FORATA057Template from '../../../components/pages/forata057-template';
import { FOR_ATA_057_FOOTER_NOTE } from '@/lib/constants';
import { InspectionProvider, useInspectionForm } from '@/context/inspection-context';
import { useSearchParams } from 'next/navigation';
import { InspectionService } from '@/lib/services';

function TemplateWithData() {
  const { formData } = useInspectionForm();
  const searchParams = useSearchParams();
  const inspectionId = searchParams.get('id');
  const [remote, setRemote] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!inspectionId) return;
      const { data } = await InspectionService.getInspectionById(inspectionId);
      if (data) setRemote(data);
    };
    load();
  }, [inspectionId]);

  // Auto print si viene ?print=true y los datos están listos
  useEffect(() => {
    const shouldPrint = searchParams.get('print') === 'true';
    if (!shouldPrint) return;
    // Esperar que lleguen datos remotos si hay id
    if (inspectionId && !remote) return;
    // Pequeño delay para asegurar render antes de imprimir
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {}
    }, 300);
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
          const txt = (item?.observations || '').trim();
          const hasText = txt.length > 0;
          const isNC = item?.status === 'no_conforme';
          if (isNC || hasText) {
            const key = `${eq.code}::${code}`;
            if (!existingKeys.has(key)) {
              derived.push({
                inspection_id: eq.inspection_id,
                obs_id: code,
                equipment_code: eq.code,
                obs_operator: hasText ? txt : (isNC ? 'Item no conforme' : ''),
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
      const hour = getHour(remote.inspection_date);
      const equipment = (remote.equipment || []).map((eq: any) => ({
        code: eq.code,
        hour,
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

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Vista FOR-ATA-057</h2>
        <button
          onClick={() => window.print()}
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
      <FORATA057Template data={data} headerMode="text" />
    </div>
  );
}

export default function Page() {
  return (
    <InspectionProvider>
      <TemplateWithData />
    </InspectionProvider>
  );
}