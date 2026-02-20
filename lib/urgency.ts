import { differenceInDays, parseISO, startOfDay } from 'date-fns'
import type { UrgencyInfo, UrgencyLevel, CustomUrgencyColors } from '@/types'

type TierConfig = {
  fill: string
  border: string
  text: string
  score: number
}

// Default: dark red = urgent, light green = safe
const TIER_CONFIG_GREEN_URGENT: Record<UrgencyLevel, TierConfig> = {
  overdue:   { fill: '#5C0000', border: '#8B0000', text: '#FFB3B3', score: 1.00 },  // dark red
  red_2:     { fill: '#CC0000', border: '#990000', text: '#FFFFFF', score: 0.90 },  // red (0-2 days)
  red_1:     { fill: '#FF5555', border: '#CC2222', text: '#FFFFFF', score: 0.80 },  // light red (3-4 days)
  orange_2:  { fill: '#CC4400', border: '#993300', text: '#FFFFFF', score: 0.70 },  // dark orange (5-6 days)
  orange_1:  { fill: '#FF6600', border: '#CC4400', text: '#FFFFFF', score: 0.60 },  // orange (7-8 days)
  yellow_2:  { fill: '#AA8800', border: '#886600', text: '#FFFFFF', score: 0.50 },  // dark yellow (9-11 days)
  yellow_1:  { fill: '#FFEE55', border: '#CCBB00', text: '#3D3300', score: 0.40 },  // light yellow (12-15 days)
  green_3:   { fill: '#1A6622', border: '#0F4418', text: '#AAFFAA', score: 0.30 },  // dark green (16-20 days)
  green_2:   { fill: '#44AA44', border: '#338833', text: '#FFFFFF', score: 0.20 },  // light green (21-30 days)
  green_1:   { fill: '#77CC77', border: '#55AA55', text: '#1A3D20', score: 0.10 },  // lighter green (30+)
  for_later: { fill: '#CE93D8', border: '#AB47BC', text: '#4A148C', score: 0.00 },  // lavender
  no_date:   { fill: '#B3E5FC', border: '#81D4FA', text: '#01579B', score: 0.10 },  // sky blue
}

// Electric green: green = most urgent, red = least urgent, orange/yellow same as default
const TIER_CONFIG_ELECTRIC_GREEN: Record<UrgencyLevel, TierConfig> = {
  overdue:   { fill: '#39FF14', border: '#00DD00', text: '#003300', score: 1.00 },  // neon green (most urgent)
  red_2:     { fill: '#00EE33', border: '#00BB22', text: '#002200', score: 0.90 },  // bright green
  red_1:     { fill: '#33CC44', border: '#228833', text: '#EEFFEE', score: 0.80 },  // medium-bright green
  orange_2:  { fill: '#CC4400', border: '#993300', text: '#FFFFFF', score: 0.70 },  // dark orange (same as default)
  orange_1:  { fill: '#FF6600', border: '#CC4400', text: '#FFFFFF', score: 0.60 },  // orange (same as default)
  yellow_2:  { fill: '#AA8800', border: '#886600', text: '#FFFFFF', score: 0.50 },  // dark yellow (same as default)
  yellow_1:  { fill: '#FFEE55', border: '#CCBB00', text: '#3D3300', score: 0.40 },  // light yellow (same as default)
  green_3:   { fill: '#5C0000', border: '#3D0000', text: '#FFB3B3', score: 0.30 },  // dark red (swapped from dark green)
  green_2:   { fill: '#CC0000', border: '#990000', text: '#FFFFFF', score: 0.20 },  // medium red (swapped from light green)
  green_1:   { fill: '#FF5555', border: '#CC2222', text: '#FFFFFF', score: 0.10 },  // light red (swapped from lighter green)
  for_later: { fill: '#CE93D8', border: '#AB47BC', text: '#4A148C', score: 0.00 },
  no_date:   { fill: '#B3E5FC', border: '#81D4FA', text: '#01579B', score: 0.10 },
}

// Legacy red palette (kept for backwards compat)
const TIER_CONFIG_RED_URGENT: Record<UrgencyLevel, TierConfig> = {
  overdue:   { fill: '#3D0000', border: '#7F0000', text: '#FFFFFF', score: 1.00 },
  red_2:     { fill: '#7A0000', border: '#B71C1C', text: '#FFFFFF', score: 0.90 },
  red_1:     { fill: '#C62828', border: '#E53935', text: '#FFFFFF', score: 0.80 },
  orange_2:  { fill: '#BF360C', border: '#E64A19', text: '#FFFFFF', score: 0.70 },
  orange_1:  { fill: '#E64A19', border: '#FF5722', text: '#FFFFFF', score: 0.60 },
  yellow_2:  { fill: '#FF8F00', border: '#FFA000', text: '#3D2800', score: 0.50 },
  yellow_1:  { fill: '#FFB300', border: '#FFC107', text: '#3D2800', score: 0.40 },
  green_3:   { fill: '#795548', border: '#5D4037', text: '#FFCCBC', score: 0.30 },
  green_2:   { fill: '#6D4C41', border: '#4E342E', text: '#FFCCBC', score: 0.20 },
  green_1:   { fill: '#4E342E', border: '#3E2723', text: '#FFCCBC', score: 0.10 },
  for_later: { fill: '#CE93D8', border: '#AB47BC', text: '#4A148C', score: 0.00 },
  no_date:   { fill: '#B3E5FC', border: '#81D4FA', text: '#01579B', score: 0.10 },
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
  scheme: 'green_urgent' | 'red_urgent' | 'electric_green' = 'green_urgent'
): CustomUrgencyColors {
  const cfg =
    scheme === 'red_urgent' ? TIER_CONFIG_RED_URGENT :
    scheme === 'electric_green' ? TIER_CONFIG_ELECTRIC_GREEN :
    TIER_CONFIG_GREEN_URGENT
  return Object.fromEntries(
    (Object.keys(cfg) as UrgencyLevel[]).map(k => [
      k,
      { fill: cfg[k].fill, border: cfg[k].border, text: cfg[k].text },
    ])
  ) as CustomUrgencyColors
}

function classifyLevel(daysRemaining: number): UrgencyLevel {
  if (daysRemaining < 0)   return 'overdue'
  if (daysRemaining <= 2)  return 'red_2'     // 0–2 days: red, fast pulse
  if (daysRemaining <= 4)  return 'red_1'     // 3–4 days: light red, normal pulse
  if (daysRemaining <= 6)  return 'orange_2'  // 5–6 days: dark orange
  if (daysRemaining <= 8)  return 'orange_1'  // 7–8 days: orange
  if (daysRemaining <= 11) return 'yellow_2'  // 9–11 days: dark yellow
  if (daysRemaining <= 15) return 'yellow_1'  // 12–15 days: light yellow
  if (daysRemaining <= 20) return 'green_3'   // 16–20 days: dark green
  if (daysRemaining <= 30) return 'green_2'   // 21–30 days: light green
  return 'green_1'                             // 30+ days: lighter green
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
  colorScheme?: 'green_urgent' | 'red_urgent' | 'electric_green' | 'custom'
  customColors?: CustomUrgencyColors
}): UrgencyInfo {
  const TIER_CONFIG =
    colorScheme === 'custom' && customColors
      ? buildCustomConfig(customColors)
      : colorScheme === 'red_urgent'
        ? TIER_CONFIG_RED_URGENT
        : colorScheme === 'electric_green'
          ? TIER_CONFIG_ELECTRIC_GREEN
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
