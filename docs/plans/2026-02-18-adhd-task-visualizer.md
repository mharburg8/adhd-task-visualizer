# ADHD Task Visualizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an ADHD-friendly task management web app with animated floating bubbles, urgency-based visual system, radial ring countdown timers, and Supabase backend.

**Architecture:** Next.js 14 App Router with Server Actions for all mutations. Supabase server client for SSR initial data load. Supabase browser client only for Realtime subscriptions. RLS enforces per-user data isolation at the database level.

**Tech Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase (PostgreSQL + Auth + Realtime) · date-fns · Jest · React Testing Library · Google Calendar API

---

## Prerequisites (Do These Manually Before Starting)

1. Create a Supabase project at https://supabase.com and get your `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Have Node.js 18+ installed

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json` (auto-generated)
- Create: `.env.local`
- Create: `tailwind.config.ts`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

**Step 1: Scaffold the project**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

When prompted:
- Would you like to use `src/` directory? → No
- Would you like to customize the import alias? → No

**Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr date-fns
npm install --save-dev jest @types/jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 3: Create `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Step 4: Create `jest.config.ts`**

```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

**Step 5: Create `jest.setup.ts`**

```ts
import '@testing-library/jest-dom'
```

**Step 6: Add test script to `package.json`**

Add to the `scripts` section:
```json
"test": "jest",
"test:watch": "jest --watch"
```

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: initialize Next.js 14 project with Supabase and Jest"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/index.ts`

**Step 1: Write the types**

```ts
// types/index.ts
export type TaskStatus = 'active' | 'archived' | 'deleted'

export interface Task {
  id: string
  user_id: string
  name: string
  details: string | null
  due_date: string | null   // ISO date string 'YYYY-MM-DD'
  for_later: boolean
  status: TaskStatus
  created_at: string        // ISO timestamp
  archived_at: string | null
}

export interface Settings {
  id: string
  user_id: string
  expiration_days: number
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY'
}

export type UrgencyLevel =
  | 'overdue'
  | 'tomorrow'
  | 'soon'
  | 'upcoming'
  | 'future'
  | 'for_later'
  | 'no_date'

export interface UrgencyInfo {
  level: UrgencyLevel
  score: number             // 0.0–1.0
  daysRemaining: number | null
  color: string             // CSS var reference e.g. 'var(--color-overdue)'
  diameter: number          // px
  ringProgress: number      // 0.0–1.0 (1 = full ring, 0 = gone)
}
```

**Step 2: Commit**

```bash
git add types/index.ts
git commit -m "chore: add TypeScript types"
```

---

## Task 3: Urgency Library

**Files:**
- Create: `lib/urgency.ts`
- Create: `lib/__tests__/urgency.test.ts`

**Step 1: Write the failing tests**

```ts
// lib/__tests__/urgency.test.ts
import { getUrgencyInfo } from '../urgency'

const TODAY = new Date('2026-02-18')

describe('getUrgencyInfo', () => {
  it('returns for_later level when for_later is true', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-20',
      for_later: true,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('for_later')
    expect(result.ringProgress).toBe(0)
  })

  it('returns overdue when due_date is in the past', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('overdue')
    expect(result.score).toBe(1.0)
    expect(result.ringProgress).toBe(0)
  })

  it('returns tomorrow when due_date is within 1 day', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-19',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('tomorrow')
    expect(result.score).toBe(0.85)
  })

  it('returns soon when due in 1–5 days', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-22',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('soon')
    expect(result.score).toBe(0.6)
  })

  it('returns upcoming when due in 5–14 days', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-28',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('upcoming')
    expect(result.score).toBe(0.3)
  })

  it('returns future when due in more than 14 days', () => {
    const result = getUrgencyInfo({
      due_date: '2026-03-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('future')
    expect(result.score).toBe(0.1)
  })

  it('returns no_date when due_date is null', () => {
    const result = getUrgencyInfo({
      due_date: null,
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('no_date')
    expect(result.ringProgress).toBe(0)
  })

  it('calculates ring progress correctly mid-way through', () => {
    // created Feb 1, due March 1 = 28 days total
    // today is Feb 18 = 17 days elapsed
    // progress = 1 - (17/28) ≈ 0.393
    const result = getUrgencyInfo({
      due_date: '2026-03-01',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.ringProgress).toBeCloseTo(0.393, 1)
  })

  it('clamps ring progress to 0 when overdue', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.ringProgress).toBe(0)
  })

  it('calculates bubble diameter proportional to urgency score', () => {
    const overdue = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(overdue.diameter).toBe(200)  // 80 + (120 * 1.0)

    const future = getUrgencyInfo({
      due_date: '2026-03-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(future.diameter).toBe(92)  // 80 + (120 * 0.1)
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
npm test lib/__tests__/urgency.test.ts
```

Expected: FAIL — "Cannot find module '../urgency'"

**Step 3: Write the implementation**

