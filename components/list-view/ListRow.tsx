import type { Task, CustomUrgencyColors } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { format, parseISO } from 'date-fns'

interface ListRowProps {
  task: Task
  onClick: (task: Task) => void
  dateFormat: string
  colorScheme?: 'green_urgent' | 'red_urgent' | 'custom'
  customColors?: CustomUrgencyColors
}

export function ListRow({ task, onClick, dateFormat, colorScheme = 'green_urgent', customColors }: ListRowProps) {
  const urgency = getUrgencyInfo({
    due_date: task.due_date,
    for_later: task.for_later,
    created_at: task.created_at,
    colorScheme,
    customColors,
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
