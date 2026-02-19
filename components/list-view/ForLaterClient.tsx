'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types'
import { ListRow } from './ListRow'
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
          <div className="p-4">
            {tasks.map(task => (
              <ListRow key={task.id} task={task} onClick={setSelectedTask} dateFormat="MM/DD/YYYY" />
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
