-- ============================================
-- SCRIPTS SQL PARA CONFIGURAR SUPABASE
-- Sistema Inspector 360° - FOR-ATA-057
-- ============================================

-- IMPORTANTE: Ejecutar estos scripts en el SQL Editor de Supabase
-- en el orden indicado

-- ============================================
-- 1. EXTENSIONES
-- ============================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. TABLA: users
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'sig')),
  station TEXT CHECK (station IN ('AQP', 'CUZ', 'CIX', 'TRU', 'CJA', 'TPP', 'PIU')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_station ON users(station);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Comentarios
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema';
COMMENT ON COLUMN users.role IS 'Rol: admin, supervisor, sig';
COMMENT ON COLUMN users.station IS 'Estación asignada (solo para supervisores)';

-- ============================================
-- 3. TABLA: inspections
-- ============================================

CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_code TEXT UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  station TEXT NOT NULL CHECK (station IN ('AQP', 'CUZ', 'CIX', 'TRU', 'CJA', 'TPP', 'PIU')),
  inspection_date DATE NOT NULL,
  inspection_type TEXT NOT NULL CHECK (inspection_type IN ('inicial', 'periodica', 'post_mantenimiento')),
  inspector_name TEXT NOT NULL,
  supervisor_name TEXT,
  supervisor_signature_url TEXT,
  supervisor_signature_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para inspections
CREATE INDEX IF NOT EXISTS idx_inspections_user ON inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_station ON inspections(station);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_form_code ON inspections(form_code);

-- ============================================
-- 4. FUNCIÓN: Generar código de formulario
-- ============================================

CREATE OR REPLACE FUNCTION generate_form_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  -- Obtener año de la fecha de inspección
  year_str := EXTRACT(YEAR FROM NEW.inspection_date)::TEXT;

  -- Obtener el siguiente número para este año
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(form_code FROM 'FOR-ATA-057-' || year_str || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM inspections
  WHERE form_code LIKE 'FOR-ATA-057-' || year_str || '-%';

  -- Generar código
  NEW.form_code := 'FOR-ATA-057-' || year_str || '-' || LPAD(next_num::TEXT, 3, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-generar form_code
DROP TRIGGER IF EXISTS set_form_code ON inspections;
CREATE TRIGGER set_form_code
  BEFORE INSERT ON inspections
  FOR EACH ROW
  WHEN (NEW.form_code IS NULL)
  EXECUTE FUNCTION generate_form_code();

-- ============================================
-- 5. TABLA: equipment
-- ============================================

CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (code ~ '^TLM-\d{2}-\d{3}$'),
  type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  motor_serial TEXT,
  inspector_signature_url TEXT,
  checklist_data JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para equipment
CREATE INDEX IF NOT EXISTS idx_equipment_inspection ON equipment(inspection_id);
CREATE INDEX IF NOT EXISTS idx_equipment_code ON equipment(code);
CREATE INDEX IF NOT EXISTS idx_equipment_checklist ON equipment USING GIN (checklist_data);

-- ============================================
-- 6. TABLA: checklist_template
-- ============================================

CREATE TABLE IF NOT EXISTS checklist_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN (
    'documentacion',
    'electrico',
    'mecanico',
    'hidraulico',
    'general'
  )),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para checklist_template
CREATE INDEX IF NOT EXISTS idx_template_category ON checklist_template(category);
CREATE INDEX IF NOT EXISTS idx_template_active ON checklist_template(is_active);
CREATE INDEX IF NOT EXISTS idx_template_order ON checklist_template(order_index);

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. POLÍTICAS RLS PARA users
-- ============================================

-- Usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Admin puede ver todos los usuarios
CREATE POLICY "Admin can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Admin puede crear usuarios
CREATE POLICY "Admin can insert users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- Admin puede actualizar usuarios
CREATE POLICY "Admin can update users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- ============================================
-- 9. POLÍTICAS RLS PARA inspections
-- ============================================

-- Ver inspecciones según rol
CREATE POLICY "View inspections by role" ON inspections
  FOR SELECT
  USING (
    -- Admin ve todo
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
    OR
    -- SIG ve todo
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'sig'
      AND users.is_active = true
    )
    OR
    -- Supervisor ve solo su estación
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'supervisor'
      AND users.station = inspections.station
      AND users.is_active = true
    )
  );

-- Crear inspecciones (solo supervisor y admin)
CREATE POLICY "Create inspections" ON inspections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
      AND users.is_active = true
      AND (
        users.role = 'admin'
        OR
        users.station = inspections.station
      )
    )
  );

-- Actualizar inspecciones
CREATE POLICY "Update inspections" ON inspections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'supervisor')
      AND users.is_active = true
      AND (
        users.role = 'admin'
        OR
        users.station = inspections.station
      )
    )
  );

-- Solo admin puede eliminar
CREATE POLICY "Delete inspections" ON inspections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- ============================================
-- 10. POLÍTICAS RLS PARA equipment
-- ============================================

-- Equipment hereda permisos de la inspección padre
CREATE POLICY "Equipment follows inspection permissions" ON equipment
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = equipment.inspection_id
    )
  );

-- ============================================
-- 11. POLÍTICAS RLS PARA checklist_template
-- ============================================

-- Todos los usuarios autenticados pueden leer el template
CREATE POLICY "Authenticated users can read template" ON checklist_template
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Solo admin puede modificar el template
CREATE POLICY "Admin can modify template" ON checklist_template
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.is_active = true
    )
  );

-- ============================================
-- 12. STORAGE BUCKETS
-- ============================================

-- Crear bucket para firmas
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Crear bucket para PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 13. POLÍTICAS DE STORAGE
-- ============================================

-- Políticas para signatures bucket
CREATE POLICY "Users can upload signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Users can view signatures"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signatures');

-- Políticas para PDFs bucket
CREATE POLICY "Users can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs');

CREATE POLICY "Users can view PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs');

-- ============================================
-- 14. TRIGGER: updated_at automático
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a tablas con updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inspections_updated_at ON inspections;
CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIN DE SCRIPTS DE CONFIGURACIÓN
-- ============================================

-- Verificar que todo se creó correctamente
SELECT 'TABLES CREATED SUCCESSFULLY' AS status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
