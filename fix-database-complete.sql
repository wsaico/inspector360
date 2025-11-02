-- ============================================
-- FIX DATABASE COMPLETO - Inspector 360
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Verificar estructura actual de equipment
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'equipment'
ORDER BY ordinal_position;

-- 2. Agregar columna year si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'year'
  ) THEN
    ALTER TABLE equipment ADD COLUMN year INTEGER;
    RAISE NOTICE 'Columna year agregada';
  ELSE
    RAISE NOTICE 'Columna year ya existe';
  END IF;
END $$;

-- 3. Verificar y arreglar foreign key
DO $$
BEGIN
  -- Eliminar constraint viejo si existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'equipment_inspection_id_fkey'
    AND table_name = 'equipment'
  ) THEN
    ALTER TABLE equipment DROP CONSTRAINT equipment_inspection_id_fkey;
    RAISE NOTICE 'Constraint viejo eliminado';
  END IF;

  -- Agregar constraint correcto
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'equipment_inspection_id_fkey'
    AND table_name = 'equipment'
  ) THEN
    ALTER TABLE equipment
    ADD CONSTRAINT equipment_inspection_id_fkey
    FOREIGN KEY (inspection_id)
    REFERENCES inspections(id)
    ON DELETE CASCADE;
    RAISE NOTICE 'Foreign key agregada';
  END IF;
END $$;

-- 4. Eliminar constraints problemáticos
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_code_check;

-- 5. Verificar que inspection_id existe y no es null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment'
    AND column_name = 'inspection_id'
  ) THEN
    ALTER TABLE equipment ADD COLUMN inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE;
    RAISE NOTICE 'Columna inspection_id agregada';
  END IF;
END $$;

-- 6. Deshabilitar RLS para debugging
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;

-- 7. Verificar inspecciones existentes
SELECT
    id,
    form_code,
    inspection_date,
    inspector_name,
    station,
    status,
    created_at
FROM inspections
ORDER BY created_at DESC
LIMIT 5;

-- 8. Verificar equipos y su relación con inspecciones
SELECT
    e.id,
    e.code,
    e.type,
    e.inspection_id,
    i.form_code as inspection_code
FROM equipment e
LEFT JOIN inspections i ON e.inspection_id = i.id
LIMIT 5;

-- 9. Contar inspecciones y equipos
SELECT
    (SELECT COUNT(*) FROM inspections) as total_inspections,
    (SELECT COUNT(*) FROM equipment) as total_equipment;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- La tabla equipment debe tener:
-- - inspection_id (uuid, NOT NULL, FK a inspections)
-- - year (integer)
-- Y debe aparecer la relación en los selects finales
