-- Add 'electric_green' to the urgency_color_scheme check constraint
ALTER TABLE settings
  DROP CONSTRAINT IF EXISTS settings_urgency_color_scheme_check;

ALTER TABLE settings
  ADD CONSTRAINT settings_urgency_color_scheme_check
  CHECK (urgency_color_scheme IN ('green_urgent', 'red_urgent', 'electric_green', 'custom'));
