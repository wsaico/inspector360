-- =====================================================
-- Fix: Expandir constraint de roles en public.user_profiles
-- Ejecutar en el SQL Editor de Supabase
-- Objetivo: permitir roles 'sig', 'operador' y 'mecanico'
-- =====================================================

BEGIN;

-- 1) Eliminar constraint anterior si existe
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2) Crear constraint actualizado con todos los roles soportados
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'supervisor', 'inspector', 'sig', 'operador', 'mecanico'));

COMMIT;

-- 3) Verificar el constraint
SELECT con.conname AS constraint_name,
       pg_get_constraintdef(con.oid) AS definition
FROM   pg_constraint con
JOIN   pg_class rel ON rel.oid = con.conrelid
JOIN   pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE  nsp.nspname = 'public'
  AND  rel.relname = 'user_profiles'
  AND  con.contype = 'c';

-- 4) Verificar inserción con nuevo rol (prueba opcional)
-- INSERT INTO public.user_profiles (id, email, full_name, role)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'prueba+rol@ejemplo.com',
--   'Prueba Rol',
--   'operador'
-- );