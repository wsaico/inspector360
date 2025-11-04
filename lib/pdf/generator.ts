/**
 * Generador de PDF para Inspecciones
 * Formato: FOR-ATA-057
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Inspection, Equipment } from '@/types';
import { format } from 'date-fns';
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
      orientation: 'portrait',
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
    // Página 1: Información general y equipos
    this.addHeader(inspection);
    this.addGeneralInfo(inspection);

    // Por cada equipo, agregar su checklist
    if (inspection.equipment && inspection.equipment.length > 0) {
      for (let i = 0; i < inspection.equipment.length; i++) {
        const equipment = inspection.equipment[i];

        // Si no es el primer equipo, agregar nueva página
        if (i > 0) {
          this.doc.addPage();
          this.currentY = this.margin;
          this.addHeader(inspection);
        }

        this.addEquipmentSection(equipment, i + 1);
        this.addChecklistTable(equipment);
      }
    }

    // Última página: Firmas
    this.doc.addPage();
    this.currentY = this.margin;
    this.addHeader(inspection);
    await this.addSignaturesSection(inspection);
    this.addFooter();

    return this.doc.output('blob');
  }

  /**
   * Agrega el encabezado de cada página
   */
  private addHeader(inspection: Inspection) {
    // Logo y título (simulado con texto por ahora)
    this.doc.setFillColor(COLORS.primary);
    this.doc.rect(0, 0, this.pageWidth, 30, 'F');

    this.doc.setTextColor(COLORS.white);
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INSPECCIÓN 360°', this.margin, 12);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Sistema Integrado de Gestión', this.margin, 18);

    // Código del formulario
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    const formCode = inspection.form_code || 'FOR-ATA-057';
    const codeWidth = this.doc.getTextWidth(formCode);
    this.doc.text(formCode, this.pageWidth - this.margin - codeWidth, 12);

    // Fecha
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    const dateStr = format(
      typeof inspection.inspection_date === 'string'
        ? new Date(inspection.inspection_date)
        : inspection.inspection_date,
      'dd/MM/yyyy',
      { locale: es }
    );
    const dateWidth = this.doc.getTextWidth(dateStr);
    this.doc.text(dateStr, this.pageWidth - this.margin - dateWidth, 18);

    this.currentY = 35;
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
    const equipmentData = [
      ['Tipo', equipment.type],
      ['Marca', equipment.brand],
      ['Modelo', equipment.model],
      ['Año', equipment.year.toString()],
      ['Serie', equipment.serial_number],
    ];

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
        const signDate = format(
          new Date(inspection.supervisor_signature_date),
          'dd/MM/yyyy HH:mm',
          { locale: es }
        );
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
        const mechDate = format(
          new Date(inspection.mechanic_signature_date),
          'dd/MM/yyyy HH:mm',
          { locale: es }
        );
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

    const footerText = 'Inspector 360° - Sistema Integrado de Gestión';
    const textWidth = this.doc.getTextWidth(footerText);
    this.doc.text(footerText, (this.pageWidth - textWidth) / 2, footerY);

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
