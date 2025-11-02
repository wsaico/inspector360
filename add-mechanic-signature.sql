-- ============================================
-- MIGRACIÓN: Agregar campos de firma del mecánico a inspections
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Agregar columnas de mecánico a la tabla inspections
DO $$
BEGIN
    -- Agregar mechanic_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inspections' AND column_name = 'mechanic_name'
    ) THEN
        ALTER TABLE inspections ADD COLUMN mechanic_name TEXT;
    END IF;

    -- Agregar mechanic_signature_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inspections' AND column_name = 'mechanic_signature_url'
    ) THEN
        ALTER TABLE inspections ADD COLUMN mechanic_signature_url TEXT;
    END IF;

    -- Agregar mechanic_signature_date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'inspections' AND column_name = 'mechanic_signature_date'
    ) THEN
        ALTER TABLE inspections ADD COLUMN mechanic_signature_date TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Verificar la estructura actualizada de inspections
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'inspections'
AND column_name IN ('supervisor_name', 'supervisor_signature_url', 'supervisor_signature_date',
                     'mechanic_name', 'mechanic_signature_url', 'mechanic_signature_date')
ORDER BY ordinal_position;

-- 3. Verificar que las columnas se crearon correctamente
SELECT
    id,
    form_code,
    supervisor_name,
    supervisor_signature_url IS NOT NULL as has_supervisor_sig,
    mechanic_name,
    mechanic_signature_url IS NOT NULL as has_mechanic_sig,
    status,
    created_at
FROM inspections
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- NOTAS:
-- - Las columnas se crean como nullable para no afectar datos existentes
-- - Los registros existentes tendrán mechanic_name, mechanic_signature_url y mechanic_signature_date como NULL
-- - Las nuevas inspecciones deberán incluir ambas firmas (supervisor y mecánico)
-- ============================================
