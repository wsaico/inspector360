-- ============================================
-- MIGRACIÓN: Habilitar estaciones dinámicas (usar tabla stations)
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1) Crear tabla stations si no existe
CREATE TABLE IF NOT EXISTS public.stations (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Poblar estaciones base (si la tabla está vacía o faltan)
INSERT INTO public.stations (code, name, is_active)
SELECT * FROM (VALUES
  ('AQP','Arequipa',true),
  ('CUZ','Cusco',true),
  ('CIX','Chiclayo',true),
  ('TRU','Trujillo',true),
  ('CJA','Cajamarca',true),
  ('TPP','Tarapoto',true),
  ('PIU','Piura',true)
) AS v(code,name,is_active)
ON CONFLICT (code) DO NOTHING;

-- 3) Backfill: insertar en stations todos los códigos ya usados por users/inspections
INSERT INTO public.stations (code, name, is_active)
SELECT s.station AS code,
       CASE s.station
         WHEN 'AQP' THEN 'Arequipa'
         WHEN 'CUZ' THEN 'Cusco'
         WHEN 'CIX' THEN 'Chiclayo'
         WHEN 'TRU' THEN 'Trujillo'
         WHEN 'CJA' THEN 'Cajamarca'
         WHEN 'TPP' THEN 'Tarapoto'
         WHEN 'PIU' THEN 'Piura'
         ELSE s.station
       END AS name,
       true AS is_active
FROM (
  SELECT DISTINCT station FROM public.users WHERE station IS NOT NULL
  UNION
  SELECT DISTINCT station FROM public.inspections WHERE station IS NOT NULL
) s
WHERE NOT EXISTS (
  SELECT 1 FROM public.stations st WHERE st.code = s.station
);

-- 4) Quitar CHECK estáticos en users.station e inspections.station (si existen)
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_station_check;
ALTER TABLE IF EXISTS public.inspections DROP CONSTRAINT IF EXISTS inspections_station_check;

-- 5) Agregar llaves foráneas a stations(code)
-- Si ya existen, no volver a crearlas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_station_fk'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_station_fk FOREIGN KEY (station)
      REFERENCES public.stations(code) ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inspections_station_fk'
  ) THEN
    ALTER TABLE public.inspections
      ADD CONSTRAINT inspections_station_fk FOREIGN KEY (station)
      REFERENCES public.stations(code) ON UPDATE CASCADE;
  END IF;
END $$;

-- 6) Índices (por si no existen)
CREATE INDEX IF NOT EXISTS idx_users_station ON public.users(station);
CREATE INDEX IF NOT EXISTS idx_inspections_station ON public.inspections(station);

-- 7) Nota: RLS y políticas existentes continúan funcionando porque comparan por igualdad de station.