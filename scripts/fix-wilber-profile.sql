-- =====================================================
-- Script para agregar perfil de Wilber Saico
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- PASO 1: Obtener el UUID del usuario desde auth.users
-- Copia el resultado de esta consulta (el UUID)
SELECT id, email, created_at FROM auth.users WHERE email = 'wilbersaico@gmail.com';

-- PASO 2: Copiar el UUID de arriba y pegarlo en la línea que dice 'PEGAR_UUID_AQUI'
-- Luego ejecutar este INSERT

-- Insertar perfil en user_profiles usando el UUID del usuario autenticado
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
SELECT
  id,  -- Usa el mismo ID del usuario en auth.users
  'wilbersaico@gmail.com',
  'Wilber Saico',
  'admin',
  true,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'wilbersaico@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- PASO 3: Verificar que se insertó correctamente
SELECT
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.is_active,
  au.email as auth_email,
  up.created_at
FROM user_profiles up
INNER JOIN auth.users au ON up.id = au.id
WHERE up.email = 'wilbersaico@gmail.com';

-- =====================================================
-- INSTRUCCIONES:
--
-- 1. Ve a Supabase Dashboard
-- 2. Abre el SQL Editor
-- 3. Ejecuta SOLO la consulta del PASO 1 primero
-- 4. Verifica que aparezca tu usuario
-- 5. Ejecuta el INSERT del PASO 2
-- 6. Ejecuta la verificación del PASO 3
-- 7. Intenta hacer login nuevamente
-- =====================================================
