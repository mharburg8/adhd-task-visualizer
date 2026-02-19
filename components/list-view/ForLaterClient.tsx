'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types'
import { archiveTask } from '@/app/actions/tasks'
import { TaskModal } from '@/components/modals/TaskModal'

interface ForLaterClientProps {
  initialTasks: Task[]
}

export function ForLaterClient({ initialTasks }: ForLaterClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => {
    async function reload() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .eq('for_later', true)
        .order('created_at', { ascending: false })
      if (data) setTasks(data)
    }

    const channel = supabase
      .channel('for-later-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, reload)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <>
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">🪴</p>
            <p className="text-lg font-medium">Nothing parked here yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Add tasks with "Park it for later" toggled on</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#CE93D8' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.name}</p>
                  {task.details && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">{task.details}</p>
                  )}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); archiveTask(task.id) }}
                  className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-green-100 hover:border-green-300 border border-gray-200 transition-colors"
                  aria-label="Complete task"
                >
                  <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#16a34a" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedTask !== undefined && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(undefined)} />
      )}
    </>
  )
}
