'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types'
import { ListRow } from '@/components/list-view/ListRow'
import { TaskModal } from '@/components/modals/TaskModal'

export default function ForLaterPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .eq('for_later', true)
        .order('created_at', { ascending: false })
      if (data) setTasks(data)
    }
    load()
    const channel = supabase
      .channel('for-later-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <div
        className="px-6 py-4"
        style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'white' }}
      >
        <h2 className="text-base font-semibold">For Later</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Things you'll get to — no rush</p>
      </div>
      <div className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">🪴</p>
            <p className="text-lg font-medium">Nothing parked here yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Add tasks with "Park it for later" toggled on
            </p>
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
    </div>
  )
}
