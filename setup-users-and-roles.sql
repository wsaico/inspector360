-- ============================================
-- MIGRACIÓN: Sistema de Gestión de Usuarios y Roles
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Crear tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'inspector', 'sig', 'operador', 'mecanico')),
  station TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_station ON user_profiles(station);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);

-- 3. Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at_trigger ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at_trigger
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- 4. Función para crear perfil automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role, station)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'inspector'),
        NEW.raw_user_meta_data->>'station'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-crear perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- 5. Row Level Security (RLS) Policies para user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
    ON user_profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Los admins pueden ver todos los perfiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
    ON user_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Los supervisores pueden ver perfiles de su estación
DROP POLICY IF EXISTS "Supervisors can view station profiles" ON user_profiles;
CREATE POLICY "Supervisors can view station profiles"
    ON user_profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'supervisor'
            AND up.station = user_profiles.station
        )
    );

-- Policy: Solo admins pueden insertar nuevos perfiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
CREATE POLICY "Admins can insert profiles"
    ON user_profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Solo admins pueden actualizar perfiles
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
CREATE POLICY "Admins can update profiles"
    ON user_profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Solo admins pueden eliminar perfiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
CREATE POLICY "Admins can delete profiles"
    ON user_profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. Actualizar RLS para inspections (filtrar por estación según rol)
DROP POLICY IF EXISTS "Users can view own station inspections" ON inspections;
CREATE POLICY "Users can view own station inspections"
    ON inspections
    FOR SELECT
    USING (
        -- Admins ven todo
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Supervisores e inspectores ven solo su estación
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND station = inspections.station
        )
    );

-- Policy para INSERT en inspections
DROP POLICY IF EXISTS "Users can create inspections for their station" ON inspections;
CREATE POLICY "Users can create inspections for their station"
    ON inspections
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role IN ('admin', 'supervisor', 'inspector'))
            AND (role = 'admin' OR station = inspections.station)
        )
    );

-- Policy para UPDATE en inspections
DROP POLICY IF EXISTS "Users can update own station inspections" ON inspections;
CREATE POLICY "Users can update own station inspections"
    ON inspections
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND (role = 'admin' OR station = inspections.station)
        )
    );

-- Policy para DELETE en inspections (solo admins)
DROP POLICY IF EXISTS "Only admins can delete inspections" ON inspections;
CREATE POLICY "Only admins can delete inspections"
    ON inspections
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 7. Crear usuario admin inicial (CAMBIAR PASSWORD!)
-- Nota: Esto debe hacerse después de que el usuario se registre normalmente
-- O puedes crear el usuario manualmente en Supabase Auth y luego actualizar el perfil

-- 8. Verificar la estructura
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 9. Verificar datos de ejemplo
SELECT
    id,
    email,
    full_name,
    role,
    station,
    is_active,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- NOTAS IMPORTANTES:
-- 1. Después de ejecutar este script, crea manualmente un usuario admin en Supabase Auth
-- 2. Luego actualiza su perfil: UPDATE user_profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
-- 3. Los roles disponibles son: 'admin', 'supervisor', 'inspector'
-- 4. Los admins pueden gestionar todos los usuarios
-- 5. Los supervisores solo ven usuarios de su estación
-- 6. Los inspectores solo ven su propio perfil
-- ============================================
