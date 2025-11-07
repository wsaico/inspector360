-- ============================================
-- ⚡ SOLUCIÓN DEFINITIVA A LENTITUD EXTREMA
-- Inspector360 - Ejecutar en Supabase SQL Editor
-- ============================================

-- INSTRUCCIONES:
-- 1. Copia TODO este archivo
-- 2. Ve a Supabase Dashboard → SQL Editor → New Query
-- 3. Pega este código
-- 4. Click en "Run" (ejecutar)
-- 5. Espera 30-60 segundos
-- 6. Recarga tu aplicación - debería ser 10x más rápida

-- ============================================
-- PARTE 1: ÍNDICES CRÍTICOS (Lo más importante)
-- ============================================

-- Índice para filtrado por estación (query más usado)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_station
ON inspections(station);

-- Índice para ordenamiento por fecha
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_created_at
ON inspections(created_at DESC);

-- Índice COMPUESTO para query principal: estación + fecha
-- Este es EL MÁS IMPORTANTE - combina filtro y orden
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_station_created
ON inspections(station, created_at DESC);

-- Índice para búsquedas por inspector
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_inspector_id
ON inspections(inspector_id);

-- Índice para código de formulario (búsquedas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspections_form_code
ON inspections(form_code);

-- Índice para user_profiles por estación
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_station
ON user_profiles(station);

-- Índice para equipment por inspección
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_inspection_id
ON equipment(inspection_id);

-- ============================================
-- PARTE 2: OPTIMIZAR POLÍTICAS RLS
-- ============================================

-- Verificar que user_profiles use JWT (no subqueries lentos)
-- Si tienes políticas con SELECT * FROM user_profiles dentro del USING(),
-- son EXTREMADAMENTE lentas. Deben usar auth.jwt() como las de abajo:

-- Política optimizada para SELECT
DROP POLICY IF EXISTS "Optimized select for inspections" ON inspections;
CREATE POLICY "Optimized select for inspections"
ON inspections
FOR SELECT
TO authenticated
USING (
  -- Admin ve todo
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
  -- Usuario ve sus propias inspecciones
  inspector_id = auth.uid()
);

-- ============================================
-- PARTE 3: VACUUM Y ANALYZE (Mantenimiento)
-- ============================================

-- Esto optimiza las estadísticas de la base de datos
-- Puede tardar 1-2 minutos en tablas grandes

VACUUM ANALYZE inspections;
VACUUM ANALYZE user_profiles;
VACUUM ANALYZE equipment;

-- ============================================
-- PARTE 4: VERIFICACIÓN
-- ============================================

-- Ver índices creados
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('inspections', 'user_profiles', 'equipment')
ORDER BY tablename, indexname;

-- Ver tamaño de tablas e índices
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename IN ('inspections', 'user_profiles', 'equipment')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- RESULTADOS ESPERADOS:
-- ============================================

-- ANTES:
-- - Login: 3-5 segundos
-- - Cargar inspecciones: 3-5 segundos
-- - Navegar entre páginas: 2-3 segundos
-- - Filtrar: 3-5 segundos

-- DESPUÉS:
-- - Login: <500ms
-- - Cargar inspecciones: 200-500ms (10x más rápido)
-- - Navegar: instantáneo (usa cache)
-- - Filtrar: <300ms

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================

-- 1. CONCURRENTLY = No bloquea la base de datos
-- 2. IF NOT EXISTS = Seguro ejecutar múltiples veces
-- 3. Los índices usan espacio en disco (normal)
-- 4. Plan FREE de Supabase: 500MB límite (deberías estar bien)

-- ============================================
-- TROUBLESHOOTING:
-- ============================================

-- Si ves error "cannot create index concurrently in transaction block":
-- Ejecuta cada CREATE INDEX por separado, uno a la vez

-- Si ves "out of shared memory":
-- Es normal en plan FREE, espera 5 minutos y reintenta

-- ============================================
-- DESPUÉS DE EJECUTAR ESTO:
-- ============================================

-- 1. Recarga tu aplicación (Ctrl+Shift+R)
-- 2. Haz login
-- 3. Navega entre módulos
-- 4. DEBERÍA SER MUCHO MÁS RÁPIDO

-- Si sigue lento, el problema es:
-- - Latencia de red (Supabase lejos de tu ubicación)
-- - Necesitas upgrade a plan Pro (con mejor CPU)
-- - O cambiar a base de datos local/más cercana
