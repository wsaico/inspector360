-- ============================================
-- MIGRACIÓN: Agregar columnas a tabla equipment y crear tabla observations
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Agregar columna station a equipment si no existe
DO $$
BEGIN
    -- Agregar station (primero como nullable, luego actualizar)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'equipment' AND column_name = 'station'
    ) THEN
        ALTER TABLE equipment ADD COLUMN station TEXT;
    END IF;
END $$;

-- 2. Actualizar registros existentes con un valor por defecto para station
-- (si hay equipos existentes sin station, usar la station de la inspección padre)
UPDATE equipment e
SET station = i.station
FROM inspections i
WHERE e.inspection_id = i.id
  AND e.station IS NULL;

-- 3. Hacer station NOT NULL después de actualizar datos existentes
ALTER TABLE equipment ALTER COLUMN station SET NOT NULL;

-- 4. Crear índice para station si no existe
CREATE INDEX IF NOT EXISTS idx_equipment_station ON equipment(station);

-- 5. Crear tabla observations (separada de equipment)
CREATE TABLE IF NOT EXISTS observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  obs_id TEXT NOT NULL,
  equipment_code TEXT NOT NULL,
  obs_operator TEXT NOT NULL,
  obs_maintenance TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar nulabilidad si ya existía como NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'observations' AND column_name = 'obs_maintenance' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE observations ALTER COLUMN obs_maintenance DROP NOT NULL;
  END IF;
END $$;

-- 6. Crear índices para observations
CREATE INDEX IF NOT EXISTS idx_observations_inspection ON observations(inspection_id);
CREATE INDEX IF NOT EXISTS idx_observations_equipment_code ON observations(equipment_code);
CREATE INDEX IF NOT EXISTS idx_observations_obs_id ON observations(obs_id);

-- 7. Crear trigger para observations
DROP TRIGGER IF EXISTS update_observations_updated_at ON observations;
CREATE TRIGGER update_observations_updated_at
  BEFORE UPDATE ON observations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Verificar la estructura actualizada
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'equipment'
ORDER BY ordinal_position;

-- 9. Verificar datos de equipos
SELECT
    id,
    code,
    type,
    station,
    created_at
FROM equipment
ORDER BY created_at DESC
LIMIT 5;

-- 10. Verificar tabla observations
SELECT COUNT(*) as total_observations FROM observations;
