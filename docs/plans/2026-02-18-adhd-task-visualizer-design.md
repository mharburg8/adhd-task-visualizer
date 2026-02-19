# ADHD Task Visualizer — Design Document
**Date:** 2026-02-18
**Stack:** Next.js 14 (App Router) + Supabase (PostgreSQL + Auth) + TypeScript

---

## Architecture

### Approach: Server Actions + Supabase Realtime

- Next.js Server Actions handle all data mutations (no API routes needed)
- Supabase server client used in Server Components for initial data fetch (SSR)
- Supabase browser client used only for Realtime subscriptions (live updates)
- Row Level Security (RLS) enforced at DB level — users only access their own data

### File Structure

```
adhd-task-visualizer/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           ← sidebar + nav shell
│   │   ├── page.tsx             ← main board (bubble view default)
│   │   ├── for-later/page.tsx
│   │   ├── archived/page.tsx
│   │   └── settings/page.tsx
│   ├── actions/
│   │   ├── tasks.ts             ← createTask, updateTask, archiveTask, deleteTask
│   │   └── settings.ts          ← updateSettings
│   └── layout.tsx               ← Supabase session provider
├── components/
│   ├── bubble-board/
│   │   ├── BubbleBoard.tsx      ← container, radial layout algorithm
│   │   ├── BubbleCard.tsx       ← individual animated bubble + ring timer
│   │   └── RadialRingTimer.tsx  ← SVG countdown ring around bubble edge
│   ├── list-view/
│   │   ├── ListView.tsx
│   │   └── ListRow.tsx
│   ├── modals/
│   │   └── TaskModal.tsx
│   ├── nav/
│   │   └── Sidebar.tsx
│   └── ui/                      ← tokens, buttons, toggles, skeletons
├── lib/
│   ├── supabase/
│   │   ├── server.ts
│   │   └── client.ts
│   └── urgency.ts               ← urgency score + ring progress calculations
└── types/
    └── index.ts
```

---

## Data Model (Supabase PostgreSQL)

```sql
-- User settings (1 row per user)
CREATE TABLE settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users NOT NULL UNIQUE,
  expiration_days  INT DEFAULT 14,
  date_format      TEXT DEFAULT 'MM/DD/YYYY',
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users NOT NULL,
  name        TEXT NOT NULL,
  details     TEXT,
  due_date    DATE,
  for_later   BOOLEAN DEFAULT false,
  status      TEXT DEFAULT 'active',   -- 'active' | 'archived' | 'deleted'
  created_at  TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);

-- RLS policies
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_tasks" ON tasks
  USING (auth.uid() = user_id);

CREATE POLICY "users_own_settings" ON settings
  USING (auth.uid() = user_id);
```

---

## Urgency System

Computed in `lib/urgency.ts` based on `due_date` vs today:

| Days Remaining | Score | Color Token          | Label     |
|----------------|-------|----------------------|-----------|
| Overdue (< 0)  | 1.0   | `--color-overdue`    | coral     |
| 0–1            | 0.85  | `--color-tomorrow`   | amber     |
| 1–5            | 0.6   | `--color-soon`       | mint      |
| 5–14           | 0.3   | `--color-upcoming`   | sky blue  |
| > 14           | 0.1   | `--color-future`     | light blue|
| for_later      | —     | `--color-for-later`  | lavender  |

**Bubble diameter:**
```
diameter = 80 + (120 × urgencyScore)   // range: 80px–200px
```

---

## Bubble Radial Ring Timer

Each bubble has an SVG ring drawn around its circumference that acts as a visual countdown to the due date.

### Behavior
- **Full ring** = task created (maximum time remaining)
- **Ring drains clockwise** as due date approaches — proportional to elapsed time since creation vs. total duration
- **Ring fully gone** = task is overdue
- Ring color matches the urgency color of the bubble
- Overdue bubbles show an empty ring with a pulsing opacity (0.4→1.0 at 1.5s interval) to indicate attention needed without shame

### Formula
```
totalDuration = due_date - created_at   (in days)
elapsed       = today - created_at      (in days)
ringProgress  = clamp(1 - (elapsed / totalDuration), 0, 1)

// SVG stroke-dasharray trick:
circumference = 2π × radius
strokeDashoffset = circumference × (1 - ringProgress)
```

If `due_date` is null (no deadline), no ring is rendered.
If `for_later = true`, no ring is rendered.

### Implementation: `RadialRingTimer.tsx`
```tsx
// SVG circle positioned absolutely over BubbleCard
// Uses CSS transition on stroke-dashoffset for smooth animation
// strokeWidth: 4px on SM bubbles, 6px on LG/XL bubbles
// Rendered inside BubbleCard as an overlay layer
```

---

## Component Specifications

### BubbleBoard
- Absolutely positioned container (full viewport minus sidebar)
- On mount: calculates radial positions — most urgent bubble centered, others arranged by urgency score in spiral/orbit pattern
- Recalculates on window resize and task changes
- Stores positions in `useState` as `{ id, x, y }[]`

### BubbleCard
- CSS `@keyframes float`: gentle ±8px translate drift, 3–6s cycle (randomized per bubble on mount)
- Tap/click opens `TaskModal` in edit mode
- Long-press (300ms) shows quick-archive action
- Size classes: SM (80px), MD (120px), LG (160px), XL (200px)
- Background: urgency color at 40% opacity; border: urgency color at 80%

### ListView
- Sortable by: urgency (default), due date, name, created date
- `ListRow`: left urgency color bar (4px–16px width scales with urgency), row height 48px–96px
- Time-remaining progress bar at bottom of each row

### TaskModal
- Slide-up sheet on mobile, centered modal on desktop
- Fields: Name (required), Due Date (date picker), Details (textarea), For Later (toggle)
- Skeleton loaders on submit (no spinners — ADHD-friendly)
- Success state: brief green confirmation, auto-dismiss in 1.5s

### Sidebar
- `transform: translateX` slide-out on mobile
- Persistent column on desktop (≥ 768px)
- Links: Main Board, For Later, Archived, Settings

---

## Color Tokens

```css
--color-overdue:   #FF8A80;   /* coral pastel */
--color-tomorrow:  #FFD180;   /* amber */
--color-soon:      #B9F6CA;   /* mint green */
--color-upcoming:  #80D8FF;   /* sky blue */
--color-future:    #B3E5FC;   /* light blue */
--color-for-later: #CE93D8;   /* lavender */
--color-surface:   #FAFAFA;
--color-text:      #1A1A2E;
```

---

## Auto-Archive

Supabase Edge Function `archive-expired-tasks` on daily cron:
```sql
UPDATE tasks
SET status = 'archived', archived_at = now()
WHERE status = 'active'
  AND for_later = false
  AND due_date < now() - (
    SELECT expiration_days FROM settings WHERE user_id = tasks.user_id
  )::interval;
```

---

## Screens

| Route         | Description                                              |
|---------------|----------------------------------------------------------|
| `/login`      | Email/password login, link to signup                     |
| `/signup`     | Email/password signup, redirects to board on success     |
| `/`           | Main board — bubble view default, toggle to list view    |
| `/for-later`  | Lavender bucket — tasks parked with no urgency           |
| `/archived`   | Read-only history, shows archived_at date                |
| `/settings`   | Expiration days slider, date format picker               |

---

## Performance Targets

- First Contentful Paint: < 1.5s (SSR initial render)
- Bubble animation: 60fps (CSS transforms only, no layout thrash)
- WCAG AA contrast on all urgency colors
- Minimum tap target: 48×48px
- Reduced-motion: `@media (prefers-reduced-motion)` disables float and pulse animations
