-- Run this in your Supabase SQL editor or via Supabase CLI

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL CHECK (char_length(name) > 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boards_user ON boards(user_id);

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_boards" ON boards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add board_id to tasks (nullable so existing tasks are not broken)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE SET NULL;

-- Add theme to settings (defaults to light)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light'
  CHECK (theme IN ('light', 'dark'));
