-- Called by the archive-expired-tasks Edge Function on a daily cron schedule.
-- Archives tasks whose due_date has passed the user's configured expiration_days window.
CREATE OR REPLACE FUNCTION archive_expired_tasks()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE tasks t
  SET status = 'archived', archived_at = now()
  FROM settings s
  WHERE t.user_id = s.user_id
    AND t.status = 'active'
    AND t.for_later = false
    AND t.due_date IS NOT NULL
    AND t.due_date < (now() - (s.expiration_days || ' days')::interval)::date;
END;
$$;
