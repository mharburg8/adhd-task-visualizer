'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Settings } from '@/types'
import { BubbleBoard } from '@/components/bubble-board/BubbleBoard'
import { ListView } from '@/components/list-view/ListView'
import { TaskModal } from '@/components/modals/TaskModal'

export default function MainBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [view, setView] = useState<'bubble' | 'list'>('bubble')
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>(undefined)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .eq('for_later', false)
        .order('created_at', { ascending: false })
      if (tasksData) setTasks(tasksData)

      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .single()
      if (settingsData) setSettings(settingsData)
    }
    load()

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'white' }}
      >
        <h2 className="text-base font-semibold">My Board</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg p-1" style={{ backgroundColor: '#F3F4F6' }}>
            {(['bubble', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize"
                style={{
                  backgroundColor: view === v ? 'white' : 'transparent',
                  boxShadow: view === v ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                  color: view === v ? 'var(--color-text)' : 'var(--color-text-muted)',
                }}
              >
                {v === 'bubble' ? 'Bubbles' : 'List'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSelectedTask(null)}
            className="h-10 px-4 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--color-upcoming)', color: 'var(--color-text)' }}
          >
            + Add task
          </button>
        </div>
      </div>

      {view === 'bubble' ? (
        <BubbleBoard tasks={tasks} onTaskClick={setSelectedTask} />
      ) : (
        <ListView
          tasks={tasks}
          onTaskClick={setSelectedTask}
          dateFormat={settings?.date_format ?? 'MM/DD/YYYY'}
        />
      )}

      {selectedTask !== undefined && (
        <TaskModal task={selectedTask} onClose={() => setSelectedTask(undefined)} />
      )}
    </div>
  )
}