```ts
// lib/urgency.ts
import { differenceInDays, parseISO, startOfDay } from 'date-fns'
import type { UrgencyInfo, UrgencyLevel } from '@/types'

const COLOR_MAP: Record<UrgencyLevel, string> = {
  overdue:  'var(--color-overdue)',
  tomorrow: 'var(--color-tomorrow)',
  soon:     'var(--color-soon)',
  upcoming: 'var(--color-upcoming)',
  future:   'var(--color-future)',
  for_later:'var(--color-for-later)',
  no_date:  'var(--color-future)',
}

const SCORE_MAP: Record<UrgencyLevel, number> = {
  overdue:   1.0,
  tomorrow:  0.85,
  soon:      0.6,
  upcoming:  0.3,
  future:    0.1,
  for_later: 0,
  no_date:   0.1,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getUrgencyInfo({
  due_date,
  for_later,
  created_at,
  today = new Date(),
}: {
  due_date: string | null
  for_later: boolean
  created_at: string
  today?: Date
}): UrgencyInfo {
  const todayStart = startOfDay(today)

  if (for_later) {
    return {
      level: 'for_later',
      score: 0,
      daysRemaining: null,
      color: COLOR_MAP.for_later,
      diameter: 80,
      ringProgress: 0,
    }
  }

  if (!due_date) {
    return {
      level: 'no_date',
      score: 0.1,
      daysRemaining: null,
      color: COLOR_MAP.no_date,
      diameter: 92,
      ringProgress: 0,
    }
  }

  const dueDate = startOfDay(parseISO(due_date))
  const createdDate = startOfDay(parseISO(created_at))
  const daysRemaining = differenceInDays(dueDate, todayStart)

  let level: UrgencyLevel
  if (daysRemaining < 0)       level = 'overdue'
  else if (daysRemaining <= 1) level = 'tomorrow'
  else if (daysRemaining <= 5) level = 'soon'
  else if (daysRemaining <= 14)level = 'upcoming'
  else                          level = 'future'

  const score = SCORE_MAP[level]
  const diameter = Math.round(80 + 120 * score)

  const totalDuration = differenceInDays(dueDate, createdDate)
  const elapsed = differenceInDays(todayStart, createdDate)
  const ringProgress = totalDuration <= 0
    ? 0
    : clamp(1 - elapsed / totalDuration, 0, 1)

  return {
    level,
    score,
    daysRemaining,
    color: COLOR_MAP[level],
    diameter,
    ringProgress,
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test lib/__tests__/urgency.test.ts
```

Expected: All PASS

**Step 5: Commit**

```bash
git add lib/urgency.ts lib/__tests__/urgency.test.ts
git commit -m "feat: add urgency scoring and ring progress calculation"
```

---

## Task 4: Supabase Client Setup

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `middleware.ts`

**Step 1: Create server client**

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Step 2: Create browser client**

```ts
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 3: Create middleware for session refresh**

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/signup')

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Step 4: Commit**

```bash
git add lib/supabase/ middleware.ts
git commit -m "feat: add Supabase server/browser clients and auth middleware"
```

---

## Task 5: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Create the migration file**

```sql
-- supabase/migrations/001_initial_schema.sql

-- Settings table (one row per user)
CREATE TABLE IF NOT EXISTS settings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  expiration_days  INT DEFAULT 14 CHECK (expiration_days > 0),
  date_format      TEXT DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY')),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL CHECK (char_length(name) > 0),
  details     TEXT,
  due_date    DATE,
  for_later   BOOLEAN DEFAULT false NOT NULL,
  status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
  archived_at TIMESTAMPTZ
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
```

**Step 2: Apply to your Supabase project**

Paste the SQL above into your Supabase project's SQL Editor and run it (Dashboard → SQL Editor → New Query).

**Step 3: Commit**

```bash
git add supabase/
git commit -m "chore: add database schema with RLS and auto-settings trigger"
```

---

## Task 6: CSS Design Tokens

**Files:**
- Modify: `app/globals.css`

**Step 1: Replace the contents of `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-overdue:   #FF8A80;
  --color-tomorrow:  #FFD180;
  --color-soon:      #B9F6CA;
  --color-upcoming:  #80D8FF;
  --color-future:    #B3E5FC;
  --color-for-later: #CE93D8;
  --color-surface:   #FAFAFA;
  --color-text:      #1A1A2E;
  --color-text-muted:#6B7280;
  --color-border:    #E5E7EB;
}

@keyframes float {
  0%, 100% { transform: translate(var(--tx, 0px), var(--ty, 0px)); }
  25%       { transform: translate(calc(var(--tx, 0px) + var(--drift-x, 6px)), calc(var(--ty, 0px) - var(--drift-y, 4px))); }
  75%       { transform: translate(calc(var(--tx, 0px) - var(--drift-x, 6px)), calc(var(--ty, 0px) + var(--drift-y, 4px))); }
}

@keyframes pulse-ring {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1.0; }
}

@media (prefers-reduced-motion: reduce) {
  .bubble-float { animation: none !important; }
  .pulse-ring   { animation: none !important; }
}

* { box-sizing: border-box; }
body {
  background-color: var(--color-surface);
  color: var(--color-text);
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}
```

**Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: add design tokens and animation keyframes"
```

---

## Task 7: Root Layout and Session Provider

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`

**Step 1: Update root layout**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ADHD Task Visualizer',
  description: 'Visual task management for ADHD minds',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**Step 2: Create login page**

```tsx
// app/(auth)/login/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Check your email and password and try again.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-white shadow-sm border border-[var(--color-border)]">
        <h1 className="text-2xl font-semibold mb-2 text-[var(--color-text)]">Welcome back</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">Sign in to your task board</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-overdue)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[var(--color-upcoming)] font-medium text-[var(--color-text)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 text-[var(--color-text-muted)]">
          No account?{' '}
          <Link href="/signup" className="text-[var(--color-text)] font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
