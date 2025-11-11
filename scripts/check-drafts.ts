/**
 * Script de diagnóstico para verificar inspecciones en estado borrador
 *
 * Uso: npx tsx scripts/check-drafts.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno no configuradas');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDrafts() {
  console.log('🔍 Verificando inspecciones en estado borrador...\n');

  // 1. Contar todas las inspecciones por estado
  const { data: allInspections, error: allError } = await supabase
    .from('inspections')
    .select('id, form_code, status, station, inspection_date, inspector_name, created_at', { count: 'exact' });

  if (allError) {
    console.error('❌ Error al obtener inspecciones:', allError.message);
    return;
  }

  console.log('📊 RESUMEN DE INSPECCIONES:');
  console.log('──────────────────────────────────────');

  const byStatus = {
    draft: allInspections?.filter(i => i.status === 'draft') || [],
    pending: allInspections?.filter(i => i.status === 'pending') || [],
    completed: allInspections?.filter(i => i.status === 'completed') || [],
  };

  console.log(`   Total: ${allInspections?.length || 0} inspecciones`);
  console.log(`   ├─ Borrador (draft): ${byStatus.draft.length}`);
  console.log(`   ├─ Pendiente (pending): ${byStatus.pending.length}`);
  console.log(`   └─ Completada (completed): ${byStatus.completed.length}`);
  console.log('');

  // 2. Mostrar detalles de borradores
  if (byStatus.draft.length === 0) {
    console.log('⚠️  NO HAY INSPECCIONES EN ESTADO BORRADOR');
    console.log('');
    console.log('💡 Para ver el botón "Continuar":');
    console.log('   1. Crea una nueva inspección');
    console.log('   2. Llena el Step 1 (Info General)');
    console.log('   3. Cierra el navegador antes de completarla');
    console.log('   4. Vuelve al listado de inspecciones');
    console.log('   5. Deberías ver el botón "Continuar" en azul');
    console.log('');
    return;
  }

  console.log('📋 INSPECCIONES EN BORRADOR:');
  console.log('──────────────────────────────────────');

  for (const draft of byStatus.draft) {
    console.log(`\n   ID: ${draft.id}`);
    console.log(`   Código: ${draft.form_code || 'Sin código'}`);
    console.log(`   Estación: ${draft.station}`);
    console.log(`   Inspector: ${draft.inspector_name}`);
    console.log(`   Fecha: ${new Date(draft.inspection_date).toLocaleDateString()}`);
    console.log(`   Creado: ${new Date(draft.created_at).toLocaleString()}`);
    console.log(`   Estado: ${draft.status} ✅`);

    // Verificar si tiene equipos
    const { data: equipment, count: equipmentCount } = await supabase
      .from('equipment')
      .select('id', { count: 'exact' })
      .eq('inspection_id', draft.id);

    console.log(`   Equipos: ${equipmentCount || 0}`);
  }

  console.log('\n');
  console.log('✅ INSPECCIONES ENCONTRADAS EN BORRADOR');
  console.log('');
  console.log('🔍 VERIFICAR EN EL NAVEGADOR:');
  console.log('   1. Ve a /inspections');
  console.log('   2. Busca las inspecciones listadas arriba');
  console.log('   3. Deben tener badge "Borrador" (gris)');
  console.log('   4. Debe aparecer botón azul "Continuar"');
  console.log('');
  console.log('⚠️  Si no ves el botón, verifica:');
  console.log('   - Que tu usuario tenga permiso para crear inspecciones');
  console.log('   - Que el caché del navegador esté limpio (Ctrl+Shift+R)');
  console.log('   - Que el código esté desplegado en el servidor');
  console.log('');
}

checkDrafts().catch(console.error);
