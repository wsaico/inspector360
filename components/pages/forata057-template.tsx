import React from 'react';

// Tipo de datos basado en la estructura del mapper
interface Inspection {
  form_title?: string;
  logo_url?: string;
  form_code?: string;
  form_version?: string;
  form_issue_date?: string;
  inspection_date?: string | Date;
  inspector_name?: string;
  legend_text?: string;
  note_text?: string;
  equipment?: Equipment[];
  observations?: Observation[];
  supervisor_name?: string;
  supervisor_signature_date?: string | Date;
  supervisor_signature_url?: string;
  mechanic_name?: string;
  mechanic_signature_date?: string | Date;
  mechanic_signature_url?: string;
  footer_text?: string;
}

interface Equipment {
  code?: string;
  hour?: string;
  checklist_data?: Record<string, { status?: 'conforme' | 'no_conforme' | 'no_aplica' }>;
  inspector_signature_url?: string;
}

interface Observation {
  obs_id?: string;
  equipment_code?: string;
  obs_operator?: string;
  obs_maintenance?: string;
}

const CHK_CODES = Array.from({ length: 14 }, (_, i) => `CHK-${String(i + 1).padStart(2, '0')}`);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function statusToMark(s?: 'conforme' | 'no_conforme' | 'no_aplica' | string): React.ReactNode {
  if (!s) return '';
  const lower = s.toLowerCase().trim();
  if (lower === 'conforme') return <CheckIcon />;
  if (lower === 'no_conforme') return 'X';
  if (lower === 'no_aplica') return 'N/A';
  // 🚨 VISUAL DEBUG: If it's none of the above, print it (it might be "CHK-01 Missing" or similar)
  return s.length < 10 ? s : s.substring(0, 10);
}

