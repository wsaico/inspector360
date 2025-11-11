/**
 * Generador de PDF para Inspecciones
 * Formato: FOR-ATA-057
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Inspection, Equipment } from '@/types';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { CHECKLIST_TEMPLATE } from '@/lib/checklist-template';

// Colores corporativos
const COLORS = {
  primary: '#093071', // Azul corporativo
  secondary: '#8EBB37', // Verde corporativo
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  white: '#FFFFFF',
  black: '#000000',
};

export class PDFGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Genera el PDF completo de la inspección
   */
  async generateInspectionPDF(inspection: Inspection): Promise<Blob> {
    // Página principal horizontal: encabezado + matriz checklist + observaciones + firmas
    await this.addHeader(inspection);
    this.addTopMeta(inspection);
    this.addLegend();
    await this.addChecklistMatrix(inspection);
    this.addNoteParagraph();
    this.addObservationsTable(inspection);

    // Firmas al pie; si no hay espacio, nueva página
    const remainingSpace = this.pageHeight - this.currentY - 40;
    if (remainingSpace < 60) {
      this.doc.addPage();
      this.currentY = this.margin;
      await this.addHeader(inspection);
    }
    await this.addSignaturesSection(inspection);
    this.addFooter();

    return this.doc.output('blob');
  }

  /**
   * Agrega el encabezado de cada página
   */
  private async addHeader(inspection: Inspection) {
    // Banda superior con logo y caja de metadatos a la derecha
    const bandHeight = 22;
    this.doc.setFillColor(COLORS.white);
    this.doc.rect(0, 0, this.pageWidth, bandHeight, 'F');

    // Logo (si no existe, texto TALMA)
    const logoX = this.margin;
    const logoY = 4;
    const logoW = 35;
    const logoH = 14;
    try {
      const logoPath = '/assets/logo.png';
      const dataUrl = await this.loadImage(logoPath);
      this.doc.addImage(dataUrl, 'PNG', logoX, logoY, logoW, logoH);
    } catch {
      this.doc.setTextColor(COLORS.primary);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(18);
      this.doc.text('Talma', logoX, logoY + 12);
    }

    // Título centrado
    const title = 'CONTROL DE INSPECCIÓN DE REVISIÓN 360° DE EQUIPOS GSE MOTORIZADOS- ESTACIONES';
    this.doc.setTextColor(COLORS.black);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    const titleWidth = this.doc.getTextWidth(title);
    this.doc.text(title, (this.pageWidth - titleWidth) / 2, 9);

    // Caja derecha estática: Código, Versión, Fecha de emisión
    const boxW = 80;
    const boxH = bandHeight - 4;
    const boxX = this.pageWidth - this.margin - boxW;
    const boxY = 2;
    const labelW = 42; // ancho col de etiqueta
    const valueW = boxW - labelW;
    const rowH = 6;

    this.doc.setDrawColor(COLORS.gray);
    this.doc.rect(boxX, boxY, boxW, boxH);
    // Divisor vertical entre etiqueta/valor
    this.doc.line(boxX + labelW, boxY, boxX + labelW, boxY + boxH);
    // Filas
    this.doc.line(boxX, boxY + rowH, boxX + boxW, boxY + rowH);
    this.doc.line(boxX, boxY + rowH * 2, boxX + boxW, boxY + rowH * 2);

    // Etiquetas (izquierda)
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Código:', boxX + 3, boxY + 4.3);
    this.doc.text('Versión:', boxX + 3, boxY + rowH + 4.3);
    this.doc.text('Fecha de emisión:', boxX + 3, boxY + rowH * 2 + 4.3);

    // Valores (derecha) estáticos
    this.doc.setFont('helvetica', 'normal');
    const valX = boxX + labelW + 3;
    this.doc.text('FOR-ATA-057', valX, boxY + 4.3);
    this.doc.text('3', valX, boxY + rowH + 4.3);
    this.doc.text('17/09/2025', valX, boxY + rowH * 2 + 4.3);

    this.currentY = bandHeight + 4;
  }

  // Meta superior: fecha y operador
  private addTopMeta(inspection: Inspection) {
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    const dateStr = this.formatDateLocal(inspection.inspection_date);
    this.doc.text(`Fecha: ${dateStr}`, this.margin, this.currentY);
    const opText = `Operador a cargo de la inspección: ${inspection.inspector_name}`;
    const opWidth = this.doc.getTextWidth(opText);
    this.doc.text(opText, this.pageWidth - this.margin - opWidth, this.currentY);
    this.currentY += 8;
  }

  // Leyenda ✓ / X / N/A como en el formato HTML
  private addLegend() {
    const legend = '✓ (Check) si el ítem cumple o está conforme.  X si el ítem no cumple o presenta una observación.  N/A si el ítem no aplica para el equipo o actividad inspeccionada.';
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(legend, this.margin, this.currentY);
    this.currentY += 6;
  }

  /**
   * Agrega la información general de la inspección
   */
  private addGeneralInfo(inspection: Inspection) {
    this.doc.setTextColor(COLORS.black);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INFORMACIÓN GENERAL', this.margin, this.currentY);
    this.currentY += 8;

    // Tabla de información general
    const generalData = [
      ['Estación', inspection.station],
      ['Fecha de Inspección', format(
        typeof inspection.inspection_date === 'string'
          ? new Date(inspection.inspection_date)
          : inspection.inspection_date,
        'dd/MM/yyyy',
        { locale: es }
      )],
      ['Tipo de Inspección', this.getInspectionTypeName(inspection.inspection_type)],
      ['Inspector', inspection.inspector_name],
    ];

    autoTable(this.doc, {
      startY: this.currentY,
      head: [],
      body: generalData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: COLORS.lightGray, cellWidth: 50 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Agrega la sección de equipo
   */
  private addEquipmentSection(equipment: Equipment, equipmentNumber: number) {
    this.doc.setFillColor(COLORS.secondary);
    this.doc.rect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 8, 'F');

    this.doc.setTextColor(COLORS.white);
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`EQUIPO ${equipmentNumber}: ${equipment.code}`, this.margin + 3, this.currentY + 5.5);
    this.currentY += 12;

    // Tabla de información del equipo
    const equipmentData: [string, string][] = [
      ['Tipo', equipment.type],
    ];

    if (equipment.brand) {
      equipmentData.push(['Marca', equipment.brand]);
    }
    if (equipment.model) {
      equipmentData.push(['Modelo', equipment.model]);
    }
    if (equipment.year) {
      equipmentData.push(['Año', equipment.year.toString()]);
    }
    if (equipment.serial_number) {
      equipmentData.push(['Serie', equipment.serial_number]);
    }
    if (equipment.motor_serial) {
      equipmentData.push(['Serie Motor', equipment.motor_serial]);
    }

    autoTable(this.doc, {
      startY: this.currentY,
      head: [],
      body: equipmentData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: COLORS.lightGray, cellWidth: 40 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
  }

  /**
   * Agrega la tabla del checklist
   */
  private addChecklistTable(equipment: Equipment) {
    this.doc.setTextColor(COLORS.black);
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('CHECKLIST DE INSPECCIÓN', this.margin, this.currentY);
    this.currentY += 6;

    // Preparar datos del checklist
    const checklistRows = CHECKLIST_TEMPLATE.map((item) => {
      const checkData = equipment.checklist_data?.[item.code];
      const status = checkData?.status || '-';
      const observations = checkData?.observations || '';

      // Símbolos para el estado
      let statusSymbol = '';
      if (status === 'conforme') statusSymbol = '✓';
      else if (status === 'no_conforme') statusSymbol = '✗';
      else if (status === 'no_aplica') statusSymbol = 'N/A';

      return [
        item.code,
        item.description,
        statusSymbol,
        observations,
      ];
    });

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Código', 'Descripción', 'Estado', 'Observaciones']],
      body: checklistRows,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 70 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
      didDrawPage: (data) => {
        // Si la tabla continúa en una nueva página, agregar header
        if (data.pageNumber > 1) {
          this.currentY = this.margin;
        }
      },
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  // Matriz de checklist (filas: equipos, columnas: ítems) en horizontal
  private async addChecklistMatrix(inspection: Inspection) {
    // Encabezados exactos del HTML (12 ítems)
    const headerItems = [
      'Extintor vigente: verificar presencia, fecha de vencimiento y de ultima inspección. El manómetro en zona verde.',
      'Pin de seguridad: comprobar que esté colocado correctamente y sin deformaciones.',
      'Calzas: deben estar disponibles, sin fisuras ni desgaste excesivo.',
      'Placards, stickers y micas: deben estar legibles, adheridos y sin daños.',
      'Nivel de combustible: debe ser suficiente para la operación prevista.',
      'Asiento y cinturón de seguridad: revisar estado, anclaje y funcionamiento.',
      'Circulina operativa: encender y comprobar visibilidad (Aplica a todos los equipos). \nAlarma de retroceso operativo (Aplica a FT-PM-TR)',
      'Luces operativas: verificar luces delanteras, traseras y de freno.',
      'Cintas reflectivas: deben estar adheridas y visibles.',
      'Pintura: sin deterioro que afecte señalización o visibilidad del equipo.',
      'Neumáticos sin desgaste: revisar la ausencia de grietas o desgaste de las llantas.',
      'Frenos operativos (Freno de pedal y parqueo o mano): probar funcionamiento antes de iniciar el desplazamiento.',
    ];

    const items = [...CHECKLIST_TEMPLATE]
      .sort((a, b) => a.order_index - b.order_index)
      .slice(0, 12);

    const head = ['CÓDIGO', 'HORA', ...headerItems, 'FIRMA'];
    const hourStr = this.formatTimeLocal(inspection.inspection_date);
    const rows = (inspection.equipment || []).map((eq) => {
      const checklist = eq.checklist_data || {};
      const values = items.map((i) => {
        const st = checklist[i.code]?.status || null;
        if (st === 'conforme') return '✓';
        if (st === 'no_conforme') return 'X';
        if (st === 'no_aplica') return 'N/A';
        return '';
      });
      return [eq.code || '-', hourStr, ...values, ''];
    });

    const usableW = this.pageWidth - this.margin * 2;
    const fixedLeft = 22 + 18;
    const fixedRight = 22;
    const remaining = usableW - fixedLeft - fixedRight;
    const perItem = remaining / items.length;

    const columnStyles: Record<number, any> = { 0: { cellWidth: 22 }, 1: { cellWidth: 18 } };
    for (let i = 2; i < 2 + items.length; i++) columnStyles[i] = { cellWidth: perItem };
    columnStyles[2 + items.length] = { cellWidth: 22 };

    // Pre-cargar todas las imágenes de firmas de inspector
    const signatureImages: { [key: number]: string } = {};
    for (let i = 0; i < (inspection.equipment || []).length; i++) {
      const eq = inspection.equipment![i];
      if (eq.inspector_signature_url) {
        try {
          signatureImages[i] = await this.loadImage(eq.inspector_signature_url);
        } catch (error) {
          console.error(`Error cargando firma del inspector para equipo ${eq.code}:`, error);
        }
      }
    }

    autoTable(this.doc, {
      startY: this.currentY,
      head: [head],
      body: rows,
      styles: { fontSize: 8, halign: 'center', valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: [9, 48, 113], textColor: 255, fontStyle: 'bold' },
      columnStyles,
      margin: { left: this.margin, right: this.margin },
      didDrawCell: (data: any) => {
        // Dibujar imagen de firma en la última columna (FIRMA)
        if (data.section === 'body' && data.column.index === head.length - 1) {
          const rowIndex = data.row.index;
          const img = signatureImages[rowIndex];
          if (img) {
            const cellX = data.cell.x;
            const cellY = data.cell.y;
            const cellW = data.cell.width;
            const cellH = data.cell.height;
            // Dibujar imagen centrada en la celda con padding
            const imgW = cellW - 4;
            const imgH = cellH - 2;
            const imgX = cellX + 2;
            const imgY = cellY + 1;
            try {
              this.doc.addImage(img, 'PNG', imgX, imgY, imgW, imgH);
            } catch (error) {
              console.error('Error al agregar firma a PDF:', error);
            }
          }
        }
      },
    });

    // @ts-ignore
    this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
  }

  // Párrafo informativo previo a las observaciones
  private addNoteParagraph() {
    const text = 'Para hacer la revisión inicial 360 de los vehículos motorizados el operador asignado a la operación de su equipo tiene la responsabilidad y obligación de verificar lo siguiente antes de operar la unidad siguiendo los puntos que se encuentran en los stickers de color amarillo en cada equipo, de encontrar alguna falla o algún problema en el equipo deberá ser reportado inmediatamente a su supervisor y al equipo de mantenimiento.';
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    const maxWidth = this.pageWidth - this.margin * 2;
    const lines = this.doc.splitTextToSize(text, maxWidth);
    this.doc.text(lines, this.margin, this.currentY);
    this.currentY += 6 + lines.length * 3.2;
  }

  // Tabla de observaciones
  private addObservationsTable(inspection: Inspection) {
    const obs = inspection.observations || [];
    if (obs.length === 0) return;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('OBSERVACIONES', this.margin, this.currentY);
    this.currentY += 6;

    const head = ['EQUIPO - ITEM', 'OBSERVACIONES OPERADOR', 'OBSERVACIONES MANTENIMIENTO'];
    const rows = obs.map((o) => [
      `${o.equipment_code || '-'} - ${o.obs_id || '-'}`,
      o.obs_operator || '',
      o.obs_maintenance || ''
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [head],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [9, 48, 113], textColor: 255, fontStyle: 'bold' },
      margin: { left: this.margin, right: this.margin },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: (this.pageWidth - this.margin * 2 - 40) * 0.5 },
        2: { cellWidth: (this.pageWidth - this.margin * 2 - 40) * 0.5 },
      },
    });

    // @ts-ignore
    this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
  }

  /**
   * Agrega la sección de firmas
   */
  private async addSignaturesSection(inspection: Inspection) {
    this.doc.setTextColor(COLORS.black);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('FIRMAS Y APROBACIONES', this.margin, this.currentY);
    this.currentY += 10;

    // Supervisor
    if (inspection.supervisor_name) {
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Supervisor:', this.margin, this.currentY);
      this.currentY += 6;

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`Nombre: ${inspection.supervisor_name}`, this.margin + 5, this.currentY);
      this.currentY += 6;

      if (inspection.supervisor_signature_date) {
        const utcDate = new Date(inspection.supervisor_signature_date);
        const peruDate = toZonedTime(utcDate, 'America/Lima');
        const signDate = format(peruDate, 'dd/MM/yyyy HH:mm', { locale: es });
        this.doc.text(`Fecha: ${signDate}`, this.margin + 5, this.currentY);
        this.currentY += 8;
      }

      // Espacio para firma
      if (inspection.supervisor_signature_url) {
        try {
          // Intentar cargar la imagen de la firma
          const img = await this.loadImage(inspection.supervisor_signature_url);
          this.doc.addImage(img, 'PNG', this.margin + 5, this.currentY, 60, 20);
          this.currentY += 22;
        } catch (error) {
          console.error('Error loading signature:', error);
          // Si falla, solo mostrar un rectángulo
          this.doc.rect(this.margin + 5, this.currentY, 60, 20);
          this.currentY += 22;
        }
      } else {
        this.doc.rect(this.margin + 5, this.currentY, 60, 20);
        this.currentY += 22;
      }

      this.doc.line(this.margin + 5, this.currentY, this.margin + 65, this.currentY);
      this.currentY += 4;
      this.doc.setFontSize(8);
      this.doc.text('Firma del Supervisor', this.margin + 20, this.currentY);
    }

    // Mecánico
    if (inspection.mechanic_name) {
      this.currentY += 10;
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Mecánico:', this.margin, this.currentY);
      this.currentY += 6;

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(`Nombre: ${inspection.mechanic_name}`, this.margin + 5, this.currentY);
      this.currentY += 6;

      if (inspection.mechanic_signature_date) {
        const utcDate = new Date(inspection.mechanic_signature_date);
        const peruDate = toZonedTime(utcDate, 'America/Lima');
        const mechDate = format(peruDate, 'dd/MM/yyyy HH:mm', { locale: es });
        this.doc.text(`Fecha: ${mechDate}`, this.margin + 5, this.currentY);
        this.currentY += 8;
      }

      if (inspection.mechanic_signature_url) {
        try {
          const img = await this.loadImage(inspection.mechanic_signature_url);
          this.doc.addImage(img, 'PNG', this.margin + 5, this.currentY, 60, 20);
          this.currentY += 22;
        } catch (error) {
          console.error('Error loading mechanic signature:', error);
          this.doc.rect(this.margin + 5, this.currentY, 60, 20);
          this.currentY += 22;
        }
      } else {
        this.doc.rect(this.margin + 5, this.currentY, 60, 20);
        this.currentY += 22;
      }

      this.doc.line(this.margin + 5, this.currentY, this.margin + 65, this.currentY);
      this.currentY += 4;
      this.doc.setFontSize(8);
      this.doc.text('Firma del Mecánico', this.margin + 20, this.currentY);
    }

    // Nota justo debajo de las firmas (letra muy pequeña)
    const note = `NOTA:\nPara registros fisicos: No debe borrarse, bajo ninguna circunstancia, la información registrada originalmente en un registro; las correcciones o anulación de una parte de la información plasmada en los registros físicos, deben realizarse trazando una línea diagonal sobre la información a corregir o anular, garantizando que ésta quede legible, para luego consignar la nueva información al margen de la información original. La justificación de la corrección o anulación efectuada debe realizarse en la parte posterior del registro indicando la fecha, nombre y/o firma de quien lo ejecutó para que quede constancia.\n\nPara registros electrónicos: Colocar un comentario sobre la información modificada. La justificación de la corrección o anulación efectuada debe realizarse en el comentario añadido indicando la fecha, nombre y/o firma de quien lo ejecutó para que quede constancia.`;
    this.currentY += 8;
    this.doc.setTextColor(COLORS.black);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    const lines = this.doc.splitTextToSize(note, this.pageWidth - this.margin * 2);
    this.doc.text(lines, this.margin, this.currentY);
    this.currentY += lines.length * 4.2;
  }

  /**
   * Agrega el pie de página
   */
  private addFooter() {
    const footerY = this.pageHeight - 15;

    this.doc.setFillColor(COLORS.lightGray);
    this.doc.rect(0, footerY - 5, this.pageWidth, 20, 'F');

    this.doc.setTextColor(COLORS.gray);
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    // El pie solo muestra número de página; texto informativo ya va bajo firmas

    // Número de página
    const pageText = `Página ${this.doc.getCurrentPageInfo().pageNumber}`;
    const pageWidth = this.doc.getTextWidth(pageText);
    this.doc.text(pageText, this.pageWidth - this.margin - pageWidth, footerY);
  }

  /**
   * Carga una imagen desde URL
   */
  private loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // Formatea fecha preservando día cuando llega como string
  private formatDateLocal(input: Date | string): string {
    if (typeof input === 'string') {
      const m = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
      if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    }
    return format(typeof input === 'string' ? new Date(input) : input, 'dd/MM/yyyy', { locale: es });
  }

  private formatTimeLocal(input: Date | string): string {
    if (typeof input === 'string') {
      const m = input.match(/T(\d{2}):(\d{2})/);
      if (m) return `${m[1]}:${m[2]}`;
      return '';
    }
    return format(input, 'HH:mm', { locale: es });
  }

  /**
   * Obtiene el nombre del tipo de inspección
   */
  private getInspectionTypeName(type: string): string {
    const types: Record<string, string> = {
      inicial: 'Inicial',
      periodica: 'Periódica',
      post_mantenimiento: 'Post Mantenimiento',
    };
    return types[type] || type;
  }

  // Acorta descripciones largas para cabeceras de columna
  private shorten(text: string): string {
    const max = 26;
    if (!text) return '';
    if (text.length <= max) return text;
    return text.slice(0, max - 1) + '…';
  }

  /**
   * Descarga el PDF
   */
  download(filename: string) {
    this.doc.save(filename);
  }
}

/**
 * Función auxiliar para generar y descargar el PDF de una inspección
 */
export async function downloadInspectionPDF(inspection: Inspection) {
  const generator = new PDFGenerator();
  const blob = await generator.generateInspectionPDF(inspection);

  const filename = `${inspection.form_code || 'Inspeccion'}_${inspection.station}.pdf`;

  // Crear enlace de descarga
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
