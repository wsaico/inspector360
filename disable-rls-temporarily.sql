-- ============================================
-- SOLUCIÓN TEMPORAL: DESHABILITAR RLS COMPLETAMENTE
-- Esto te permitirá acceder mientras arreglamos las políticas
-- ============================================

-- DESHABILITAR RLS EN user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Verificar que RLS está deshabilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_profiles';
