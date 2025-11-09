-- =====================================================
-- Script de Migración: Tabla inspection_types (SIMPLIFICADO)
-- Sin RLS policies para evitar errores de dependencias
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

-- 3. Crear índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_inspection_types_active ON inspection_types(is_active);
CREATE INDEX IF NOT EXISTS idx_inspection_types_order ON inspection_types(display_order);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE inspection_types ENABLE ROW LEVEL SECURITY;

-- 5. Política simple: Permitir lectura a todos los usuarios autenticados
CREATE POLICY "Allow read access to all authenticated users"
ON inspection_types
FOR SELECT
TO authenticated
USING (true);

-- 6. Política simple: Permitir todas las operaciones a usuarios autenticados
-- (Puedes restringir esto más adelante según tu tabla de usuarios)
CREATE POLICY "Allow all operations to authenticated users"
ON inspection_types
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =====================================================
-- ✅ TABLA CREADA EXITOSAMENTE
--
-- Para verificar, ejecuta:
-- SELECT * FROM inspection_types ORDER BY display_order;
-- =====================================================
