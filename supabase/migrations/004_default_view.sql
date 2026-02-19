ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS default_view TEXT DEFAULT 'bubble'
    CHECK (default_view IN ('bubble', 'list'));
