-- Ensure the column exists (handles case where migration 006 was not run)
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS urgency_color_scheme TEXT DEFAULT 'green_urgent';

-- Drop old 2-value check constraint if it exists (left by migration 006)
ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS settings_urgency_color_scheme_check;

-- Add updated constraint that includes 'custom'
ALTER TABLE settings
  ADD CONSTRAINT settings_urgency_color_scheme_check
  CHECK (urgency_color_scheme IN ('green_urgent', 'red_urgent', 'custom'));

-- Add custom colors column
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS custom_urgency_colors JSONB;
