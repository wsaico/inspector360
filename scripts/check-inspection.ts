/**
 * Script para revisar una inspección específica
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno requeridas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInspection() {
  const inspectionId = '41cc6472-ca3f-46fe-b7dc-fcfd485a1d18';

  console.log(`🔍 Revisando inspección ${inspectionId}...\n`);

  const { data: inspection, error } = await supabase
    .from('inspections')
    .select('*, equipment(*)')
    .eq('id', inspectionId)
    .single();

  if (error) {
    console.error('❌ Error al obtener inspección:', error);
    return;
  }

  console.log('📊 INSPECCIÓN:');
  console.log(`   - form_code: ${inspection.form_code}`);
  console.log(`   - status: ${inspection.status}`);
  console.log(`   - supervisor_name: ${inspection.supervisor_name || 'NULL'}`);
  console.log(`   - supervisor_signature_url: ${inspection.supervisor_signature_url || 'NULL'}`);
  console.log(`   - mechanic_name: ${inspection.mechanic_name || 'NULL'}`);
  console.log(`   - mechanic_signature_url: ${inspection.mechanic_signature_url || 'NULL'}`);

  // Verificar equipos
  console.log(`\n📦 EQUIPOS: ${inspection.equipment?.length || 0}`);
  if (inspection.equipment && inspection.equipment.length > 0) {
    inspection.equipment.forEach((eq: any, idx: number) => {
      console.log(`\n   [${idx + 1}] ${eq.code}`);
      console.log(`   - inspector_signature_url: ${eq.inspector_signature_url || 'NULL'}`);
      console.log(`   - inspector_signature_date: ${eq.inspector_signature_date || 'NULL'}`);
    });
  }

  // Verificar observaciones (solo para reporte informativo)
  const { data: observations } = await supabase
    .from('observations')
    .select('*')
    .eq('inspection_id', inspectionId);

  console.log(`\n📝 OBSERVACIONES: ${observations?.length || 0}`);

  // Calcular estado correcto (solo firma de supervisor obligatoria)
  const hasSupervisorSig = !!inspection.supervisor_signature_url && inspection.supervisor_signature_url.trim().length > 0;
  const hasEquipment = Array.isArray(inspection.equipment) && inspection.equipment.length > 0;

  let correctStatus: 'draft' | 'pending' | 'completed';
  if (hasSupervisorSig) {
    correctStatus = 'completed';
  } else if (hasEquipment) {
    correctStatus = 'pending';
  } else {
    correctStatus = 'draft';
  }

  console.log(`\n🔍 ANÁLISIS:`);
  console.log(`   - Tiene firma supervisor: ${hasSupervisorSig ? 'SÍ ✅' : 'NO ❌'}`);
  // Firma de mecánico y respuesta son opcionales
  console.log(`   - Estado actual: ${inspection.status}`);
  console.log(`   - Estado correcto: ${correctStatus}`);

  if (inspection.status !== correctStatus) {
    console.log(`\n⚠️  INCONSISTENCIA DETECTADA: ${inspection.status} → ${correctStatus}`);
  } else {
    console.log(`\n✅ Estado correcto`);
  }
}

checkInspection().catch(console.error);
