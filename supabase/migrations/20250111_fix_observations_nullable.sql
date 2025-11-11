-- Permitir que obs_maintenance sea NULL
-- Esto permite que el operador guarde observaciones sin esperar la respuesta del mecánico
ALTER TABLE observations
ALTER COLUMN obs_maintenance DROP NOT NULL;

-- Agregar un comentario explicativo
COMMENT ON COLUMN observations.obs_maintenance IS 'Respuesta del mecánico a la observación del operador (opcional hasta que el mecánico responda)';
