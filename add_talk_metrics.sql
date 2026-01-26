-- Add timing and headcount columns to talk_executions
ALTER TABLE public.talk_executions
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_headcount INTEGER DEFAULT 0;
