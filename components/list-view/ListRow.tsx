'use client'
import type { Task, CustomUrgencyColors, UrgencyLevel } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { archiveTask } from '@/app/actions/tasks'
import { format, parseISO } from 'date-fns'

interface ListRowProps {
  task: Task
  onClick: (task: Task) => void
  dateFormat: string
  colorScheme?: 'green_urgent' | 'red_urgent' | 'custom'
  customColors?: CustomUrgencyColors
}

// Dark saturated row colors matching the design reference (image 1)
const ROW_BG: Record<UrgencyLevel, string> = {
  overdue:   '#3D0000',
  red_2:     '#7A0000',
  red_1:     '#990000',
  orange_2:  '#7A3300',
  orange_1:  '#7A5500',
  yellow_2:  '#5C5C00',
  yellow_1:  '#4A4A00',
  green_3:   '#1A4A1A',
  green_2:   '#1A3A1A',
  green_1:   '#143314',
  for_later: '#2D1A3D',
  no_date:   '#1A1A3D',
}

const ROW_TEXT: Record<UrgencyLevel, string> = {
  overdue:   '#FFB3B3',
  red_2:     '#FFFFFF',
  red_1:     '#FFFFFF',
  orange_2:  '#FFD699',
  orange_1:  '#FFE0A3',
  yellow_2:  '#FFFF99',
  yellow_1:  '#FFFFA0',
  green_3:   '#AAFFAA',
  green_2:   '#99FF99',
  green_1:   '#88EE88',
  for_later: '#E8B8F0',
  no_date:   '#B3E5FC',
}

export function ListRow({ task, onClick, dateFormat, colorScheme = 'green_urgent', customColors }: ListRowProps) {
  const urgency = getUrgencyInfo({
    due_date: task.due_date,
    for_later: task.for_later,
    created_at: task.created_at,
    colorScheme,
    customColors,
  })

  const rowHeight = Math.round(52 + urgency.score * 68)  // 52px → 120px
  const barPct = urgency.daysRemaining !== null && urgency.daysRemaining > 0
    ? Math.min(urgency.daysRemaining / 30, 1) * 100
    : 0

  const dueLabel = (() => {
    if (!task.due_date) return '—'
    if (urgency.daysRemaining === null) return '—'
    if (urgency.daysRemaining < 0) return `${Math.abs(urgency.daysRemaining)} days ago!`
    if (urgency.daysRemaining === 0) return 'Today!'
    if (urgency.daysRemaining === 1) return 'Tomorrow'
    return format(parseISO(task.due_date), dateFormat === 'DD/MM/YYYY' ? 'dd/MM/yyyy' : 'MM/dd/yyyy')
  })()

  const timeLabel = (() => {
    if (urgency.daysRemaining === null) return ''
    if (urgency.daysRemaining < 0) return ''
    if (urgency.daysRemaining === 0) return 'Due today!'
    return `${urgency.daysRemaining} day${urgency.daysRemaining !== 1 ? 's' : ''} left`
  })()

  const bg = ROW_BG[urgency.level]
  const fg = ROW_TEXT[urgency.level]

  return (
    <div
      className="grid w-full border-b border-black/20 hover:brightness-125 transition-all cursor-pointer"
      style={{ gridTemplateColumns: '2fr 1fr 2fr 44px', minHeight: rowHeight, backgroundColor: bg }}
      onClick={() => onClick(task)}
    >
      {/* Task name */}
      <div className="flex items-center px-4 py-2">
        <span className="font-bold text-sm leading-snug" style={{ color: fg }}>
          {task.name}
        </span>
      </div>

      {/* Due date */}
      <div className="flex items-center px-3">
        <span className="text-sm font-medium whitespace-nowrap" style={{ color: fg }}>
          {dueLabel}
        </span>
      </div>

      {/* Time remaining bar */}
      <div className="relative flex items-center overflow-hidden">
        {barPct > 0 && (
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center justify-end pr-3"
            style={{ width: `${barPct}%`, backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: fg }}>
              {timeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Archive (complete) button */}
      <button
        onClick={e => { e.stopPropagation(); archiveTask(task.id) }}
        className="flex items-center justify-center hover:bg-white/20 transition-colors"
        aria-label="Complete task"
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={fg} strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  )
}