```

**Step 3: Create signup page**

```tsx
// app/(auth)/signup/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-white shadow-sm border border-[var(--color-border)]">
        <h1 className="text-2xl font-semibold mb-2 text-[var(--color-text)]">Get started</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">Create your task board — it only takes a moment</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm"
              placeholder="At least 6 characters"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-overdue)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[var(--color-soon)] font-medium text-[var(--color-text)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 text-[var(--color-text-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--color-text)] font-medium underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
```

**Step 4: Commit**

```bash
git add app/layout.tsx app/(auth)/
git commit -m "feat: add auth pages (login and signup)"
```

---

## Task 8: Server Actions

**Files:**
- Create: `app/actions/tasks.ts`
- Create: `app/actions/settings.ts`

**Step 1: Create task actions**

```ts
// app/actions/tasks.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTask(data: {
  name: string
  due_date: string | null
  details: string | null
  for_later: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('tasks').insert({
    ...data,
    user_id: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updateTask(id: string, data: {
  name?: string
  due_date?: string | null
  details?: string | null
  for_later?: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function archiveTask(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/archived')
}

export async function deleteTask(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'deleted' })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
}
```

**Step 2: Create settings actions**

```ts
// app/actions/settings.ts
'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateSettings(data: {
  expiration_days?: number
  date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY'
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, ...data })
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
```

**Step 3: Commit**

```bash
git add app/actions/
git commit -m "feat: add server actions for tasks and settings"
```

---

## Task 9: Sidebar Navigation

**Files:**
- Create: `components/nav/Sidebar.tsx`

**Step 1: Write the component**

```tsx
// components/nav/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/',           label: 'My Board',   emoji: '🫧' },
  { href: '/for-later',  label: 'For Later',  emoji: '🪴' },
  { href: '/archived',   label: 'Archived',   emoji: '📦' },
  { href: '/settings',   label: 'Settings',   emoji: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-[var(--color-border)] flex flex-col p-4">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Task Board</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Let's get things done</p>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
              min-h-[48px]
              ${pathname === item.href
                ? 'bg-[var(--color-upcoming)] text-[var(--color-text)]'
                : 'text-[var(--color-text-muted)] hover:bg-gray-50 hover:text-[var(--color-text)]'
              }
            `}
          >
            <span className="text-base">{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleSignOut}
        className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--color-text-muted)] hover:bg-gray-50 hover:text-[var(--color-text)] transition-colors min-h-[48px]"
      >
        <span className="text-base">👋</span>
        Sign out
      </button>
    </aside>
  )
}
```

**Step 2: Commit**

```bash
git add components/nav/Sidebar.tsx
git commit -m "feat: add sidebar navigation"
```

---

## Task 10: Dashboard Layout

**Files:**
- Create: `app/(dashboard)/layout.tsx`

**Step 1: Write the layout**

```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/nav/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/(dashboard)/layout.tsx
git commit -m "feat: add dashboard layout with sidebar"
```

---

## Task 11: RadialRingTimer Component

**Files:**
- Create: `components/bubble-board/RadialRingTimer.tsx`
- Create: `components/bubble-board/__tests__/RadialRingTimer.test.tsx`

**Step 1: Write the failing test**

```tsx
// components/bubble-board/__tests__/RadialRingTimer.test.tsx
import { render } from '@testing-library/react'
import { RadialRingTimer } from '../RadialRingTimer'

describe('RadialRingTimer', () => {
  it('renders an SVG circle with correct stroke-dashoffset for 50% progress', () => {
    const { container } = render(
      <RadialRingTimer
        diameter={120}
        ringProgress={0.5}
        color="var(--color-upcoming)"
        isOverdue={false}
      />
    )
    const circle = container.querySelector('circle.ring-progress')
    expect(circle).toBeInTheDocument()
    const circumference = 2 * Math.PI * (60 - 3 - 4)  // radius = diameter/2 - strokeWidth/2 - gap
    const expectedOffset = circumference * (1 - 0.5)
    expect(circle).toHaveAttribute('stroke-dasharray', String(circumference))
    expect(circle).toHaveAttribute('stroke-dashoffset', String(expectedOffset))
  })

  it('applies pulse-ring class when isOverdue is true', () => {
    const { container } = render(
      <RadialRingTimer
        diameter={120}
        ringProgress={0}
        color="var(--color-overdue)"
        isOverdue={true}
      />
    )
    const circle = container.querySelector('circle.ring-progress')
    expect(circle?.className).toContain('pulse-ring')
  })

  it('renders nothing when ringProgress is 0 and not overdue', () => {
    const { container } = render(
      <RadialRingTimer
        diameter={120}
        ringProgress={0}
        color="var(--color-upcoming)"
        isOverdue={false}
      />
    )
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm test RadialRingTimer.test.tsx
```

Expected: FAIL — "Cannot find module '../RadialRingTimer'"

**Step 3: Write the implementation**

```tsx
// components/bubble-board/RadialRingTimer.tsx
interface RadialRingTimerProps {
  diameter: number
  ringProgress: number   // 0.0–1.0
  color: string
  isOverdue: boolean
  strokeWidth?: number
}

export function RadialRingTimer({
  diameter,
  ringProgress,
  color,
  isOverdue,
  strokeWidth,
}: RadialRingTimerProps) {
  // Don't render if no time left and not overdue (no ring = no due date or for_later)
  if (ringProgress === 0 && !isOverdue) return null

  const sw = strokeWidth ?? (diameter >= 160 ? 6 : 4)
  const gap = 4  // gap between bubble edge and ring
  const radius = diameter / 2 - sw / 2 - gap
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - ringProgress)

  return (
    <svg
      width={diameter}
      height={diameter}
      className="absolute inset-0 pointer-events-none"
      style={{ transform: 'rotate(-90deg)' }}  // start from top
    >
      {/* Track ring (ghost) */}
      <circle
        cx={diameter / 2}
        cy={diameter / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        opacity={0.15}
      />
      {/* Progress ring */}
      <circle
        className={`ring-progress${isOverdue ? ' pulse-ring' : ''}`}
        cx={diameter / 2}
        cy={diameter / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={String(circumference)}
        strokeDashoffset={String(strokeDashoffset)}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}
```

**Step 4: Run tests to verify they pass**

```bash
npm test RadialRingTimer.test.tsx
```

Expected: All PASS

**Step 5: Commit**

```bash
git add components/bubble-board/RadialRingTimer.tsx components/bubble-board/__tests__/RadialRingTimer.test.tsx
git commit -m "feat: add RadialRingTimer SVG countdown component"
```

---

## Task 12: BubbleCard Component

**Files:**
- Create: `components/bubble-board/BubbleCard.tsx`

**Step 1: Write the component**

```tsx
// components/bubble-board/BubbleCard.tsx
'use client'
import { useMemo } from 'react'
import type { Task } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { RadialRingTimer } from './RadialRingTimer'

interface BubbleCardProps {
  task: Task
  onClick: (task: Task) => void
}

// Deterministic random from task id (stable across renders)
function seededRandom(seed: string, index: number) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return Math.abs(Math.sin(h + index) * 10000) % 1
}

export function BubbleCard({ task, onClick }: BubbleCardProps) {
  const urgency = useMemo(
    () => getUrgencyInfo({
      due_date: task.due_date,
      for_later: task.for_later,
      created_at: task.created_at,
    }),
    [task.due_date, task.for_later, task.created_at]
  )

  const floatDuration = useMemo(() => 3 + seededRandom(task.id, 0) * 3, [task.id])
  const driftX = useMemo(() => 4 + seededRandom(task.id, 1) * 8, [task.id])
  const driftY = useMemo(() => 3 + seededRandom(task.id, 2) * 6, [task.id])

  const { diameter, color, level } = urgency

  return (
    <button
      onClick={() => onClick(task)}
      className="absolute bubble-float rounded-full flex items-center justify-center text-center
                 cursor-pointer hover:scale-105 transition-transform focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-upcoming)]"
      style={{
        width: diameter,
        height: diameter,
        backgroundColor: color,
        opacity: 0.9,
        border: `2px solid ${color}`,
        '--drift-x': `${driftX}px`,
        '--drift-y': `${driftY}px`,
        animation: `float ${floatDuration}s ease-in-out infinite`,
      } as React.CSSProperties}
      aria-label={`Task: ${task.name}${urgency.daysRemaining !== null
        ? urgency.daysRemaining < 0
          ? ', overdue'
          : `, due in ${urgency.daysRemaining} day${urgency.daysRemaining !== 1 ? 's' : ''}`
        : ''
      }`}
    >
      <RadialRingTimer
        diameter={diameter}
        ringProgress={urgency.ringProgress}
        color={color}
        isOverdue={level === 'overdue'}
      />
      <span
        className="relative z-10 px-3 font-medium leading-tight text-[var(--color-text)] select-none"
        style={{ fontSize: diameter > 140 ? '14px' : '12px', maxWidth: diameter * 0.75 }}
      >
        {task.name}
      </span>
    </button>
  )
}
```

**Step 2: Commit**

```bash
git add components/bubble-board/BubbleCard.tsx
git commit -m "feat: add BubbleCard with float animation and urgency colors"
```

---

## Task 13: BubbleBoard Layout Engine

**Files:**
- Create: `components/bubble-board/BubbleBoard.tsx`

**Step 1: Write the component**

```tsx
// components/bubble-board/BubbleBoard.tsx
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Task } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { BubbleCard } from './BubbleCard'

interface BubblePosition {
  id: string
  x: number
  y: number
}

interface BubbleBoardProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

function calculatePositions(tasks: Task[], width: number, height: number): BubblePosition[] {
  if (tasks.length === 0) return []

  const sorted = [...tasks].sort((a, b) => {
    const scoreA = getUrgencyInfo({ due_date: a.due_date, for_later: a.for_later, created_at: a.created_at }).score
    const scoreB = getUrgencyInfo({ due_date: b.due_date, for_later: b.for_later, created_at: b.created_at }).score
    return scoreB - scoreA
  })

  const cx = width / 2
  const cy = height / 2

  return sorted.map((task, i) => {
    const urgency = getUrgencyInfo({ due_date: task.due_date, for_later: task.for_later, created_at: task.created_at })
    const r = urgency.diameter / 2

    if (i === 0) return { id: task.id, x: cx - r, y: cy - r }

    const angle = (i / (sorted.length - 1)) * 2 * Math.PI
    const orbitRadius = 180 + i * 20
    return {
      id: task.id,
      x: Math.max(r, Math.min(width - r * 2, cx + Math.cos(angle) * orbitRadius - r)),
      y: Math.max(r, Math.min(height - r * 2, cy + Math.sin(angle) * orbitRadius - r)),
    }
  })
}

export function BubbleBoard({ tasks, onTaskClick }: BubbleBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<BubblePosition[]>([])

  const recalculate = useCallback(() => {
    if (!containerRef.current) return
    const { offsetWidth: w, offsetHeight: h } = containerRef.current
    setPositions(calculatePositions(tasks, w, h))
  }, [tasks])

  useEffect(() => {
    recalculate()
    window.addEventListener('resize', recalculate)
    return () => window.removeEventListener('resize', recalculate)
  }, [recalculate])

  if (tasks.length === 0) {
    return (
      <div ref={containerRef} className="relative flex-1 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🌱</p>
          <p className="text-lg font-medium text-[var(--color-text)]">Nothing on your plate right now</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Add a task to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-h-[calc(100vh-80px)] overflow-hidden">
      {tasks.map(task => {
        const pos = positions.find(p => p.id === task.id)
        if (!pos) return null
        return (
          <div
            key={task.id}
            style={{ position: 'absolute', left: pos.x, top: pos.y }}
          >
            <BubbleCard task={task} onClick={onTaskClick} />
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/bubble-board/BubbleBoard.tsx
git commit -m "feat: add BubbleBoard with radial layout engine"
```

---

## Task 14: Task Modal

**Files:**
- Create: `components/modals/TaskModal.tsx`

**Step 1: Write the component**

```tsx
// components/modals/TaskModal.tsx
'use client'
import { useState, useEffect } from 'react'
import type { Task } from '@/types'
import { createTask, updateTask, archiveTask, deleteTask } from '@/app/actions/tasks'

interface TaskModalProps {
  task?: Task | null        // null = create mode
  onClose: () => void
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const [name, setName] = useState(task?.name ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [details, setDetails] = useState(task?.details ?? '')
  const [forLater, setForLater] = useState(task?.for_later ?? false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const data = {
      name,
      due_date: dueDate || null,
      details: details || null,
      for_later: forLater,
    }
    if (task) {
      await updateTask(task.id, data)
    } else {
      await createTask(data)
    }
    setSuccess(true)
    setTimeout(onClose, 1200)
  }

  async function handleArchive() {
    if (!task) return
    setLoading(true)
    await archiveTask(task.id)
    onClose()
  }

  async function handleDelete() {
    if (!task) return
    setLoading(true)
    await deleteTask(task.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">
            {task ? 'Edit task' : 'New task'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">✓</p>
            <p className="font-medium text-[var(--color-soon)] saturate-150">
              {task ? 'Task updated' : 'Task added'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="task-name">
                Task name <span className="text-[var(--color-overdue)]">*</span>
              </label>
              <input
                id="task-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="What needs doing?"
                className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="due-date">
                Due date
              </label>
              <input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={forLater}
                className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="details">
                Details
              </label>
              <textarea
                id="details"
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Any notes? Totally optional."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-for-later)]/20">
              <div>
                <p className="text-sm font-medium">Park it for later</p>
                <p className="text-xs text-[var(--color-text-muted)]">No pressure — it'll wait</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={forLater}
                onClick={() => setForLater(!forLater)}
                className={`relative w-12 h-7 rounded-full transition-colors ${forLater ? 'bg-[var(--color-for-later)]' : 'bg-gray-200'}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${forLater ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[var(--color-upcoming)] font-medium text-[var(--color-text)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '…' : task ? 'Save changes' : 'Add task'}
            </button>

            {task && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={loading}
                  className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:bg-gray-50 disabled:opacity-50"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 h-10 rounded-xl border border-[var(--color-overdue)]/30 text-sm text-[var(--color-overdue)] hover:bg-[var(--color-overdue)]/10 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/modals/TaskModal.tsx
git commit -m "feat: add task create/edit modal with for-later toggle"
```

---

## Task 15: List View

**Files:**
- Create: `components/list-view/ListRow.tsx`
- Create: `components/list-view/ListView.tsx`

**Step 1: Write ListRow**

```tsx
// components/list-view/ListRow.tsx
import type { Task } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { format, parseISO } from 'date-fns'

interface ListRowProps {
  task: Task
  onClick: (task: Task) => void
  dateFormat: string
}

export function ListRow({ task, onClick, dateFormat }: ListRowProps) {
  const urgency = getUrgencyInfo({
    due_date: task.due_date,
    for_later: task.for_later,
    created_at: task.created_at,
  })

  const rowHeight = 48 + urgency.score * 48  // 48px–96px
  const barWidth = `${urgency.ringProgress * 100}%`

  const dueDateLabel = task.due_date
    ? format(parseISO(task.due_date), dateFormat === 'DD/MM/YYYY' ? 'dd/MM/yyyy' : 'MM/dd/yyyy')
    : null

  return (
    <button
      onClick={() => onClick(task)}
      className="w-full text-left bg-white rounded-xl border border-[var(--color-border)] overflow-hidden hover:shadow-sm transition-shadow mb-2"
      style={{ minHeight: rowHeight }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex-shrink-0 rounded-full"
          style={{
            width: 12 + urgency.score * 8,
            height: 12 + urgency.score * 8,
            backgroundColor: urgency.color,
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.name}</p>
          {dueDateLabel && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {urgency.level === 'overdue' ? 'Was due ' : 'Due '}
              {dueDateLabel}
            </p>
          )}
        </div>
      </div>
      {/* Time remaining bar */}
      {task.due_date && (
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full transition-all"
            style={{ width: barWidth, backgroundColor: urgency.color }}
          />
        </div>
      )}
    </button>
  )
}
```

**Step 2: Write ListView**

```tsx
// components/list-view/ListView.tsx
import type { Task } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { ListRow } from './ListRow'

interface ListViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  dateFormat: string
}

export function ListView({ tasks, onTaskClick, dateFormat }: ListViewProps) {
  const sorted = [...tasks].sort((a, b) => {
    const scoreA = getUrgencyInfo({ due_date: a.due_date, for_later: a.for_later, created_at: a.created_at }).score
    const scoreB = getUrgencyInfo({ due_date: b.due_date, for_later: b.for_later, created_at: b.created_at }).score
    return scoreB - scoreA
  })

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-4xl mb-4">🌱</p>
        <p className="text-lg font-medium">Nothing on your plate right now</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Add a task to get started</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {sorted.map(task => (
        <ListRow key={task.id} task={task} onClick={onTaskClick} dateFormat={dateFormat} />
      ))}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add components/list-view/
git commit -m "feat: add list view with urgency bars and time-remaining progress"
```

---

## Task 16: Main Board Page

**Files:**
- Create: `app/(dashboard)/page.tsx`

**Step 1: Write the main board page**

```tsx
// app/(dashboard)/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Settings } from '@/types'
import { BubbleBoard } from '@/components/bubble-board/BubbleBoard'
import { ListView } from '@/components/list-view/ListView'
import { TaskModal } from '@/components/modals/TaskModal'

export default function MainBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [view, setView] = useState<'bubble' | 'list'>('bubble')
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>(undefined)
  // undefined = modal closed, null = create mode, Task = edit mode
  const supabase = createClient()

  useEffect(() => {
    // Initial load
    async function load() {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .eq('for_later', false)
        .order('created_at', { ascending: false })
      if (tasksData) setTasks(tasksData)

      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .single()
      if (settingsData) setSettings(settingsData)
    }
    load()

    // Realtime subscription
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
      }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <h2 className="text-base font-semibold">My Board</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('bubble')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'bubble' ? 'bg-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}
            >
              Bubbles
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setSelectedTask(null)}
            className="h-10 px-4 rounded-xl bg-[var(--color-upcoming)] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Add task
          </button>
        </div>
      </div>

      {/* Board */}
      {view === 'bubble' ? (
        <BubbleBoard tasks={tasks} onTaskClick={setSelectedTask} />
      ) : (
        <ListView
          tasks={tasks}
          onTaskClick={setSelectedTask}
          dateFormat={settings?.date_format ?? 'MM/DD/YYYY'}
        />
      )}

      {/* Modal */}
      {selectedTask !== undefined && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(undefined)}
        />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/(dashboard)/page.tsx
git commit -m "feat: add main board page with bubble/list toggle and realtime"
```

---

## Task 17: For Later Page

**Files:**
- Create: `app/(dashboard)/for-later/page.tsx`

**Step 1: Write the page**

```tsx
// app/(dashboard)/for-later/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types'
import { ListRow } from '@/components/list-view/ListRow'
import { TaskModal } from '@/components/modals/TaskModal'

export default function ForLaterPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .eq('for_later', true)
        .order('created_at', { ascending: false })
      if (data) setTasks(data)
    }
    load()
    const channel = supabase
      .channel('for-later-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <h2 className="text-base font-semibold">For Later</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Things you'll get to — no rush</p>
      </div>
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">🪴</p>
            <p className="text-lg font-medium">Nothing parked here yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Add tasks with "Park it for later" toggled on</p>
          </div>
        ) : (
          <div className="p-4">
            {tasks.map(task => (
              <ListRow key={task.id} task={task} onClick={setSelectedTask} dateFormat="MM/DD/YYYY" />
            ))}
          </div>
        )}
      </div>
      {selectedTask !== undefined && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(undefined)} />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/(dashboard)/for-later/page.tsx
git commit -m "feat: add for-later page"
```

---

## Task 18: Archived Page

**Files:**
- Create: `app/(dashboard)/archived/page.tsx`

**Step 1: Write the page**

```tsx
// app/(dashboard)/archived/page.tsx
import { createClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'

export default async function ArchivedPage() {
  const supabase = createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'archived')
    .order('archived_at', { ascending: false })
    .limit(100)

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <h2 className="text-base font-semibold">Archived</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Tasks you've finished or set aside</p>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!tasks || tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-lg font-medium">Nothing archived yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Completed tasks will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3 opacity-70"
              >
                <p className="text-sm font-medium">{task.name}</p>
                {task.archived_at && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Archived {format(parseISO(task.archived_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/(dashboard)/archived/page.tsx
git commit -m "feat: add archived page"
```

---

## Task 19: Settings Page

**Files:**
- Create: `app/(dashboard)/settings/page.tsx`

**Step 1: Write the page**

```tsx
// app/(dashboard)/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: settings } = await supabase.from('settings').select('*').single()
  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <h2 className="text-base font-semibold">Settings</h2>
      </div>
      <div className="flex-1 overflow-auto p-6 max-w-md">
        <SettingsForm settings={settings} />
      </div>
    </div>
  )
}
```

**Step 2: Create `app/(dashboard)/settings/SettingsForm.tsx`**

```tsx
// app/(dashboard)/settings/SettingsForm.tsx
'use client'
import { useState } from 'react'
import type { Settings } from '@/types'
import { updateSettings } from '@/app/actions/settings'

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [expirationDays, setExpirationDays] = useState(settings?.expiration_days ?? 14)
  const [dateFormat, setDateFormat] = useState<'MM/DD/YYYY' | 'DD/MM/YYYY'>(settings?.date_format ?? 'MM/DD/YYYY')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    await updateSettings({ expiration_days: expirationDays, date_format: dateFormat })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <label className="block text-sm font-medium mb-1">
          Auto-archive after
        </label>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Tasks past their due date will be archived after this many days
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={60}
            value={expirationDays}
            onChange={e => setExpirationDays(Number(e.target.value))}
            className="flex-1 accent-[var(--color-upcoming)]"
          />
          <span className="text-sm font-medium w-16 text-right">{expirationDays} days</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <label className="block text-sm font-medium mb-3">Date format</label>
        <div className="space-y-2">
          {(['MM/DD/YYYY', 'DD/MM/YYYY'] as const).map(fmt => (
            <label key={fmt} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="date_format"
                value={fmt}
                checked={dateFormat === fmt}
                onChange={() => setDateFormat(fmt)}
                className="accent-[var(--color-upcoming)]"
              />
              <span className="text-sm">{fmt}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full h-12 rounded-xl bg-[var(--color-upcoming)] font-medium text-sm hover:opacity-90 transition-opacity"
      >
        {saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add app/(dashboard)/settings/
git commit -m "feat: add settings page with expiration days and date format"
```

---

## Task 20: Auto-Archive Edge Function

**Files:**
- Create: `supabase/functions/archive-expired-tasks/index.ts`

**Step 1: Write the Edge Function**

```ts
// supabase/functions/archive-expired-tasks/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await supabase.rpc('archive_expired_tasks')
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

**Step 2: Create the SQL function in Supabase**

Paste this in Supabase SQL Editor:

```sql
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
```

**Step 3: Schedule via Supabase Dashboard**

Go to Supabase Dashboard → Edge Functions → Deploy `archive-expired-tasks`. Then in Database → Extensions enable `pg_cron`, and add:

```sql
SELECT cron.schedule('archive-expired-tasks', '0 2 * * *', $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/archive-expired-tasks',
    headers := '{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
  );
$$);
```

**Step 4: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add auto-archive edge function"
```

---

## Task 21: Final Wiring and Smoke Test

**Step 1: Run the development server**

```bash
npm run dev
```

**Step 2: Verify each route loads without errors**

- `http://localhost:3000/login` — login form renders
- `http://localhost:3000/signup` — signup form renders
- Sign up with a test account
- `http://localhost:3000/` — main board renders (empty state)
- Click "+ Add task" — modal opens
- Add a task with a due date — bubble appears on board
- Toggle to list view — row appears with urgency bar
- Click the bubble — modal opens in edit mode
- `/for-later` — empty state
- `/archived` — empty state
- `/settings` — sliders render

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: final wiring complete, smoke test passed"
```

---

---

## Task 22: Google Calendar Integration

> **Prerequisite:** Enable Google OAuth in Supabase Dashboard → Auth → Providers → Google. Add the scope `https://www.googleapis.com/auth/calendar.events` to the Google OAuth config. The user enables this feature themselves from the Settings page.

**Files:**
- Create: `lib/google-calendar.ts`
- Create: `app/actions/calendar.ts`
- Modify: `app/(dashboard)/settings/SettingsForm.tsx`
- Modify: `components/modals/TaskModal.tsx`
- Modify: `app/actions/settings.ts`

**Step 1: Add DB columns**

Paste in Supabase SQL Editor:

```sql
ALTER TABLE settings ADD COLUMN IF NOT EXISTS google_calendar_enabled BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_event_id TEXT;
```

**Step 2: Update TypeScript types**

In `types/index.ts`, add to `Settings`:
```ts
google_calendar_enabled: boolean
```

Add to `Task`:
```ts
google_event_id: string | null
```

**Step 3: Create `lib/google-calendar.ts`**

```ts
// lib/google-calendar.ts

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to refresh Google token')
  return data.access_token
}

async function calendarFetch(
  path: string,
  options: RequestInit,
  accessToken: string,
  refreshToken: string,
  retry = true,
): Promise<Response> {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken(refreshToken)
    return calendarFetch(path, options, newToken, refreshToken, false)
  }
  return res
}

export async function createCalendarEvent({
  accessToken,
  refreshToken,
  name,
  dueDate,
  details,
}: {
  accessToken: string
  refreshToken: string
  name: string
  dueDate: string  // 'YYYY-MM-DD'
  details: string | null
}): Promise<string> {
  const body = JSON.stringify({
    summary: name,
    description: details ?? undefined,
    start: { date: dueDate },
    end: { date: dueDate },
  })
  const res = await calendarFetch('/calendars/primary/events', { method: 'POST', body }, accessToken, refreshToken)
  if (!res.ok) throw new Error(`Google Calendar error: ${res.status}`)
  const data = await res.json()
  return data.id as string
}

export async function updateCalendarEvent({
  accessToken,
  refreshToken,
  eventId,
  name,
  dueDate,
  details,
}: {
  accessToken: string
  refreshToken: string
  eventId: string
  name: string
  dueDate: string
  details: string | null
}): Promise<void> {
  const body = JSON.stringify({
    summary: name,
    description: details ?? undefined,
    start: { date: dueDate },
    end: { date: dueDate },
  })
  await calendarFetch(`/calendars/primary/events/${eventId}`, { method: 'PATCH', body }, accessToken, refreshToken)
}

export async function deleteCalendarEvent({
  accessToken,
  refreshToken,
  eventId,
}: {
  accessToken: string
  refreshToken: string
  eventId: string
}): Promise<void> {
  await calendarFetch(`/calendars/primary/events/${eventId}`, { method: 'DELETE' }, accessToken, refreshToken)
}
```

**Step 4: Create `app/actions/calendar.ts`**

```ts
// app/actions/calendar.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google-calendar'
import { revalidatePath } from 'next/cache'

async function getTokens() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.provider_token || !session?.provider_refresh_token) {
    throw new Error('No Google OAuth tokens — user must re-authenticate')
  }
  return {
    accessToken: session.provider_token,
    refreshToken: session.provider_refresh_token,
    userId: session.user.id,
    supabase,
  }
}

export async function pushTaskToCalendar(taskId: string) {
  const { accessToken, refreshToken, supabase } = await getTokens()

  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!task?.due_date) throw new Error('Task must have a due date to add to calendar')

  let eventId: string
  if (task.google_event_id) {
    await updateCalendarEvent({
      accessToken,
      refreshToken,
      eventId: task.google_event_id,
      name: task.name,
      dueDate: task.due_date,
      details: task.details,
    })
    eventId = task.google_event_id
  } else {
    eventId = await createCalendarEvent({
      accessToken,
      refreshToken,
      name: task.name,
      dueDate: task.due_date,
      details: task.details,
    })
    await supabase.from('tasks').update({ google_event_id: eventId }).eq('id', taskId)
  }

  revalidatePath('/')
  return eventId
}

export async function removeTaskFromCalendar(taskId: string) {
  const { accessToken, refreshToken, supabase } = await getTokens()

  const { data: task } = await supabase
    .from('tasks')
    .select('google_event_id')
    .eq('id', taskId)
    .single()

  if (!task?.google_event_id) return

  await deleteCalendarEvent({ accessToken, refreshToken, eventId: task.google_event_id })
  await supabase.from('tasks').update({ google_event_id: null }).eq('id', taskId)
  revalidatePath('/')
}
```

**Step 5: Add "Add to Google Calendar" button in `TaskModal.tsx`**

Inside the form, after the submit button and before the archive/delete row, add:

```tsx
{task?.due_date && (
  <button
    type="button"
    onClick={async () => {
      setLoading(true)
      await pushTaskToCalendar(task.id)
      setLoading(false)
    }}
    className="w-full h-10 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:bg-gray-50 flex items-center justify-center gap-2"
  >
    <span>📅</span>
    {task.google_event_id ? 'Update in Google Calendar' : 'Add to Google Calendar'}
  </button>
)}
```

Add the import at the top of `TaskModal.tsx`:
```tsx
import { pushTaskToCalendar } from '@/app/actions/calendar'
```

**Step 6: Add Google Calendar toggle in `SettingsForm.tsx`**

Add below the date format section:

```tsx
<div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium">Sync to Google Calendar</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
        Adds tasks to your calendar as events when you choose
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={gcalEnabled}
      onClick={async () => {
        if (!gcalEnabled) {
          // Trigger Google OAuth
          const supabase = createClient()
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              scopes: 'https://www.googleapis.com/auth/calendar.events',
              redirectTo: `${window.location.origin}/settings`,
            },
          })
        } else {
          await updateSettings({ google_calendar_enabled: false })
          setGcalEnabled(false)
        }
      }}
      className={`relative w-12 h-7 rounded-full transition-colors ${gcalEnabled ? 'bg-[var(--color-soon)]' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${gcalEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
</div>
```

Add to `SettingsForm` state:
```tsx
const [gcalEnabled, setGcalEnabled] = useState(settings?.google_calendar_enabled ?? false)
```

Add the import:
```tsx
import { createClient } from '@/lib/supabase/client'
```

**Step 7: Add env vars**

In `.env.local`:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

These come from the same Google Cloud OAuth app you configure in Supabase.

**Step 8: Commit**

```bash
git add lib/google-calendar.ts app/actions/calendar.ts
git add components/modals/TaskModal.tsx app/(dashboard)/settings/SettingsForm.tsx
git add types/index.ts
git commit -m "feat: add optional Google Calendar event sync"
```

---

## Environment Variables Checklist

```env
NEXT_PUBLIC_SUPABASE_URL=        # From Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # From Supabase project settings
GOOGLE_CLIENT_ID=                # From Google Cloud Console OAuth credentials
GOOGLE_CLIENT_SECRET=            # From Google Cloud Console OAuth credentials
```

For the Edge Function (set in Supabase Dashboard → Settings → Vault):
```
SUPABASE_SERVICE_ROLE_KEY=       # From Supabase project settings
```
