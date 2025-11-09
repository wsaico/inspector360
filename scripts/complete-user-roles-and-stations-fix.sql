-- =====================================================
-- MIGRACIÓN COMPLETA: Roles Operador/Mecánico + Estaciones
-- Ejecutar SOLO UNA VEZ en Supabase SQL Editor
-- =====================================================

BEGIN;

-- 1. Actualizar constraint de roles en user_profiles
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'supervisor', 'inspector', 'sig', 'operador', 'mecanico'));

-- 2. Actualizar trigger para guardar station, phone y nuevos roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar perfil automáticamente con datos del usuario autenticado
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    station,
    phone,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    -- Validar que el rol sea uno de los permitidos, por defecto 'inspector'
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'supervisor', 'inspector', 'sig', 'operador', 'mecanico')
      THEN NEW.raw_user_meta_data->>'role'
      ELSE 'inspector'
    END,
    -- Guardar la estación desde raw_user_meta_data (NULL si está vacío)
    NULLIF(NEW.raw_user_meta_data->>'station', ''),
    -- Guardar el teléfono desde raw_user_meta_data (NULL si está vacío)
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- 3. Verificaciones
-- Verificar constraint de roles
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.user_profiles'::regclass
  AND conname = 'user_profiles_role_check';

-- Verificar trigger
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Verificar roles existentes
SELECT
  role,
  COUNT(*) as total_usuarios,
  STRING_AGG(full_name, ', ') as usuarios
FROM public.user_profiles
GROUP BY role
ORDER BY role;

-- =====================================================
-- ✅ MIGRACIÓN COMPLETADA
--
-- Cambios aplicados:
-- 1. Constraint de roles actualizado (admin, supervisor, inspector, sig, operador, mecanico)
-- 2. Trigger actualizado para guardar station y phone correctamente
-- 3. Nuevos usuarios se crearán con todos los datos correctos
--
-- Ahora puedes:
-- - Crear usuarios con roles operador y mecanico
-- - Asignar estaciones a operadores y mecánicos
-- - Las estaciones se guardarán correctamente en la base de datos
-- =====================================================
