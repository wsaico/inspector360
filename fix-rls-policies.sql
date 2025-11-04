-- ============================================
-- FIX: Políticas RLS con recursión infinita
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Eliminar TODAS las políticas existentes de user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all users" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
DROP POLICY IF EXISTS "Supervisors can view station profiles" ON user_profiles;

-- 2. Crear políticas RLS simples y sin recursión
-- IMPORTANTE: Usamos auth.uid() en lugar de consultar user_profiles

-- Política de SELECT: Los usuarios autenticados pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política de UPDATE: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política de INSERT: Permitir que el trigger cree perfiles
CREATE POLICY "Enable insert for service role"
ON user_profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. Verificar que RLS esté habilitado
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. Verificar las políticas creadas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 5. (Opcional pero recomendado) Políticas adicionales seguras SIN recursión
-- Estas políticas usan claims del JWT para otorgar permisos de admin/supervisor
-- Asegúrate de que el token incluya 'role' y, para supervisor, 'station'

DROP POLICY IF EXISTS "Admins JWT can view all profiles" ON user_profiles;
CREATE POLICY "Admins JWT can view all profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins JWT can update profiles" ON user_profiles;
CREATE POLICY "Admins JWT can update profiles"
ON user_profiles
FOR UPDATE
TO authenticated
USING ((auth.jwt() ->> 'role') = 'admin')
WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Supervisors JWT can view station profiles" ON user_profiles;
CREATE POLICY "Supervisors JWT can view station profiles"
ON user_profiles
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role') = 'supervisor'
  AND (auth.jwt() ->> 'station') = user_profiles.station
);
