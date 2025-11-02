-- ============================================
-- FIX DATABASE - Inspector 360
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Agregar columna year si no existe
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

-- 2. Eliminar constraint de código si existe
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_code_check;

-- 3. Deshabilitar RLS temporalmente para debugging
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;

-- 4. Verificar estructura de equipment
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'equipment'
ORDER BY ordinal_position;

-- 5. Verificar usuarios activos
SELECT id, email, full_name, role, station, is_active
FROM users
WHERE is_active = true;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- La tabla equipment debe tener:
-- - id (uuid)
-- - inspection_id (uuid)
-- - code (text)
-- - type (text)
-- - brand (text)
-- - model (text)
-- - year (integer) <-- Esta columna debe existir
-- - serial_number (text)
-- - motor_serial (text)
-- - inspector_signature_url (text)
-- - checklist_data (jsonb)
-- - order_index (integer)
-- - created_at (timestamptz)
-- - updated_at (timestamptz)
