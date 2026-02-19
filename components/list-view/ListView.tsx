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
