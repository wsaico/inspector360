-- ============================================
-- MIGRACIÓN: Usuarios Existentes a user_profiles
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Insertar usuarios existentes de auth.users a user_profiles
-- (solo si no existen ya)
INSERT INTO user_profiles (id, email, full_name, role, station, phone, is_active, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'admin') as role,
  au.raw_user_meta_data->>'station' as station,
  au.raw_user_meta_data->>'phone' as phone,
  true as is_active,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = au.id
);

-- 2. Verificar los perfiles creados
SELECT
  id,
  email,
  full_name,
  role,
  station,
  is_active,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- 3. Si necesitas actualizar el rol de un usuario específico a admin:
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
