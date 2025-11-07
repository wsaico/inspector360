-- ============================================
-- OPTIMIZACIÓN DE PERFORMANCE PARA SUPABASE
-- Inspector360 - Solución a lentitud extrema
-- ============================================

-- PROBLEMA: Queries lentos (3-5 segundos) especialmente en:
-- 1. Carga de inspecciones
-- 2. Filtrado por estación
-- 3. Ordenamiento por fecha

-- ============================================
-- PASO 1: ÍNDICES CRÍTICOS
-- ============================================

-- Índice para filtrar inspecciones por estación (query más común)
CREATE INDEX IF NOT EXISTS idx_inspections_station
ON inspections(station);

-- Índice para ordenar por fecha de creación (siempre se ordena por esto)
CREATE INDEX IF NOT EXISTS idx_inspections_created_at
ON inspections(created_at DESC);

-- Índice compuesto para la query principal: estación + fecha
CREATE INDEX IF NOT EXISTS idx_inspections_station_created
ON inspections(station, created_at DESC);

-- Índice para búsqueda por inspector
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id
ON inspections(inspector_id);

-- Índice para búsqueda por código de formulario
CREATE INDEX IF NOT EXISTS idx_inspections_form_code
ON inspections(form_code);

-- Índice para filtrar por tipo de inspección
CREATE INDEX IF NOT EXISTS idx_inspections_type
ON inspections(inspection_type);

-- Índice para user_profiles (búsqueda por estación)
CREATE INDEX IF NOT EXISTS idx_user_profiles_station
ON user_profiles(station);

-- Índice para user_profiles (búsqueda por rol)
CREATE INDEX IF NOT EXISTS idx_user_profiles_role
ON user_profiles(role);

-- ============================================
-- PASO 2: ANALIZAR RLS POLICIES LENTOS
-- ============================================

-- Ver los policies actuales de inspecciones
-- Ejecutar esto para ver si hay policies complejos:
-- SELECT * FROM pg_policies WHERE tablename = 'inspections';

-- ============================================
-- PASO 3: VACUUM Y ANALYZE (Mantenimiento)
-- ============================================

-- Optimizar tabla de inspecciones
VACUUM ANALYZE inspections;

-- Optimizar tabla de user_profiles
VACUUM ANALYZE user_profiles;

-- Optimizar tabla de equipment
VACUUM ANALYZE equipment;

-- ============================================
-- PASO 4: VERIFICAR ESTADÍSTICAS
-- ============================================

-- Ver índices existentes en inspections
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'inspections'
ORDER BY indexname;

-- Ver tamaño de tabla e índices
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('inspections', 'user_profiles', 'equipment')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Ver queries más lentos (si tienes acceso a pg_stat_statements)
-- SELECT
--     query,
--     calls,
--     total_time,
--     mean_time
-- FROM pg_stat_statements
-- WHERE query LIKE '%inspections%'
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================

-- 1. Ejecutar estos comandos en el SQL Editor de Supabase
-- 2. Los índices se crean de forma NO BLOQUEANTE (no afecta usuarios)
-- 3. VACUUM puede tardar varios minutos en tablas grandes
-- 4. Monitorear el uso de espacio después de crear índices

-- IMPACTO ESPERADO:
-- - Queries de inspecciones: 3-5s → 200-500ms (10x más rápido)
-- - Filtrado por estación: instantáneo
-- - Paginación: sin lag
-- - Plan FREE sigue siendo viable

-- ============================================
-- EJECUCIÓN RECOMENDADA:
-- ============================================

-- 1. Copiar todo este archivo
-- 2. Ir a Supabase Dashboard → SQL Editor
-- 3. Pegar y ejecutar
-- 4. Esperar confirmación
-- 5. Probar la aplicación - debería ser MUCHO más rápida
