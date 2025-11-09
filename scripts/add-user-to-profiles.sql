-- Script para agregar usuario a user_profiles
-- Ejecutar en Supabase SQL Editor

-- Insertar usuario Wilber Saico
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
VALUES (
  -- Reemplaza este UUID con el ID real del usuario desde auth.users
  -- Para obtenerlo, ejecuta: SELECT id, email FROM auth.users WHERE email = 'wilbersaico@gmail.com';
  'REEMPLAZAR_CON_UUID_REAL',
  'wilbersaico@gmail.com',
  'Wilber Saico',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verificar que se insertó correctamente
SELECT * FROM user_profiles WHERE email = 'wilbersaico@gmail.com';
