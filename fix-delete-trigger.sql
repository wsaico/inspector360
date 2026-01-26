-- Trigger function to revert schedule status
CREATE OR REPLACE FUNCTION public.handle_execution_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.schedule_id IS NOT NULL THEN
        UPDATE public.talk_schedules
        SET is_completed = false,
            executed_at = NULL
        WHERE id = OLD.schedule_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS revert_schedule_on_delete ON public.talk_executions;
CREATE TRIGGER revert_schedule_on_delete
    AFTER DELETE ON public.talk_executions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_execution_delete();
