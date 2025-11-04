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

const CHK_CODES = Array.from({ length: 12 }, (_, i) => `CHK-${String(i + 1).padStart(2, '0')}`);

function statusToMark(s?: 'conforme' | 'no_conforme' | 'no_aplica' | string): string {
  if (s === 'conforme') return '✓';
  if (s === 'no_conforme') return 'X';
  if (s === 'no_aplica') return 'N/A';
  return '';
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
        {idx < lines.length - 1 ? <br/> : null}
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

const FORATA057Template: React.FC<{ data?: Inspection; headerMode?: 'codes' | 'text' }> = ({ data = sampleData, headerMode = 'text' }) => {
  // Encabezados de checklist: modo 'text' (descripción exacta) o 'codes' (CHK-01..12)
  const checkHeaders = headerMode === 'codes'
    ? CHK_CODES
    : [
        'Extintor vigente: verificar presencia, fecha de vencimiento y de ultima inspección. El manómetro en zona verde.',
        'Pin de seguridad: comprobar que esté colocado correctamente y sin deformaciones.',
        'Calzas: deben estar disponibles, sin fisuras ni desgaste excesivo.',
        'Placards, stickers y micas: deben estar legibles, adheridos y sin daños.',
        'Nivel de combustible: debe ser suficiente para la operación prevista.',
        'Asiento y cinturón de seguridad: revisar estado, anclaje y funcionamiento.',
        'Circulina operativa: encender y comprobar visibilidad (Aplica a todos los equipos). Alarma de retroceso operativo (Aplica a FT-PM-TR)',
        'Luces operativas: verificar luces delanteras, traseras y de freno.',
        'Cintas reflectivas: deben estar adheridas y visibles.',
        'Pintura: sin deterioro que afecte señalización o visibilidad del equipo.',
        'Neumáticos sin desgaste: revisar la ausencia de grietas o desgaste de las llantas.',
        'Frenos operativos (Freno de pedal y parqueo o mano): probar funcionamiento antes de iniciar el desplazamiento.'
      ];

  // Asegurar mínimo 17 filas de equipos
  const equipmentRows = [...(data.equipment || [])];
  while (equipmentRows.length < 17) {
    equipmentRows.push({ code: 'TLM-XX-XXX' });
  }

  // Asegurar mínimo 7 filas de observaciones
  const observationRows = [...(data.observations || [])];
  while (observationRows.length < 7) {
    observationRows.push({ obs_id: 'TLM-' });
  }

  return (
    <div className="w-full bg-white p-4" style={{ fontFamily: 'Calibri, Arial, sans-serif', fontSize: '11pt' }}>
      <style>{`
        @media print {
          @page { margin: 0.25in; }
          body { margin: 0; }
        }
        .forata-table { border-collapse: collapse; width: 100%; }
        .forata-table td, .forata-table th { border: 1px solid #000; padding: 4px; }
        .forata-table .no-border { border: none; }
        .forata-table .border-bottom { border-bottom: 1px solid #000; }
        .forata-table .border-top { border-top: 1px solid #000; }
      `}</style>

      <table className="forata-table">
        <tbody>
          {/* Header Row 1 */}
          <tr style={{ height: '66px' }}>
            <td rowSpan={3} colSpan={2} className="text-center" style={{ width: '140px' }}>
              {data.logo_url ? (
                <img src={data.logo_url} alt="Logo" style={{ maxWidth: '130px', maxHeight: '56px' }} />
              ) : (
                <div className="text-gray-400 text-xs">LOGO</div>
              )}
            </td>
            <td rowSpan={3} colSpan={10} className="text-center font-bold" style={{ fontSize: '16pt' }}>
              CONTROL DE INSPECCIÓN DE REVISIÓN 360° DE EQUIPOS GSE MOTORIZADOS- ESTACIONES
            </td>
            <td colSpan={2} className="text-center font-bold bg-gray-200" style={{ fontSize: '11pt' }}>Código:</td>
            <td className="text-center">{data.form_code || 'FOR-ATA-057'}</td>
          </tr>

          {/* Header Row 2 */}
          <tr style={{ height: '22px' }}>
            <td colSpan={2} className="text-center font-bold bg-gray-200">Versión:</td>
            <td className="text-center">{data.form_version || '3'}</td>
          </tr>

          {/* Header Row 3 */}
          <tr style={{ height: '22px' }}>
            <td colSpan={2} className="text-center font-bold bg-gray-200">Fecha de emisión:</td>
            <td className="text-center">{data.form_issue_date || '17/09/2025'}</td>
          </tr>

          {/* Date and Operator Row */}
          <tr style={{ height: '30px' }}>
            <td colSpan={2} className="text-right font-bold" style={{ fontSize: '14pt' }}>Fecha:</td>
            <td colSpan={2} className="text-center font-bold" style={{ fontSize: '14pt' }}>
              {formatDate(data.inspection_date)}
            </td>
            <td colSpan={3} className="text-center font-bold" style={{ fontSize: '14pt' }}>
              Operador a cargo de la inspección:
            </td>
            <td colSpan={3} className="text-center font-bold" style={{ fontSize: '14pt' }}>
              {data.inspector_name || ''}
            </td>
            <td className="no-border"></td>
            <td rowSpan={2} colSpan={4} className="text-left" style={{ fontSize: '12pt', verticalAlign: 'top', padding: '8px' }}>
              <strong>✓</strong> (Check) si el ítem cumple o está conforme.<br/>
              <strong>X</strong> si el ítem no cumple o presenta una observación.<br/>
              <strong>N/A</strong> si el ítem no aplica para el equipo o actividad inspeccionada.
            </td>
          </tr>

          {/* Separator Row */}
          <tr style={{ height: '12px' }}>
            <td colSpan={11} className="border-bottom no-border" style={{ borderTop: 'none' }}></td>
          </tr>

          

          {/* Checklist Headers */}
          <tr style={{ height: '126px', backgroundColor: '#002060', color: 'white' }}>
            <td className="text-center font-bold" style={{ fontSize: '11pt', width: '80px' }}>CÓDIGO</td>
            <td className="text-center font-bold" style={{ fontSize: '11pt', width: '55px' }}>HORA</td>
            {checkHeaders.map((header, idx) => (
              <td
                key={idx}
                className="text-center font-bold"
                style={{
                  fontSize: headerMode === 'text' ? (idx === 6 ? '11pt' : '12pt') : '12pt',
                  width: '90px',
                  verticalAlign: 'middle'
                }}
              >
                {header}
              </td>
            ))}
            <td className="text-center font-bold" style={{ fontSize: '11pt', width: '90px' }}>FIRMA</td>
          </tr>

          {/* Equipment Rows */}
          {equipmentRows.map((eq, idx) => (
            <tr key={idx} style={{ height: '21px' }}>
              <td className="text-center">{eq.code || 'TLM-XX-XXX'}</td>
              <td className="text-center">{eq.hour || ''}</td>
              {CHK_CODES.map((code) => (
                <td key={code} className="text-center">
                  {statusToMark(eq.checklist_data?.[code]?.status)}
                </td>
              ))}
              <td className="text-center">
                {eq.inspector_signature_url && (
                  <img src={eq.inspector_signature_url} alt="Firma" style={{ maxHeight: '18px' }} />
                )}
              </td>
            </tr>
          ))}

          {/* Legend Row */}
          <tr>
            <td colSpan={15} className="text-center" style={{ height: '48px', fontSize: '13pt', padding: '8px' }}>
              {data.legend_text}
            </td>
          </tr>

          {/* Observations Header */}
          <tr style={{ height: '25px', backgroundColor: '#E7E6E6' }}>
            <td className="text-center font-bold" style={{ fontSize: '14pt' }}>CÓDIGO</td>
            <td colSpan={7} className="text-center font-bold" style={{ fontSize: '14pt' }}>OBSERVACIONES OPERADOR</td>
            <td colSpan={7} className="text-center font-bold" style={{ fontSize: '14pt' }}>OBSERVACIONES MANTENIMIENTO</td>
          </tr>

          {/* Observation Rows */}
          {observationRows.map((obs, idx) => (
            <tr key={idx} style={{ height: '28px' }}>
              <td className="text-left" style={{ paddingLeft: '4px' }}>{obs.equipment_code || obs.obs_id || 'TLM-'}</td>
              <td colSpan={7} className="text-center">{obs.obs_operator || ''}</td>
              <td colSpan={7} className="text-center">{obs.obs_maintenance || ''}</td>
            </tr>
          ))}

          {/* Signature Images and Details Row (above line and text) */}
          <tr style={{ height: '60px' }}>
            <td colSpan={2} className="no-border"></td>
            <td colSpan={3} className="text-center" style={{ verticalAlign: 'top' }}>
              {data.supervisor_signature_url && (
                <img src={data.supervisor_signature_url} alt="Firma Supervisor" style={{ maxHeight: '40px', marginBottom: '4px' }} />
              )}
              <div className="text-sm">{data.supervisor_name || ''}</div>
              <div className="text-xs">{formatDateTime(data.supervisor_signature_date)}</div>
            </td>
            <td colSpan={5} className="no-border"></td>
            <td colSpan={3} className="text-center" style={{ verticalAlign: 'top' }}>
              {data.mechanic_signature_url && (
                <img src={data.mechanic_signature_url} alt="Firma Mecánico" style={{ maxHeight: '40px', marginBottom: '4px' }} />
              )}
              <div className="text-sm">{data.mechanic_name || ''}</div>
              <div className="text-xs">{formatDateTime(data.mechanic_signature_date)}</div>
            </td>
            <td colSpan={2} className="no-border"></td>
          </tr>

          {/* Signature Label Row (with line below images) */}
          <tr style={{ height: '50px' }}>
            <td colSpan={2} className="no-border"></td>
            <td colSpan={3} className="text-center font-bold border-top" style={{ verticalAlign: 'bottom', paddingTop: '20px' }}>
              FIRMA<br/>SUPERVISOR O ENCARGADO DE ESTACIÓN
            </td>
            <td colSpan={5} className="no-border"></td>
            <td colSpan={3} className="text-center font-bold border-top" style={{ verticalAlign: 'bottom', paddingTop: '20px' }}>
              FIRMA<br/>MECÁNICO DE ESTACIÓN
            </td>
            <td colSpan={2} className="no-border"></td>
          </tr>


          {/* Footer / Note Row (letra muy pequeña, soporta **negrita**) */}
          <tr>
            <td colSpan={15} className="text-left border-top" style={{ fontSize: '8pt', padding: '8px' }}>
              {data.footer_text
                ? renderBoldWithBreaks(data.footer_text)
                : (
                  <>
                    <strong>NOTA:</strong><br/>
                    <strong>Para registros fisicos:</strong> No debe borrarse, bajo ninguna circunstancia, la información registrada originalmente en un registro; las correcciones o anulación de una parte de la información plasmada en los registros físicos, deben realizarse trazando una línea diagonal sobre la información a corregir o anular, garantizando que ésta quede legible, para luego consignar la nueva información al margen de la información original. La justificación de la corrección o anulación efectuada debe realizarse en la parte posterior del registro indicando la fecha, nombre y/o firma de quien lo ejecutó para que quede constancia.<br/><br/>
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
