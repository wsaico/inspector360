/**
 * Script para corregir estados de inspecciones
 * Actualiza el campo 'status' basándose en las firmas existentes
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInspectionStatus() {
  console.log('🔍 Obteniendo todas las inspecciones...');

  const { data: inspections, error } = await supabase
    .from('inspections')
    .select('id, form_code, supervisor_signature_url, mechanic_signature_url, status, equipment(id), observations(obs_operator, obs_maintenance)');

  if (error) {
    console.error('❌ Error al obtener inspecciones:', error);
    return;
  }

  console.log(`📊 Total de inspecciones: ${inspections.length}`);

  let updated = 0;
  let skipped = 0;

  for (const inspection of inspections) {
    const hasSupervisorSignature = !!inspection.supervisor_signature_url && inspection.supervisor_signature_url.trim().length > 0;
    const hasEquipment = Array.isArray(inspection.equipment) && inspection.equipment.length > 0;

    let correctStatus: 'draft' | 'pending' | 'completed';
    if (hasSupervisorSignature) {
      correctStatus = 'completed';
    } else if (hasEquipment) {
      correctStatus = 'pending';
    } else {
      correctStatus = 'draft';
    }

    if (inspection.status !== correctStatus) {
      console.log(`🔄 ${inspection.form_code}: ${inspection.status} → ${correctStatus}`);

      const { error: updateError } = await supabase
        .from('inspections')
        .update({ status: correctStatus })
        .eq('id', inspection.id);

      if (updateError) {
        console.error(`❌ Error actualizando ${inspection.form_code}:`, updateError);
      } else {
        updated++;
      }
    } else {
      skipped++;
    }
  }

  console.log('\n✅ Proceso completado:');
  console.log(`   - Actualizadas: ${updated}`);
  console.log(`   - Sin cambios: ${skipped}`);
}

fixInspectionStatus().catch(console.error);
