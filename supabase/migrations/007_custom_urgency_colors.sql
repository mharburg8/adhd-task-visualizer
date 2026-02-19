-- Add storage for per-tier custom colors
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS custom_urgency_colors JSONB;

-- Widen urgency_color_scheme to also allow 'custom'
ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS settings_urgency_color_scheme_check;

ALTER TABLE settings
  ADD CONSTRAINT settings_urgency_color_scheme_check
    CHECK (urgency_color_scheme IN ('green_urgent', 'red_urgent', 'custom'));
