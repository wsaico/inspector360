-- ============================================
-- CREAR TABLA EQUIPMENT - Inspector 360
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Crear tabla equipment si no existe
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  serial_number TEXT NOT NULL,
  motor_serial TEXT,
  station TEXT NOT NULL,
  inspector_signature_url TEXT,
  checklist_data JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2. Crear tabla observations (separada de equipment)
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

-- Si la tabla ya existe y la columna quedó como NOT NULL en entornos previos,
-- aseguramos que permita valores nulos:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'observations' AND column_name = 'obs_maintenance' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE observations ALTER COLUMN obs_maintenance DROP NOT NULL;
  END IF;
END $$;

-- 2. Crear índices para equipment
CREATE INDEX IF NOT EXISTS idx_equipment_inspection ON equipment(inspection_id);
CREATE INDEX IF NOT EXISTS idx_equipment_code ON equipment(code);
CREATE INDEX IF NOT EXISTS idx_equipment_station ON equipment(station);
CREATE INDEX IF NOT EXISTS idx_equipment_checklist ON equipment USING GIN (checklist_data);

-- 2.2. Crear índices para observations
CREATE INDEX IF NOT EXISTS idx_observations_inspection ON observations(inspection_id);
CREATE INDEX IF NOT EXISTS idx_observations_equipment_code ON observations(equipment_code);
CREATE INDEX IF NOT EXISTS idx_observations_obs_id ON observations(obs_id);

-- 3. Crear trigger para updated_at
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_observations_updated_at ON observations;
CREATE TRIGGER update_observations_updated_at
  BEFORE UPDATE ON observations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Deshabilitar RLS
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;

-- 5. Habilitar RLS y crear políticas
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Equipment hereda permisos de la inspección padre
-- Primero eliminar la política si existe
DROP POLICY IF EXISTS "Equipment follows inspection permissions" ON equipment;

-- Crear la política
CREATE POLICY "Equipment follows inspection permissions" ON equipment
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = equipment.inspection_id
    )
  );

-- 6. Deshabilitar RLS nuevamente para debugging
ALTER TABLE equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE inspections DISABLE ROW LEVEL SECURITY;

-- 7. Verificar la estructura
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'equipment'
ORDER BY ordinal_position;

-- 8. Verificar inspecciones existentes
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

-- 9. Verificar equipos (debería estar vacío)
SELECT COUNT(*) as total_equipment FROM equipment;
