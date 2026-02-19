'use client'
import type { Task, CustomUrgencyColors, UrgencyLevel } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { format, parseISO } from 'date-fns'

interface ListRowProps {
  task: Task
  onClick: (task: Task) => void
  onComplete: (id: string) => void
  dateFormat: string
  colorScheme?: 'green_urgent' | 'red_urgent' | 'electric_green' | 'custom'
  customColors?: CustomUrgencyColors
  completing?: boolean
}

const TOTAL_DAYS = 30
const REMAIN_COLOR = '#A5D6A7'

function animClass(level: UrgencyLevel): string {
  if (level === 'overdue') return 'list-row-strobe'
  if (level === 'red_2')   return 'list-row-pulse-fast'
  if (level === 'red_1')   return 'list-row-pulse-normal'
  return ''
}

export function ListRow({ task, onClick, onComplete, dateFormat, colorScheme = 'green_urgent', customColors, completing }: ListRowProps) {
  const urgency = getUrgencyInfo({
    due_date: task.due_date,
    for_later: task.for_later,
    created_at: task.created_at,
    colorScheme,
    customColors,
  })

  const rowHeight = Math.round(32 + urgency.score * 98)
  const daysLeft = urgency.daysRemaining ?? 0

  const hasProgress = urgency.level !== 'for_later' && urgency.level !== 'no_date' && urgency.daysRemaining !== null
  const elapsedPct = !hasProgress || urgency.level === 'overdue'
    ? 1
    : Math.min(1, Math.max(0.02, 1 - (daysLeft / TOTAL_DAYS)))

  const anim = animClass(urgency.level)
  const fill = urgency.color
  const fg   = urgency.textColor
  const taskFontSize = Math.max(11, rowHeight * 0.13)
  const dueFontSize  = Math.max(11, rowHeight * 0.115)

  const dueLabel = (() => {
    if (!task.due_date) return '—'
    if (urgency.daysRemaining === null) return '—'
    if (urgency.daysRemaining < 0) return `${Math.abs(urgency.daysRemaining)} days ago!`
    if (urgency.daysRemaining === 0) return 'Today!'
    if (urgency.daysRemaining === 1) return 'Tomorrow'
    return format(parseISO(task.due_date), dateFormat === 'DD/MM/YYYY' ? 'dd/MM/yyyy' : 'MM/dd/yyyy')
  })()

  const remainLabel = (() => {
    if (!hasProgress || urgency.daysRemaining === null || urgency.daysRemaining <= 0) return ''
    if (urgency.daysRemaining === 1) return '1 day left'
    return `${urgency.daysRemaining} days left`
  })()

  const coloredDiv = (extra: React.CSSProperties): React.CSSProperties => ({
    background: fill,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    ...extra,
  })

  // When completing: collapse height to 0 smoothly so rows below slide up
  const rowStyle: React.CSSProperties = completing
    ? { height: 0, opacity: 0, overflow: 'hidden', transition: 'height 0.35s ease, opacity 0.2s ease', borderBottom: 'none', pointerEvents: 'none' }
    : { height: rowHeight, borderBottom: '1px solid rgba(0,0,0,0.3)', transition: 'height 0.35s ease, opacity 0.2s ease' }

  return (
    <div
      className="list-row flex items-stretch cursor-pointer"
      style={rowStyle}
      onClick={() => onClick(task)}
    >
      {/* Complete (archive) button — LEFT side */}
      <button
        onClick={e => { e.stopPropagation(); onComplete(task.id) }}
        style={{ width: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0D1A' }}
        className="hover:bg-white/10 transition-colors"
        aria-label="Complete task"
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="#6B7280" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>

      {/* TASK column */}
      <div className={anim} style={coloredDiv({ width: 200, padding: '0 18px', borderRight: '1px solid rgba(0,0,0,0.2)' })}>
        <span style={{ fontSize: taskFontSize, fontWeight: 800, color: fg, lineHeight: 1.2, userSelect: 'none' }}>
          {task.name}
        </span>
      </div>

      {/* DUE column */}
      <div className={anim} style={coloredDiv({ width: 160, padding: '0 16px', borderRight: '2px solid rgba(0,0,0,0.25)' })}>
        <span style={{ fontSize: dueFontSize, fontWeight: 700, color: fg, userSelect: 'none', whiteSpace: 'nowrap' }}>
          {dueLabel}
        </span>
      </div>

      {/* TIME REMAINING column */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Elapsed portion (urgency color) */}
        <div
          className={anim}
          style={{ width: `${elapsedPct * 100}%`, background: fill, flexShrink: 0, transition: 'width 0.4s ease' }}
        />

        {/* Divider tick */}
        {elapsedPct < 1 && (
          <div style={{ width: 3, background: 'rgba(0,0,0,0.35)', flexShrink: 0 }} />
        )}

        {/* Remaining (green) portion */}
        {elapsedPct < 1 && (
          <div style={{ flex: 1, background: REMAIN_COLOR, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
            {remainLabel && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2E7D32', opacity: 0.85, userSelect: 'none' }}>
                {remainLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
