-- ============================================
-- DIAGNÓSTICO RÁPIDO: Autenticación y RLS de perfiles
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ============================================

-- 1) Comprobar estructura y RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- 2) Ver políticas activas
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles'
ORDER BY policyname;

-- 3) Asegurar índices críticos
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- 4) Política mínima para leer el propio perfil (si faltara)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'Users can view own profile'
  ) THEN
    EXECUTE $$
      CREATE POLICY "Users can view own profile"
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
    $$;
  END IF;
END$$;

-- 5) Prueba de acceso: leer perfil propio
-- Debe devolver una fila si estás autenticado con ese usuario
SELECT id, email, full_name, role, station, is_active
FROM user_profiles
WHERE id = auth.uid();

-- 6) Si necesitas deshabilitar RLS temporalmente para pruebas:
--    (usa sólo como medida de diagnóstico)
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_profiles';

-- ============================================
-- FIN
-- ============================================