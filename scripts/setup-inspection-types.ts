/**
 * Script para crear la tabla inspection_types y datos iniciales
 * Ejecutar: npx tsx scripts/setup-inspection-types.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno requeridas no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupInspectionTypes() {
  console.log('🚀 Iniciando configuración de inspection_types...\n');

  try {
    // Verificar si la tabla ya existe
    const { data: existingTable, error: checkError } = await supabase
      .from('inspection_types')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ La tabla inspection_types ya existe');
      console.log('📊 Verificando datos...\n');

      const { data: types, error: typesError } = await supabase
        .from('inspection_types')
        .select('*')
        .order('display_order');

      if (types && types.length > 0) {
        console.log(`✅ Encontrados ${types.length} tipos de inspección:\n`);
        types.forEach((type: any) => {
          console.log(`   ${type.icon} ${type.name} - ${type.is_active ? '✅ ACTIVO' : '⏳ Próximamente'}`);
        });
        console.log('\n✨ Todo configurado correctamente!');
      } else {
        console.log('⚠️  La tabla existe pero no tiene datos. Insertando datos iniciales...\n');
        await insertInitialData();
      }
    } else {
      console.log('⚠️  La tabla inspection_types no existe.');
      console.log('📝 Por favor, ejecuta el siguiente SQL en Supabase SQL Editor:\n');
      console.log('   1. Ve a https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
      console.log('   2. Copia el contenido de: scripts/create-inspection-types.sql');
      console.log('   3. Pega y ejecuta el SQL\n');
      console.log('💡 O ejecuta manualmente estos comandos SQL:\n');
      printSQL();
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Ejecuta manualmente el SQL del archivo: scripts/create-inspection-types.sql');
  }
}

async function insertInitialData() {
  const initialTypes = [
    {
      code: 'technical',
      name: 'Inspección Técnica de Equipos',
      icon: '🔧',
      description: 'Inspección técnica de maquinaria pesada y equipos mineros',
      form_prefix: 'INSP-FOR',
      is_active: true,
      display_order: 1,
    },
    {
      code: 'extinguisher',
      name: 'Inspección de Extintores',
      icon: '🧯',
      description: 'Inspección y verificación del estado de extintores de incendios',
      form_prefix: 'INSP-EXT',
      is_active: false,
      display_order: 2,
    },
    {
      code: 'first_aid',
      name: 'Inspección de Botiquín',
      icon: '💊',
      description: 'Revisión de botiquines de primeros auxilios y medicamentos',
      form_prefix: 'INSP-BOT',
      is_active: false,
      display_order: 3,
    },
    {
      code: 'internal',
      name: 'Inspección Interna',
      icon: '🏢',
      description: 'Inspección general de instalaciones y áreas de trabajo',
      form_prefix: 'INSP-INT',
      is_active: false,
      display_order: 4,
    },
  ];

  const { data, error } = await supabase
    .from('inspection_types')
    .insert(initialTypes)
    .select();

  if (error) {
    console.error('❌ Error insertando datos:', error);
  } else {
    console.log('✅ Datos iniciales insertados correctamente\n');
    data?.forEach((type: any) => {
      console.log(`   ${type.icon} ${type.name} - ${type.is_active ? '✅ ACTIVO' : '⏳ Próximamente'}`);
    });
  }
}

function printSQL() {
  console.log(`
-- Crear tabla inspection_types
CREATE TABLE IF NOT EXISTS inspection_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  icon VARCHAR(10) NOT NULL,
  description TEXT,
  form_prefix VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar tipos iniciales
INSERT INTO inspection_types (code, name, icon, description, form_prefix, is_active, display_order)
VALUES
  ('technical', 'Inspección Técnica de Equipos', '🔧', 'Inspección técnica de maquinaria pesada y equipos mineros', 'INSP-FOR', true, 1),
  ('extinguisher', 'Inspección de Extintores', '🧯', 'Inspección y verificación del estado de extintores de incendios', 'INSP-EXT', false, 2),
  ('first_aid', 'Inspección de Botiquín', '💊', 'Revisión de botiquines de primeros auxilios y medicamentos', 'INSP-BOT', false, 3),
  ('internal', 'Inspección Interna', '🏢', 'Inspección general de instalaciones y áreas de trabajo', 'INSP-INT', false, 4);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_inspection_types_active ON inspection_types(is_active);
CREATE INDEX IF NOT EXISTS idx_inspection_types_order ON inspection_types(display_order);
  `);
}

setupInspectionTypes().catch(console.error);
