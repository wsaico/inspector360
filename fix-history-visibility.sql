-- Function to fetch safety talk history via RPC
-- This bypasses RLS policies on the joined tables while enforcing role-based logic manually
-- Guarantees Admins can see all records.

CREATE OR REPLACE FUNCTION get_completed_talks()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_user_station text;
  v_result json;
BEGIN
  -- Get current user context
  SELECT role, station INTO v_user_role, v_user_station
  FROM user_profiles
  WHERE id = auth.uid();

  -- Query logic
  SELECT json_agg(t) INTO v_result FROM (
    SELECT 
      te.*,
      -- Construct presenter object matching frontend expectation
      json_build_object('full_name', e.full_name) as presenter,
      -- Construct schedule object matching frontend expectation
      json_build_object(
        'bulletin', CASE WHEN b.id IS NOT NULL THEN json_build_object(
          'title', b.title,
          'code', b.code,
          'alert_level', b.alert_level
        ) ELSE NULL END
      ) as schedule
    FROM talk_executions te
    LEFT JOIN employees e ON te.presenter_id = e.id
    LEFT JOIN talk_schedules ts ON te.schedule_id = ts.id
    LEFT JOIN bulletins b ON ts.bulletin_id = b.id
    WHERE 
      -- Logic: Admin sees all, Supervisors/Others see only their station
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
        AND (up.role = 'admin' OR up.station = te.station_code)
      )
    ORDER BY te.executed_at DESC
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;
