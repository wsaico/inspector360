-- =====================================================
-- Agregar nuevos roles: operador y mecanico
-- Estos roles tienen los mismos permisos que supervisor
-- =====================================================

-- 1. Actualizar la función del trigger para aceptar los nuevos roles
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
    -- Validar que el rol sea uno de los permitidos, por defecto 'inspector'
    CASE
      WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'supervisor', 'inspector', 'sig', 'operador', 'mecanico')
      THEN NEW.raw_user_meta_data->>'role'
      ELSE 'inspector'
    END,
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Verificar roles existentes
SELECT
  role,
  COUNT(*) as total_usuarios,
  STRING_AGG(full_name, ', ') as usuarios
FROM public.user_profiles
GROUP BY role
ORDER BY role;

-- =====================================================
-- ✅ NUEVOS ROLES AGREGADOS
--
-- Los roles disponibles ahora son:
-- - admin: Administrador (acceso total)
-- - supervisor: Supervisor (permisos de gestión)
-- - inspector: Inspector (solo creación)
-- - sig: SIG (solo visualización y reportes)
-- - operador: Operador (permisos igual que supervisor)
-- - mecanico: Mecánico (permisos igual que supervisor)
-- =====================================================
