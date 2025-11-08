-- ============================================
-- PRUEBA: Verificar que hay datos en inspections
-- ============================================

-- 1. Ver cuántas inspecciones hay en TOTAL
SELECT COUNT(*) as total_inspecciones FROM inspections;

-- 2. Ver las últimas 5 inspecciones
SELECT
    id,
    form_code,
    station,
    inspection_date,
    inspector_name,
    created_at
FROM inspections
ORDER BY created_at DESC
LIMIT 5;

-- 3. Ver cuántas inspecciones por estación
SELECT
    station,
    COUNT(*) as total
FROM inspections
GROUP BY station
ORDER BY total DESC;

-- 4. Verificar RLS - ¿Está habilitado?
SELECT
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'inspections';

-- 5. Ver las políticas RLS activas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'inspections';
