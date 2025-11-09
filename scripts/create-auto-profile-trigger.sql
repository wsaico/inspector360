-- =====================================================
-- SOLUCIÓN PROFESIONAL: Auto-crear perfil de usuario
-- Trigger que automáticamente crea un perfil en user_profiles
-- cuando se registra un nuevo usuario en auth.users
-- =====================================================

-- 1. Crear función que se ejecutará cuando se cree un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar perfil automáticamente con datos del usuario autenticado
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'inspector'), -- Rol por defecto
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear trigger que ejecuta la función cuando se crea un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Migrar usuarios existentes que NO tienen perfil
-- Esto sincroniza todos los usuarios que ya existen en auth.users
-- pero que no tienen perfil en user_profiles
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'inspector') as role,
  true as is_active,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL -- Solo usuarios sin perfil
ON CONFLICT (id) DO NOTHING;

-- 4. Verificar que todos los usuarios tienen perfil
SELECT
  COUNT(*) as total_auth_users,
  (SELECT COUNT(*) FROM public.user_profiles) as total_profiles,
  COUNT(*) - (SELECT COUNT(*) FROM public.user_profiles) as sin_perfil
FROM auth.users;

-- =====================================================
-- ✅ TRIGGER CREADO EXITOSAMENTE
--
-- Ahora:
-- 1. Todos los usuarios existentes tienen perfil
-- 2. Nuevos usuarios automáticamente tendrán perfil
-- 3. No necesitas crear perfiles manualmente nunca más
-- =====================================================
