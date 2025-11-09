-- =====================================================
-- Script de Migración: Tabla inspection_types
-- Descripción: Crea la tabla para manejar diferentes tipos de inspecciones
-- =====================================================

-- 1. Crear tabla inspection_types
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

-- 2. Insertar tipos de inspección iniciales
INSERT INTO inspection_types (code, name, icon, description, form_prefix, is_active, display_order)
VALUES
  ('technical', 'Inspección Técnica de Equipos', '🔧', 'Inspección técnica de maquinaria pesada y equipos mineros', 'INSP-FOR', true, 1),
  ('extinguisher', 'Inspección de Extintores', '🧯', 'Inspección y verificación del estado de extintores de incendios', 'INSP-EXT', false, 2),
  ('first_aid', 'Inspección de Botiquín', '💊', 'Revisión de botiquines de primeros auxilios y medicamentos', 'INSP-BOT', false, 3),
  ('internal', 'Inspección Interna', '🏢', 'Inspección general de instalaciones y áreas de trabajo', 'INSP-INT', false, 4);

-- 3. Agregar columna inspection_type_id a la tabla inspections (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'inspection_type_id'
  ) THEN
    ALTER TABLE inspections
    ADD COLUMN inspection_type_id UUID REFERENCES inspection_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Actualizar inspecciones existentes para asignarles el tipo 'technical'
UPDATE inspections
SET inspection_type_id = (SELECT id FROM inspection_types WHERE code = 'technical')
WHERE inspection_type_id IS NULL;

-- 5. Crear índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_inspections_type_id ON inspections(inspection_type_id);
CREATE INDEX IF NOT EXISTS idx_inspection_types_active ON inspection_types(is_active);
CREATE INDEX IF NOT EXISTS idx_inspection_types_order ON inspection_types(display_order);

-- 6. Comentarios para documentación
COMMENT ON TABLE inspection_types IS 'Catálogo de tipos de inspecciones disponibles en el sistema';
COMMENT ON COLUMN inspection_types.code IS 'Código único identificador del tipo (usado en rutas)';
COMMENT ON COLUMN inspection_types.form_prefix IS 'Prefijo para el código de formulario (ej: INSP-FOR-001)';
COMMENT ON COLUMN inspection_types.is_active IS 'Indica si el tipo de inspección está habilitado para uso';
COMMENT ON COLUMN inspection_types.display_order IS 'Orden de visualización en la interfaz';

-- =====================================================
-- Para ejecutar este script:
-- Copia todo el contenido y pégalo en el SQL Editor de Supabase
-- =====================================================
