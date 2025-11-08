-- ============================================
-- ⚡ FIX CRÍTICO: Limpiar Políticas RLS Lentas
-- y Crear UNA SOLA Política Optimizada
-- ============================================

-- PROBLEMA: Tienes 12 políticas SELECT que hacen subqueries lentos
-- SOLUCIÓN: 1 sola política usando JWT (instantánea)

-- ============================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS VIEJAS
-- ============================================

DROP POLICY IF EXISTS "Anyone can read inspections" ON inspections;
DROP POLICY IF EXISTS "Authenticated users can insert inspections" ON inspections;
DROP POLICY IF EXISTS "Create inspections" ON inspections;
DROP POLICY IF EXISTS "Delete inspections" ON inspections;
DROP POLICY IF EXISTS "Only admins can delete inspections" ON inspections;
DROP POLICY IF EXISTS "Update inspections" ON inspections;
DROP POLICY IF EXISTS "Users can create inspections for their station" ON inspections;
DROP POLICY IF EXISTS "Users can delete own inspections" ON inspections;
DROP POLICY IF EXISTS "Users can update own inspections" ON inspections;
DROP POLICY IF EXISTS "Users can update own station inspections" ON inspections;
DROP POLICY IF EXISTS "Users can view own station inspections" ON inspections;
DROP POLICY IF EXISTS "View inspections by role" ON inspections;
DROP POLICY IF EXISTS "Optimized select for inspections" ON inspections;

-- ============================================
-- PASO 2: CREAR POLÍTICAS OPTIMIZADAS CON JWT
-- ============================================

-- ✅ SELECT: Optimizado con JWT (SIN subqueries)
CREATE POLICY "Optimized SELECT with JWT"
ON inspections
FOR SELECT
TO authenticated
USING (
  -- Admin ve TODO
  (auth.jwt() ->> 'role') = 'admin'
  OR
  -- Supervisor ve su estación
  (
    (auth.jwt() ->> 'role') = 'supervisor'
    AND station = (auth.jwt() ->> 'station')
  )
  OR
  -- Inspector ve su estación
  (
    (auth.jwt() ->> 'role') = 'inspector'
    AND station = (auth.jwt() ->> 'station')
  )
  OR
  -- SIG ve TODO
  (auth.jwt() ->> 'role') = 'sig'
);

-- ✅ INSERT: Solo usuarios autenticados
CREATE POLICY "Optimized INSERT with JWT"
ON inspections
FOR INSERT
TO authenticated
WITH CHECK (
  -- Verificar que la estación coincida con el usuario (excepto admin)
  (auth.jwt() ->> 'role') = 'admin'
  OR
  station = (auth.jwt() ->> 'station')
);

-- ✅ UPDATE: Solo admin y supervisor de la estación
CREATE POLICY "Optimized UPDATE with JWT"
ON inspections
FOR UPDATE
TO authenticated
USING (
  (auth.jwt() ->> 'role') = 'admin'
  OR
  (
    (auth.jwt() ->> 'role') = 'supervisor'
    AND station = (auth.jwt() ->> 'station')
  )
)
WITH CHECK (
  (auth.jwt() ->> 'role') = 'admin'
  OR
  (
    (auth.jwt() ->> 'role') = 'supervisor'
    AND station = (auth.jwt() ->> 'station')
  )
);

-- ✅ DELETE: Solo admin
CREATE POLICY "Optimized DELETE with JWT"
ON inspections
FOR DELETE
TO authenticated
USING (
  (auth.jwt() ->> 'role') = 'admin'
);

-- ============================================
-- PASO 3: VERIFICAR POLÍTICAS CREADAS
-- ============================================

SELECT
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE tablename = 'inspections'
ORDER BY cmd, policyname;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================

-- ANTES: 12 políticas con subqueries lentos
-- DESPUÉS: 4 políticas optimizadas con JWT
-- VELOCIDAD: 10-50x más rápido (sin subqueries a user_profiles)
