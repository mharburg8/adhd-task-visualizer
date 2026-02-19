-- Settings table (one row per user)
CREATE TABLE IF NOT EXISTS settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  expiration_days  INT DEFAULT 14 CHECK (expiration_days > 0),
  date_format      TEXT DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY')),
  google_calendar_enabled BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name           TEXT NOT NULL CHECK (char_length(name) > 0),
  details        TEXT,
  due_date       DATE,
  for_later      BOOLEAN DEFAULT false NOT NULL,
  status         TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')) NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
  archived_at    TIMESTAMPTZ,
  google_event_id TEXT
);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status = 'active';

-- Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_settings" ON settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create settings row on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Function used by auto-archive Edge Function
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
