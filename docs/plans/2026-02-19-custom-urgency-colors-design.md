# Custom Urgency Colors — Design

**Date:** 2026-02-19
**Status:** Approved

## Summary

Add a "Custom" color scheme option in Settings that lets users pick fill, ring, and text colors for each of the 12 urgency tiers using native RGB color pickers. Defaults to the green-as-urgent preset on signup.

---

## Data Model

### New type (`types/index.ts`)
```ts
export type CustomUrgencyColors = Record<UrgencyLevel, { fill: string; border: string; text: string }>
```

### Settings table (migration 007)
```sql
ALTER TABLE settings ADD COLUMN IF NOT EXISTS custom_urgency_colors JSONB;
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_urgency_color_scheme_check;
ALTER TABLE settings ADD CONSTRAINT settings_urgency_color_scheme_check
  CHECK (urgency_color_scheme IN ('green_urgent', 'red_urgent', 'custom'));
```

### `Settings` interface updates
- `urgency_color_scheme: 'green_urgent' | 'red_urgent' | 'custom'`
- `custom_urgency_colors: CustomUrgencyColors | null`

Default on signup: `urgency_color_scheme = 'green_urgent'`, `custom_urgency_colors = null`.

---

## `lib/urgency.ts`

- `getUrgencyInfo` accepts `colorScheme?: 'green_urgent' | 'red_urgent' | 'custom'` and `customColors?: CustomUrgencyColors`
- `buildCustomConfig(customColors)` merges custom fill/border/text onto green_urgent sizePct values
- Exported `getDefaultCustomColors(scheme)` returns a `CustomUrgencyColors` from either preset

---

## Settings UI

Color scheme radio gains a third option: **🎨 Custom**

When active, a compact table card appears:
- Reset buttons: *Reset to Green* / *Reset to Red*
- 12 rows, one per tier (overdue → no_date)
  - Live swatch (fill + border)
  - Tier label
  - Three `<input type="color">` pickers: Fill, Ring, Text

Changes held in state, persisted on **Save settings**.

---

## Component threading

`customColors?: CustomUrgencyColors` added alongside `colorScheme` to:
- `BubbleBoard` → `BubbleCard`
- `ListView` → `ListRow`
- `BoardClient` reads both from `initialSettings`
