import { differenceInDays, parseISO, startOfDay } from 'date-fns'
import type { UrgencyInfo, UrgencyLevel, CustomUrgencyColors } from '@/types'

type TierConfig = {
  fill: string
  border: string
  text: string
  score: number
}

const TIER_CONFIG_GREEN_URGENT: Record<UrgencyLevel, TierConfig> = {
  overdue:   { fill: '#FF1744', border: '#B71C1C', text: '#FFFFFF', score: 1.00 },
  red_2:     { fill: '#FF5252', border: '#C62828', text: '#FFFFFF', score: 0.90 },
  red_1:     { fill: '#FF8A80', border: '#F44336', text: '#7F0000', score: 0.80 },
  orange_2:  { fill: '#FFA726', border: '#E65100', text: '#4A1800', score: 0.70 },
  orange_1:  { fill: '#FFCC80', border: '#FF9800', text: '#7B3D00', score: 0.60 },
  yellow_2:  { fill: '#FFE033', border: '#F9A825', text: '#5D3A00', score: 0.50 },
  yellow_1:  { fill: '#FFF59D', border: '#FDD835', text: '#7B5800', score: 0.40 },
  green_3:   { fill: '#5EC96A', border: '#388E3C', text: '#1B5E20', score: 0.30 },
  green_2:   { fill: '#8FE09A', border: '#4CAF50', text: '#1B5E20', score: 0.20 },
  green_1:   { fill: '#B8F0BE', border: '#74C483', text: '#1B5E20', score: 0.10 },
  for_later: { fill: '#CE93D8', border: '#AB47BC', text: '#4A148C', score: 0.00 },
  no_date:   { fill: '#B3E5FC', border: '#81D4FA', text: '#0277BD', score: 0.10 },
}

const TIER_CONFIG_RED_URGENT: Record<UrgencyLevel, TierConfig> = {
  overdue:   { fill: '#B71C1C', border: '#7F0000', text: '#FFFFFF', score: 1.00 },
  red_2:     { fill: '#C62828', border: '#B71C1C', text: '#FFFFFF', score: 0.90 },
  red_1:     { fill: '#EF5350', border: '#E53935', text: '#FFFFFF', score: 0.80 },
  orange_2:  { fill: '#FF7043', border: '#F4511E', text: '#FFFFFF', score: 0.70 },
  orange_1:  { fill: '#FF8A65', border: '#FF7043', text: '#BF360C', score: 0.60 },
  yellow_2:  { fill: '#FFEE58', border: '#FDD835', text: '#5D3A00', score: 0.50 },
  yellow_1:  { fill: '#FFF9C4', border: '#FFF176', text: '#6B5E00', score: 0.40 },
  green_3:   { fill: '#A5D6A7', border: '#66BB6A', text: '#1B5E20', score: 0.30 },
  green_2:   { fill: '#C8E6C9', border: '#81C784', text: '#1B5E20', score: 0.20 },
  green_1:   { fill: '#E8F5E9', border: '#A5D6A7', text: '#1B5E20', score: 0.10 },
  for_later: { fill: '#CE93D8', border: '#AB47BC', text: '#4A148C', score: 0.00 },
  no_date:   { fill: '#B3E5FC', border: '#81D4FA', text: '#0277BD', score: 0.10 },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function buildCustomConfig(custom: CustomUrgencyColors): Record<UrgencyLevel, TierConfig> {
  return Object.fromEntries(
    (Object.keys(TIER_CONFIG_GREEN_URGENT) as UrgencyLevel[]).map(k => [
      k,
      { ...TIER_CONFIG_GREEN_URGENT[k], ...custom[k] },
    ])
  ) as Record<UrgencyLevel, TierConfig>
}

export function getDefaultCustomColors(
  scheme: 'green_urgent' | 'red_urgent' = 'green_urgent'
): CustomUrgencyColors {
  const cfg = scheme === 'red_urgent' ? TIER_CONFIG_RED_URGENT : TIER_CONFIG_GREEN_URGENT
  return Object.fromEntries(
    (Object.keys(cfg) as UrgencyLevel[]).map(k => [
      k,
      { fill: cfg[k].fill, border: cfg[k].border, text: cfg[k].text },
    ])
  ) as CustomUrgencyColors
}

function classifyLevel(daysRemaining: number): UrgencyLevel {
  if (daysRemaining < 0)   return 'overdue'
  if (daysRemaining === 0) return 'red_2'
  if (daysRemaining <= 2)  return 'red_1'
  if (daysRemaining <= 4)  return 'orange_2'
  if (daysRemaining <= 6)  return 'orange_1'
  if (daysRemaining <= 9)  return 'yellow_2'
  if (daysRemaining <= 14) return 'yellow_1'
  if (daysRemaining <= 21) return 'green_3'
  if (daysRemaining <= 30) return 'green_2'
  return 'green_1'
}

export function getUrgencyInfo({
  due_date,
  for_later,
  created_at,
  today = new Date(),
  colorScheme,
  customColors,
}: {
  due_date: string | null
  for_later: boolean
  created_at: string
  today?: Date
  colorScheme?: 'green_urgent' | 'red_urgent' | 'custom'
  customColors?: CustomUrgencyColors
}): UrgencyInfo {
  const TIER_CONFIG =
    colorScheme === 'custom' && customColors
      ? buildCustomConfig(customColors)
      : colorScheme === 'red_urgent'
        ? TIER_CONFIG_RED_URGENT
        : TIER_CONFIG_GREEN_URGENT

  const todayStart = startOfDay(today)

  if (for_later) {
    const cfg = TIER_CONFIG.for_later
    return {
      level: 'for_later',
      score: 0,
      daysRemaining: null,
      color: cfg.fill,
      borderColor: cfg.border,
      textColor: cfg.text,
      diameter: 80,
      ringProgress: 0,
    }
  }

  if (!due_date) {
    const cfg = TIER_CONFIG.no_date
    return {
      level: 'no_date',
      score: cfg.score,
      daysRemaining: null,
      color: cfg.fill,
      borderColor: cfg.border,
      textColor: cfg.text,
      diameter: Math.round(80 + 120 * cfg.score),
      ringProgress: 0,
    }
  }

  const dueDate = startOfDay(parseISO(due_date))
  const createdDate = startOfDay(parseISO(created_at))
  const daysRemaining = differenceInDays(dueDate, todayStart)

  const level = classifyLevel(daysRemaining)
  const cfg = TIER_CONFIG[level]
  const { score } = cfg

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
    color: cfg.fill,
    borderColor: cfg.border,
    textColor: cfg.text,
    diameter,
    ringProgress,
  }
}
