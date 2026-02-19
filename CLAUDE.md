# ADHD Task Visualizer — Claude Code Instructions

## Project Overview

ADHD-friendly task management web app with animated bubble view, urgency-based visual system, and Supabase backend.

**Stack:** Next.js 14 (App Router) · TypeScript · Supabase (PostgreSQL + Auth + Realtime) · Tailwind CSS · Google Calendar API (optional per-user feature)

---

## For Changes to the App

- Do not ask for approval before implementing requested changes — execute directly.
- Do not refactor, clean up, or improve code beyond exactly what was requested.
- Do not add comments, docstrings, or type annotations to code you didn't touch.
- Do not add error handling for scenarios that cannot happen in normal use.
- Keep solutions minimal — the right amount of code is the least amount that works.

---

## Architecture

- **Data mutations:** Next.js Server Actions only — no API routes.
- **Initial data load:** Supabase server client in Server Components (SSR).
- **Live updates:** Supabase Realtime browser client subscription only.
- **Auth:** Supabase Auth — all data access governed by Row Level Security (RLS).

## Key Files

| Path | Purpose |
|------|---------|
| `app/actions/tasks.ts` | All task mutations (create, update, archive, delete) |
| `app/actions/settings.ts` | User settings mutations |
| `lib/urgency.ts` | Urgency score calculation, ring progress formula |
| `lib/supabase/server.ts` | Supabase server client factory |
| `lib/supabase/client.ts` | Supabase browser client (Realtime only) |
| `components/bubble-board/RadialRingTimer.tsx` | SVG countdown ring around bubble edge |
| `components/bubble-board/BubbleCard.tsx` | Individual animated bubble |
| `components/bubble-board/BubbleBoard.tsx` | Radial layout engine |

---

## Bubble Radial Ring Timer

Each bubble has an SVG ring around its circumference that counts down to the due date.

**Behavior:**
- Full ring = task just created (maximum time remaining)
- Ring drains clockwise as due date approaches
- Ring fully disappears when the task is overdue
- Overdue bubbles: empty ring + pulsing opacity (0.4→1.0, 1.5s interval)
- No ring rendered if `due_date` is null or `for_later = true`

**Ring progress formula:**
```ts
const totalDuration = differenceInDays(due_date, created_at)
const elapsed       = differenceInDays(today, created_at)
const ringProgress  = clamp(1 - elapsed / totalDuration, 0, 1)

// SVG
const circumference   = 2 * Math.PI * radius
const strokeDashoffset = circumference * (1 - ringProgress)
```

**SVG style:**
- `strokeWidth`: 4px (SM bubbles), 6px (LG/XL bubbles)
- `stroke`: matches the bubble's urgency color token
- `transition: stroke-dashoffset 0.6s ease` for smooth animation
- Positioned as an absolute overlay inside `BubbleCard`

---

## Urgency System

Computed from `due_date` vs today in `lib/urgency.ts`:

| Days Remaining | Score | CSS Token             | Appearance         |
|----------------|-------|-----------------------|--------------------|
| Overdue (< 0)  | 1.0   | `--color-overdue`     | coral, pulsing     |
| 0–1            | 0.85  | `--color-tomorrow`    | amber              |
| 1–5            | 0.6   | `--color-soon`        | mint green         |
| 5–14           | 0.3   | `--color-upcoming`    | sky blue           |
| > 14           | 0.1   | `--color-future`      | light blue         |
| for_later      | —     | `--color-for-later`   | lavender, no ring  |

**Bubble diameter:** `80 + (120 × urgencyScore)` → range 80px–200px

---

## Color Tokens

```css
--color-overdue:   #FF8A80;
--color-tomorrow:  #FFD180;
--color-soon:      #B9F6CA;
--color-upcoming:  #80D8FF;
--color-future:    #B3E5FC;
--color-for-later: #CE93D8;
--color-surface:   #FAFAFA;
--color-text:      #1A1A2E;
```

---

## Database Schema (Supabase)

```sql
-- tasks
id, user_id, name, details, due_date, for_later, status, created_at, archived_at

-- settings
id, user_id, expiration_days (default 14), date_format (default 'MM/DD/YYYY')
```

RLS enabled on both tables. Users only access rows where `user_id = auth.uid()`.

---

## Conventions

- Use `date-fns` for all date math — no manual day calculations.
- Bubble animations use CSS `transform` only — never animate `top`/`left`/`width`.
- Skeleton loaders instead of spinners throughout.
- `@media (prefers-reduced-motion)` must disable all float, pulse, and ring animations.
- Minimum tap target: 48×48px on all interactive elements.
- WCAG AA contrast required on all urgency color combinations.

---

---

## Google Calendar Integration

Optional per-user feature. When enabled, a task can be pushed to the user's Google Calendar as an **event** (not a Google Task).

**Auth flow:**
- User enables via Supabase Google OAuth (`provider: 'google'` with `scopes: 'https://www.googleapis.com/auth/calendar.events'`)
- Supabase stores the Google OAuth `provider_token` and `provider_refresh_token` on the session
- Store `google_calendar_enabled: boolean` in the `settings` table

**Schema addition:**
```sql
ALTER TABLE settings ADD COLUMN google_calendar_enabled BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN google_event_id TEXT;  -- stores created event ID for updates/deletes
```

**Calendar push behavior:**
- When a task has a `due_date` AND the user has `google_calendar_enabled = true`, show a "Add to Google Calendar" button in the TaskModal
- On click: call `app/actions/calendar.ts` → `createCalendarEvent(taskId)` Server Action
- The Server Action calls the Google Calendar API (`POST /calendars/primary/events`) with:
  - `summary`: task name
  - `start.date` / `end.date`: due_date (all-day event)
  - `description`: task details
- Store the returned `event.id` in `tasks.google_event_id`
- If the task is updated (name, due_date, details), update the calendar event via `PATCH /calendars/primary/events/{eventId}`
- If the task is archived/deleted and `google_event_id` is set, delete the calendar event

**Key files:**
| Path | Purpose |
|------|---------|
| `app/actions/calendar.ts` | `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent` |
| `lib/google-calendar.ts` | Google Calendar API helper (builds fetch calls with OAuth token) |

**Token refresh:**
- The `provider_token` expires — use `provider_refresh_token` with `POST https://oauth2.googleapis.com/token` to refresh
- Handle `401` from Google Calendar API by refreshing token and retrying once
- Google OAuth must have Calendar scope enabled in Supabase Dashboard → Auth → Providers → Google

**Settings UI:**
- Add a toggle row in the Settings page: "Sync to Google Calendar"
- Toggling on triggers the Google OAuth flow if not already authorized
- Toggling off sets `google_calendar_enabled = false` (does not delete existing events)

---

## Design Reference

Full design document: `docs/plans/2026-02-18-adhd-task-visualizer-design.md`
