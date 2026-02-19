import type { Task, CustomUrgencyColors } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { ListRow } from './ListRow'

interface ListViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  dateFormat: string
  colorScheme?: 'green_urgent' | 'red_urgent' | 'custom'
  customColors?: CustomUrgencyColors
}

export function ListView({ tasks, onTaskClick, dateFormat, colorScheme = 'green_urgent', customColors }: ListViewProps) {
  const sorted = [...tasks].sort((a, b) => {
    const scoreA = getUrgencyInfo({ due_date: a.due_date, for_later: a.for_later, created_at: a.created_at, colorScheme, customColors }).score
    const scoreB = getUrgencyInfo({ due_date: b.due_date, for_later: b.for_later, created_at: b.created_at, colorScheme, customColors }).score
    return scoreB - scoreA
  })

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center" style={{ background: '#0D0D1A', flex: 1 }}>
        <p className="text-4xl mb-4">🌱</p>
        <p className="text-lg font-medium text-gray-300">Nothing on your plate right now</p>
        <p className="text-sm text-gray-500 mt-1">Add a task to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto" style={{ background: '#0D0D1A' }}>
      {/* Column headers */}
      <div
        className="grid sticky top-0 z-10 border-b border-white/10"
        style={{ gridTemplateColumns: '2fr 1fr 2fr 44px', background: '#0D0D1A' }}
      >
        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Task</div>
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Due</div>
        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1">
          Time Remaining <span className="text-gray-600">▶</span>
        </div>
        <div />
      </div>

      {sorted.map(task => (
        <ListRow
          key={task.id}
          task={task}
          onClick={onTaskClick}
          dateFormat={dateFormat}
          colorScheme={colorScheme}
          customColors={customColors}
        />
      ))}
    </div>
  )
}
