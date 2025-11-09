-- =====================================================
-- FIX: Actualizar trigger para guardar station y phone
-- Corrige el problema de que las estaciones no se guardan
-- =====================================================

-- Actualizar la función del trigger para incluir station y phone
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
    -- Guardar la estación desde raw_user_meta_data
    NULLIF(NEW.raw_user_meta_data->>'station', ''),
    -- Guardar el teléfono desde raw_user_meta_data
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que el trigger está activo
SELECT
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- =====================================================
-- ✅ TRIGGER ACTUALIZADO
--
-- Ahora cuando crees un usuario:
-- 1. El rol se guardará correctamente (incluyendo operador y mecanico)
-- 2. La estación se guardará correctamente
-- 3. El teléfono se guardará correctamente
-- =====================================================
