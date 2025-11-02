-- ============================================
-- Actualizar nombres de usuarios
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Ver los usuarios actuales
SELECT id, email, full_name, role FROM user_profiles;

-- Actualizar el nombre del admin principal
UPDATE user_profiles
SET full_name = 'Administrador Principal'
WHERE email = 'admin@inspector360.com';

-- Actualizar el otro usuario si es necesario
UPDATE user_profiles
SET full_name = 'Willy Saico'
WHERE email = 'willysaico@gmail.com';

-- Verificar los cambios
SELECT id, email, full_name, role, station FROM user_profiles;
