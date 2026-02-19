import { addDays, format, startOfDay } from 'date-fns'

export interface VoiceParseResult {
  taskName: string
  dueDate: string | null   // YYYY-MM-DD
  forLater: boolean
}

const DAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}

function fmt(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Next occurrence of dayOfWeek strictly after `from` (1–7 days ahead). */
function nextWeekday(dayOfWeek: number, from: Date): Date {
  const diff = ((dayOfWeek - from.getDay() + 7) % 7) || 7
  return addDays(from, diff)
}

export function parseVoiceInput(raw: string): VoiceParseResult {
  let text = raw.toLowerCase().trim()
  const today = startOfDay(new Date())

  // Strip common voice prefixes
  text = text.replace(
    /^(remind me (to|about)|add( a| an)?|create( a| an)?|schedule( a| an)?|set up( a| an)?|i need to|need to|i have (a |an |to )?|have to|don't forget to|remember to|note that?)\s+/i,
    '',
  )
  // Strip trailing filler
  text = text.replace(/\s+(please|okay|ok|thanks?|thank you)\.?$/i, '')

  let dueDate: string | null = null

  const dayPattern = Object.keys(DAYS).join('|')
  const monPattern = Object.keys(MONTHS).join('|')

  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    // "today"
    [/\btoday\b/, () => fmt(today)],
    // "tomorrow"
    [/\btomorrow\b/, () => fmt(addDays(today, 1))],
    // "next week"
    [/\bnext week\b/, () => fmt(addDays(today, 7))],
    // "in X days/weeks"
    [/\bin (\d+) weeks?\b/, m => fmt(addDays(today, parseInt(m[1]) * 7))],
    [/\bin (\d+) days?\b/,  m => fmt(addDays(today, parseInt(m[1])))],
    // "next [weekday]" — occurrence after the nearest one
    [new RegExp(`\\bnext (${dayPattern})\\b`),
      m => fmt(nextWeekday(DAYS[m[1]], addDays(today, 7)))],
    // "this [weekday]" / "on [weekday]" / bare "[weekday]"
    [new RegExp(`\\b(?:(?:this|on) )?(${dayPattern})\\b`),
      m => fmt(nextWeekday(DAYS[m[1]], today))],
    // "[month] [day][st/nd/rd/th]"
    [new RegExp(`\\b(${monPattern}) (\\d{1,2})(?:st|nd|rd|th)?\\b`), m => {
      const month = MONTHS[m[1]]
      const day   = parseInt(m[2])
      let d = new Date(today.getFullYear(), month, day)
      if (d <= today) d = new Date(today.getFullYear() + 1, month, day)
      return fmt(d)
    }],
    // "the [day][st/nd/rd/th]"
    [/\bthe (\d{1,2})(?:st|nd|rd|th)?\b/, m => {
      const day = parseInt(m[1])
      let d = new Date(today.getFullYear(), today.getMonth(), day)
      if (d <= today) d = new Date(today.getFullYear(), today.getMonth() + 1, day)
      return fmt(d)
    }],
  ]

  for (const [re, handler] of patterns) {
    const match = text.match(re)
    if (match) {
      dueDate = handler(match)
      text = text.replace(match[0], ' ').replace(/\s+/g, ' ').trim()
      break
    }
  }

  // Clean task name
  let taskName = text
    .replace(/^(and|also|,|\.)\s*/i, '')
    .replace(/[.,!?]+$/, '')
    .trim()

  if (taskName) taskName = taskName[0].toUpperCase() + taskName.slice(1)

  return {
    taskName: taskName || 'New task',
    dueDate,
    forLater: dueDate === null,
  }
}
