ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS urgency_color_scheme TEXT DEFAULT 'green_urgent'
    CHECK (urgency_color_scheme IN ('green_urgent', 'red_urgent', 'custom'));

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS custom_urgency_colors JSONB;
