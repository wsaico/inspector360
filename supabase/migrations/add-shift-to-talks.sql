-- Add shift column to talk_executions table
ALTER TABLE talk_executions 
ADD COLUMN IF NOT EXISTS shift TEXT CHECK (shift IN ('MAÑANA', 'TARDE', 'NOCHE'));

COMMENT ON COLUMN talk_executions.shift IS 'Turno de la charla: MAÑANA, TARDE, NOCHE';
