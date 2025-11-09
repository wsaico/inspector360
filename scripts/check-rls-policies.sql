-- Verificar políticas RLS en user_profiles
-- Ejecutar en Supabase SQL Editor

-- Ver las políticas actuales
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

-- Verificar si RLS está habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'user_profiles';

-- Intentar consulta directa como lo hace la app
SELECT full_name, is_active, email
FROM public.user_profiles
WHERE email = 'wilbersaico@gmail.com';

-- Intentar con ILIKE (case insensitive)
SELECT full_name, is_active, email
FROM public.user_profiles
WHERE email ILIKE 'wilbersaico@gmail.com';
