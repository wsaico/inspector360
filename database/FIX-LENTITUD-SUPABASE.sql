-- ============================================
-- ⚡ SOLUCIÓN DEFINITIVA A LENTITUD EXTREMA
-- Inspector360 - VERSIÓN PARA SUPABASE SQL EDITOR
-- ============================================

-- INSTRUCCIONES:
-- 1. Copia TODO este archivo (Ctrl+A, Ctrl+C)
-- 2. Ve a Supabase Dashboard → SQL Editor → New Query
-- 3. Pega este código (Ctrl+V)
-- 4. Click en "RUN" (esquina inferior derecha)
-- 5. Espera que termine (30-60 segundos)
-- 6. Recarga tu aplicación - debería ser 10x más rápida

-- ============================================
-- PARTE 1: ÍNDICES CRÍTICOS
-- ============================================

-- Índice para filtrado por estación (query más usado)
CREATE INDEX IF NOT EXISTS idx_inspections_station
ON inspections(station);

-- Índice para ordenamiento por fecha
CREATE INDEX IF NOT EXISTS idx_inspections_created_at
ON inspections(created_at DESC);

-- Índice COMPUESTO para query principal: estación + fecha
-- ⭐ Este es EL MÁS IMPORTANTE - combina filtro y orden
CREATE INDEX IF NOT EXISTS idx_inspections_station_created
ON inspections(station, created_at DESC);

-- Índice para código de formulario
CREATE INDEX IF NOT EXISTS idx_inspections_form_code
ON inspections(form_code);

-- Índice para tipo de inspección
CREATE INDEX IF NOT EXISTS idx_inspections_type
ON inspections(inspection_type);

-- Índice para user_profiles por estación
CREATE INDEX IF NOT EXISTS idx_user_profiles_station
ON user_profiles(station);

-- Índice para equipment por inspección (si existe la tabla)
CREATE INDEX IF NOT EXISTS idx_equipment_inspection_id
ON equipment(inspection_id);

-- ============================================
-- PARTE 2: ANALYZE (Optimización de estadísticas)
-- ============================================

-- Optimiza las estadísticas de la base de datos
-- Esto ayuda al query planner a elegir los mejores índices
-- NOTA: VACUUM no se puede ejecutar en transacciones, pero ANALYZE sí

ANALYZE inspections;
ANALYZE user_profiles;
ANALYZE equipment;

-- ============================================
-- PARTE 3: VERIFICACIÓN
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