function formatDate(input?: string | Date): string {
  if (!input) return '';
  if (typeof input === 'string') {
    // Si viene como 'YYYY-MM-DD' o ISO, evitar cambio de día por zona horaria
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    if (m) {
      const dd = m[3];
      const mm = m[2];
      const yyyy = m[1];
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  const d = input instanceof Date ? input : new Date(input);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateTime(input?: string | Date): string {
  if (!input) return '';
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      const date = `${m[3]}/${m[2]}/${m[1]}`;
      const time = `${m[4]}:${m[5]}`;
      return `${date} ${time}`;
    }
  }
  const d = input instanceof Date ? input : new Date(input);
  const date = formatDate(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${date} ${hh}:${mi}`;
}

// Renderizador simple: convierte **texto** en <strong>texto> y respeta saltos de línea
function renderBoldWithBreaks(input?: string): React.ReactNode {
  if (!input) return null;
  const lines = input.split('\n');
  return lines.map((line, idx) => {
    const segments = line.split(/(\*\*[^*]+\*\*)/);
    const nodes = segments.map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        const inner = seg.slice(2, -2);
        return <strong key={`s${idx}-${i}`}>{inner}</strong>;
      }
      // Quitar asteriscos simples usados como marcadores (p.ej. *texto*)
      const cleaned = seg.replace(/\*([^*]+)\*/g, '$1');
      return <React.Fragment key={`t${idx}-${i}`}>{cleaned}</React.Fragment>;
    });
    return (
      <React.Fragment key={`l${idx}`}>
        {nodes}
        {idx < lines.length - 1 ? <br /> : null}
      </React.Fragment>
    );
  });
}

// Datos de ejemplo
const sampleData: Inspection = {
  form_code: 'FOR-ATA-057',
  form_version: '3',
  form_issue_date: '17/09/2025',
  inspection_date: new Date('2025-11-04'),
  inspector_name: 'Juan Pérez',
  legend_text: 'Para hacer la revisión inicial 360 de los vehículos motorizados el operador asignado a la operación de su equipo tiene la responsabilidad y obligación de verificar lo siguiente antes de operar la unidad siguiendo los puntos que se encuentran en los stickers de color amarillo en cada equipo, de encontrar alguna falla o algún problema en el equipo deberá ser reportado inmediatamente a su supervisor y al equipo de mantenimiento.',
  note_text: 'Para registros fisicos: No debe borrarse, bajo ninguna circunstancia, la información registrada originalmente en un registro; las correcciones o anulación de una parte de la información plasmada en los registros físicos, deben realizarse trazando una línea diagonal sobre la información a corregir o anular, garantizando que ésta quede legible, para luego consignar la nueva información al margen de la información original. La justificación de la corrección o anulación efectuada debe realizarse en la parte posterior del registro indicando la fecha, nombre y/o firma de quien lo ejecutó para que quede constancia.\n\nPara registros electrónicos: Colocar un comentario sobre la información modificada. La justificación de la corrección o anulación efectuada debe realizarse en el comentario añadido indicando la fecha, nombre y/o firma de quien lo ejecutó para que quede constancia.',
  equipment: [
    {
      code: 'TLM-AR-002',
      hour: '12:00',
      checklist_data: {
        'CHK-01': { status: 'conforme' },
        'CHK-02': { status: 'no_conforme' },
        'CHK-03': { status: 'conforme' },
        'CHK-04': { status: 'conforme' },
        'CHK-05': { status: 'conforme' },
        'CHK-06': { status: 'conforme' },
        'CHK-07': { status: 'conforme' },
        'CHK-08': { status: 'conforme' },
        'CHK-09': { status: 'conforme' },
        'CHK-10': { status: 'conforme' },
        'CHK-11': { status: 'conforme' },
        'CHK-12': { status: 'conforme' },
      }
    },
    {
      code: 'TLM-AR-003',
      hour: '13:00',
      checklist_data: {
        'CHK-01': { status: 'conforme' },
        'CHK-02': { status: 'conforme' },
        'CHK-03': { status: 'conforme' },
        'CHK-04': { status: 'conforme' },
        'CHK-05': { status: 'conforme' },
        'CHK-06': { status: 'conforme' },
        'CHK-07': { status: 'conforme' },
        'CHK-08': { status: 'conforme' },
        'CHK-09': { status: 'conforme' },
        'CHK-10': { status: 'conforme' },
        'CHK-11': { status: 'conforme' },
        'CHK-12': { status: 'conforme' },
      }
    }
  ],
  observations: [
    {
      obs_id: 'TLM-AR-002',
      obs_operator: 'ESTA GOTEANDO ACEITE DE MOTOR',
      obs_maintenance: 'SE REVISO Y SE SOLUCIONO'
    }
  ],
  supervisor_name: 'Carlos Rodríguez',
  supervisor_signature_date: new Date('2025-11-04T15:30:00'),
  mechanic_name: 'Wilber Saico',
  mechanic_signature_date: new Date('2025-11-04T16:00:00'),
};

const FORATA057Template: React.FC<{
  data?: Inspection;
  headerMode?: 'codes' | 'text';
  compact?: boolean;
  padRows?: boolean;
}> = ({ data = sampleData, headerMode = 'text', compact = false, padRows = true }) => {
  // Encabezados de checklist: modo 'text' (descripción exacta) o 'codes' (CHK-01..14)
  const checkHeaders = headerMode === 'codes'
    ? CHK_CODES
    : [
      'Extintor vigente: verificar presencia, fecha de vencimiento y de ultima inspección. El manómetro en zona verde.',
      'Pin de seguridad: comprobar que esté colocado correctamente y sin deformaciones.',
      'Calzas: deben estar disponibles, sin fisuras ni desgaste excesivo.',
      'Placards, stickers y micas: deben estar legibles, adheridos y sin daños.',
      'Nivel de combustible: debe ser suficiente para la operación prevista.',
      'Asiento y cinturón de seguridad: revisar estado, anclaje y funcionamiento.',
      'Circulina operativa: encender y comprobar visibilidad. (Aplica a todos los equipos). \nAlarma de retroceso operativo (Aplica a FT-PM-TR)',
      'Luces operativas: verificar luces delanteras, traseras y de freno.',
      'Cintas reflectivas: deben estar adheridas y visibles.',
      'Pintura: sin deterioro que afecte señalización o visibilidad del equipo.',
      'Neumáticos sin desgaste: revisar presión y ausencia de grietas o desgaste de las llantas.',
      'Frenos operativos (Freno de pedal y parqueo o mano): probar funcionamiento antes de iniciar el desplazamiento.',
      'Bumpers: sin rayones, desgaste que pueda causar daños al fuselaje del avión (Aplica a FT-EM)',
      'Sólo escaleras: estabilizadores operativos, peldaños y cintas antideslizantes en buen estado, luces operativas'
    ];

  // Filtrado de equipos sin datos cuando no se desea rellenar
  const hasEqData = (eq: Equipment) => {
    const hasStatus = !!eq.checklist_data && Object.values(eq.checklist_data).some((v) => !!v?.status);
    const hasSig = !!eq.inspector_signature_url;
    const hasHour = !!eq.hour;
    const hasCode = !!eq.code && eq.code.trim().length > 0;
    return hasCode && (hasStatus || hasSig || hasHour);
  };
  let equipmentRows = [...(data.equipment || [])];
  if (!padRows) {
    equipmentRows = equipmentRows.filter(hasEqData);
  } else {
    while (equipmentRows.length < 17) {
      equipmentRows.push({ code: 'TLM-XX-XXX' });
    }
  }

  // Observaciones: filtrar vacías si no se desea rellenar
  let observationRows = [...(data.observations || [])];
  if (!padRows) {
    observationRows = observationRows.filter((o) => (o.obs_operator && o.obs_operator.trim().length > 0) || (o.obs_maintenance && o.obs_maintenance.trim().length > 0));
  } else {
    while (observationRows.length < 7) {
      observationRows.push({ obs_id: 'TLM-' });
    }
  }

  const fs = (pt: number) => (compact ? `${Math.max(pt - 3, 7)}pt` : `${pt}pt`);
  const rowHeight = (px: number) => (compact ? `${Math.max(px - 10, 14)}px` : `${px}px`);
  return (
    <div className="w-full bg-white p-4 forata-root" style={{ fontFamily: 'Calibri, Arial, sans-serif', fontSize: compact ? '10pt' : '11pt' }}>
      <style>{`
        @media print {
           @page { size: A4 landscape; margin: ${compact ? '0.2in' : '0.25in'}; }
          html, body { margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .forata-root { width: 297mm; min-height: 210mm; }
          .forata-table, .forata-table td, .forata-table th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .forata-table { border-collapse: collapse; width: 100%; border: 1px solid #000; }
        .forata-table td, .forata-table th { border: 1px solid #000; padding: 4px; }
        .forata-table .no-border { border: none; }
        .forata-table .border-bottom { border-bottom: 1px solid #000; }
        .forata-table .border-top { border-top: 1px solid #000; }

        /* Header azul del checklist (pantalla y impresión) */
        .forata-checklist-header td,
        .forata-checklist-header th {
          background-color: #002060;
          color: #ffffff;
        }

        @media print {
          .forata-checklist-header td,
          .forata-checklist-header th,
          .forata-checklist-header {
            background-color: #002060 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Bordes uniformes de 1px en impresión */
          .forata-table, .forata-table td, .forata-table th {
            border-color: #000 !important;
            border-style: solid !important;
            border-width: 1px !important;
          }
          .forata-table { border-spacing: 0 !important; }
        }
      `}</style>

      <table className="forata-table">
        <tbody>
          {/* Header Row 1 (compactado) */}
          <tr style={{ height: rowHeight(48) }}>
            <td rowSpan={3} colSpan={2} className="text-center" style={{ width: '140px' }}>
              {data.logo_url ? (
                <img src={data.logo_url} alt="Logo" style={{ maxWidth: '130px', maxHeight: compact ? '44px' : '56px' }} />
              ) : (
                <div className="text-gray-400 text-xs">LOGO</div>
              )}
            </td>
            <td rowSpan={3} colSpan={12} className="text-center font-bold" style={{ fontSize: fs(14), lineHeight: 1.15 }}>
              CONTROL DE INSPECCIÓN DE REVISIÓN 360° DE EQUIPOS GSE MOTORIZADOS- ESTACIONES
            </td>
            <td colSpan={2} className="text-center font-bold bg-gray-200" style={{ fontSize: fs(11) }}>Código:</td>
            <td className="text-center">{data.form_code || 'FOR-ATA-057'}</td>
          </tr>

          {/* Header Row 2 */}
          <tr style={{ height: rowHeight(18) }}>
            <td colSpan={2} className="text-center font-bold bg-gray-200" style={{ fontSize: fs(11) }}>Versión:</td>
            <td className="text-center">{data.form_version || '3'}</td>
          </tr>

          {/* Header Row 3 */}
          <tr style={{ height: rowHeight(18) }}>
            <td colSpan={2} className="text-center font-bold bg-gray-200" style={{ fontSize: fs(11) }}>Fecha de emisión:</td>
            <td className="text-center">{data.form_issue_date || '17/09/2025'}</td>
          </tr>

          {/* Date and Operator Row (compactado) */}
          <tr style={{ height: rowHeight(24) }}>
            <td colSpan={2} className="text-right font-bold" style={{ fontSize: fs(12) }}>Fecha:</td>
            <td colSpan={2} className="text-center font-bold" style={{ fontSize: fs(12) }}>
              {formatDate(data.inspection_date)}
            </td>
            <td colSpan={3} className="text-center font-bold" style={{ fontSize: fs(12) }}>
              Operador a cargo de la inspección:
            </td>
            <td colSpan={3} className="text-center font-bold" style={{ fontSize: fs(12) }}>
              {data.inspector_name || ''}
            </td>
            <td className="no-border"></td>
            <td rowSpan={2} colSpan={6} className="text-left" style={{ fontSize: fs(9), verticalAlign: 'top', padding: compact ? '4px' : '8px', lineHeight: 1.2 }}>
              <strong><CheckIcon /></strong> (Check) si el ítem cumple o está conforme.<br />
              <strong>X</strong> si el ítem no cumple o presenta una observación.<br />
              <strong>N/A</strong> si el ítem no aplica para el equipo o actividad inspeccionada.
            </td>
          </tr>

          {/* Separator Row */}
          <tr style={{ height: rowHeight(8) }}>
            <td colSpan={11} className="border-bottom no-border" style={{ borderTop: 'none' }}></td>
          </tr>



          {/* Checklist Headers */}
          <tr className="forata-checklist-header" style={{ height: rowHeight(126) }}>
            <td className="text-center font-bold" style={{ fontSize: fs(11), width: '80px' }}>CÓDIGO</td>
            <td className="text-center font-bold" style={{ fontSize: fs(11), width: '55px' }}>HORA</td>
            {checkHeaders.map((header, idx) => (
              <td
                key={idx}
                className="text-center font-bold"
                style={{
                  fontSize: headerMode === 'text' ? (compact ? '8px' : (idx === 6 ? fs(11) : fs(12))) : fs(12),
                  width: '90px',
                  verticalAlign: 'middle',
                  whiteSpace: 'normal',
                  wordWrap: 'break-word',
                  lineHeight: compact ? 1.2 : 1.3
                }}
              >
                {header}
              </td>
            ))}
            <td className="text-center font-bold" style={{ fontSize: fs(11), width: '90px' }}>FIRMA</td>
          </tr>

          {/* Equipment Rows */}
          {equipmentRows.map((eq, idx) => (
            <tr key={idx} style={{ height: rowHeight(21) }}>
              <td className="text-center">{eq.code || 'TLM-XX-XXX'}</td>
              <td className="text-center">{eq.hour || ''}</td>
              {CHK_CODES.map((code) => (
                <td key={code} className="text-center">
                  {statusToMark(eq.checklist_data?.[code]?.status)}
                </td>
              ))}
              <td className="text-center">
                {eq.inspector_signature_url && (
                  <img
                    src={eq.inspector_signature_url}
                    alt="Firma"
                    style={{
                      height: compact ? '28px' : '34px',
                      maxWidth: '100%',
                      width: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto'
                    }}
                  />
                )}
              </td>
            </tr>
          ))}

          {/* Separación: dos líneas vacías antes del texto de leyenda poschecklist */}
          <tr>
            <td colSpan={17} className="no-border" style={{ border: 'none' }}>
              <div style={{ height: rowHeight(13) }}>&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td colSpan={17} className="no-border" style={{ border: 'none' }}>
              <div style={{ height: rowHeight(13) }}>&nbsp;</div>
            </td>
          </tr>

          {/* Legend Row */}
          <tr>
            <td colSpan={17} className="text-center" style={{ height: rowHeight(48), fontSize: fs(11), padding: '6px' }}>
              {data.legend_text}
            </td>
          </tr>

          {/* Observations Header */}
          <tr style={{ height: rowHeight(25), backgroundColor: '#E7E6E6' }}>
            <td className="text-center font-bold" style={{ fontSize: fs(12) }}>CÓDIGO</td>
            <td colSpan={8} className="text-center font-bold" style={{ fontSize: fs(12) }}>OBSERVACIONES OPERADOR</td>
            <td colSpan={8} className="text-center font-bold" style={{ fontSize: fs(12) }}>OBSERVACIONES MANTENIMIENTO</td>
          </tr>

          {/* Observation Rows */}
          {observationRows.map((obs, idx) => (
            <tr key={idx} style={{ height: rowHeight(28) }}>
              <td className="text-left" style={{ paddingLeft: '4px' }}>
                {obs.equipment_code && obs.obs_id ? `${obs.equipment_code} - ${obs.obs_id}` : (obs.equipment_code || obs.obs_id || 'TLM-')}
              </td>
              <td colSpan={8} className="text-center">{obs.obs_operator || ''}</td>
              <td colSpan={8} className="text-center">{obs.obs_maintenance || ''}</td>
            </tr>
          ))}

          {/* Signature Images Row (sin marcos, sin fecha/hora, sin nombres) */}
          <tr style={{ height: rowHeight(100) }}>
            <td colSpan={2} className="no-border"></td>
            <td colSpan={3} className="text-center no-border" style={{ verticalAlign: 'top' }}>
              {data.supervisor_signature_url && (
                <img
                  src={data.supervisor_signature_url}
                  alt="Firma Supervisor"
                  style={{
                    height: compact ? '80px' : '96px',
                    maxWidth: '100%',
                    width: 'auto',
                    marginBottom: '0px',
                    objectFit: 'contain',
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}
                />
              )}
            </td>
            <td colSpan={7} className="no-border"></td>
            <td colSpan={3} className="text-center no-border" style={{ verticalAlign: 'top' }}>
              {data.mechanic_signature_url && (
                <img
                  src={data.mechanic_signature_url}
                  alt="Firma Mecánico"
                  style={{
                    height: compact ? '80px' : '96px',
                    maxWidth: '100%',
                    width: 'auto',
                    marginBottom: '0px',
                    objectFit: 'contain',
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}
                />
              )}
            </td>
            <td colSpan={2} className="no-border"></td>
          </tr>

          {/* Signature Label Row (solo borde superior, con nombre encima del texto) */}
          <tr style={{ height: rowHeight(48) }}>
            <td colSpan={2} className="no-border"></td>
            <td colSpan={3} className="text-center font-bold no-border border-top" style={{ verticalAlign: 'bottom', paddingTop: compact ? '6px' : '8px', fontSize: fs(10) }}>
              <div style={{ fontSize: fs(10), marginBottom: '4px', fontWeight: 'normal' }}>{data.supervisor_name || ''}</div>
              FIRMA<br />SUPERVISOR O ENCARGADO DE ESTACIÓN
            </td>
            <td colSpan={7} className="no-border"></td>
            <td colSpan={3} className="text-center font-bold no-border border-top" style={{ verticalAlign: 'bottom', paddingTop: compact ? '6px' : '8px', fontSize: fs(10) }}>
              <div style={{ fontSize: fs(10), marginBottom: '4px', fontWeight: 'normal' }}>{data.mechanic_name || ''}</div>
              FIRMA<br />MECÁNICO DE ESTACIÓN
            </td>
            <td colSpan={2} className="no-border"></td>
          </tr>



          {/* (Sin espacio adicional aquí) */}

          {/* Footer / Note Row (letra muy pequeña, soporta **negrita**) */}
          <tr>
            <td colSpan={17} className="text-left border-top" style={{ fontSize: compact ? '7pt' : '8pt', padding: compact ? '6px' : '8px' }}>
              {data.footer_text
                ? renderBoldWithBreaks(data.footer_text)
                : (
                  <>
                    <strong>NOTA:</strong><br />
                    <strong>Para registros fisicos:</strong> No debe borrarse, bajo ninguna circunstancia, la información registrada originalmente en un registro; las correcciones o anulación de una parte de la información plasmada en los registros físicos, deben realizarse trazando una línea diagonal sobre la información a corregir o anular, garantizando que ésta quede legible, para luego consignar la nueva información al margen de la información original. La justificación de la corrección o anulación efectuada debe realizarse en la parte posterior del registro indicando la fecha, nombre y/o firma de quien lo ejecutó para que quede constancia.<br /><br />
                    <strong>Para registros electrónicos:</strong> Colocar un comentario sobre la información modificada. La justificación de la corrección o anulación efectuada debe realizarse en el comentario añadido indicando la fecha, nombre y/o firma de quien lo ejecutó para que quede constancia.
                  </>
                )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default FORATA057Template;