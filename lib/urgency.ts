import { differenceInDays, parseISO, startOfDay } from 'date-fns'
import type { UrgencyInfo, UrgencyLevel } from '@/types'

const COLOR_MAP: Record<UrgencyLevel, string> = {
  overdue:   'var(--color-overdue)',
  tomorrow:  'var(--color-tomorrow)',
  soon:      'var(--color-soon)',
  upcoming:  'var(--color-upcoming)',
  future:    'var(--color-future)',
  for_later: 'var(--color-for-later)',
  no_date:   'var(--color-future)',
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
  if (daysRemaining < 0)        level = 'overdue'
  else if (daysRemaining <= 1)  level = 'tomorrow'
  else if (daysRemaining <= 5)  level = 'soon'
  else if (daysRemaining <= 14) level = 'upcoming'
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
