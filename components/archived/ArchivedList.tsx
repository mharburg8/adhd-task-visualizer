'use client'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import type { Task } from '@/types'
import { unarchiveTask } from '@/app/actions/tasks'

export function ArchivedList({ tasks }: { tasks: Task[] }) {
  const router = useRouter()

  async function handleUnarchive(id: string) {
    await unarchiveTask(id)
    router.refresh()
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-4xl mb-4">📦</p>
        <p className="text-lg font-medium">Nothing archived yet</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Completed tasks will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <div
          key={task.id}
          className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3 flex items-center justify-between gap-3 opacity-70 hover:opacity-100 transition-opacity"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{task.name}</p>
            {task.archived_at && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Archived {format(parseISO(task.archived_at), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <button
            onClick={() => handleUnarchive(task.id)}
            className="shrink-0 h-8 px-3 rounded-lg border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-muted)] hover:bg-gray-50 hover:text-[var(--color-text)] transition-colors"
          >
            Unarchive
          </button>
        </div>
      ))}
    </div>
  )
}
