'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Settings } from '@/types'
import { BubbleBoard } from '@/components/bubble-board/BubbleBoard'
import { ListView } from '@/components/list-view/ListView'
import { TaskModal } from '@/components/modals/TaskModal'
import { VoiceTaskCapture } from '@/components/voice/VoiceTaskCapture'

interface BoardClientProps {
  initialTasks: Task[]
  initialSettings: Settings | null
  boardId?: string
  boardName?: string
}

export function BoardClient({ initialTasks, initialSettings, boardId, boardName }: BoardClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [view, setView] = useState<'bubble' | 'list'>(initialSettings?.default_view ?? 'bubble')
  const [selectedTask, setSelectedTask] = useState<Task | null | undefined>(undefined)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const supabase = createClient()

  const colorScheme = initialSettings?.urgency_color_scheme ?? 'green_urgent'
  const customColors = initialSettings?.custom_urgency_colors ?? undefined
  const voiceEnabled = initialSettings?.voice_enabled ?? false

  useEffect(() => {
    async function reload() {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .eq('for_later', false)
        .order('created_at', { ascending: false })

      if (boardId) {
        query = query.eq('board_id', boardId)
      } else {
        query = query.is('board_id', null)
      }

      const { data } = await query
      if (data) setTasks(data)
    }

    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
      }, () => reload())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [boardId])

  return (
    <div className="flex flex-col h-screen relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <h2 className="text-base font-semibold">{boardName ?? 'My Board'}</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('bubble')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'bubble' ? 'bg-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}
            >
              Bubbles
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}
            >
              List
            </button>
          </div>
          {voiceEnabled && (
            <button
              onClick={() => setVoiceOpen(true)}
              className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              aria-label="Voice capture"
              title="Add tasks by voice"
            >
              🎤
            </button>
          )}
          <button
            onClick={() => setSelectedTask(null)}
            className="h-10 px-4 rounded-xl bg-[var(--color-upcoming)] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Add task
          </button>
        </div>
      </div>

      {/* Board */}
      {view === 'bubble' ? (
        <BubbleBoard
          tasks={tasks}
          onTaskClick={setSelectedTask}
          colorScheme={colorScheme}
          customColors={customColors}
        />
      ) : (
        <ListView
          tasks={tasks}
          onTaskClick={setSelectedTask}
          dateFormat={initialSettings?.date_format ?? 'MM/DD/YYYY'}
          colorScheme={colorScheme}
          customColors={customColors}
        />
      )}

      {/* Task modal */}
      {selectedTask !== undefined && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(undefined)}
          googleCalendarEnabled={initialSettings?.google_calendar_enabled ?? false}
          boardId={boardId ?? null}
        />
      )}

      {/* Voice capture */}
      {voiceOpen && (
        <VoiceTaskCapture
          boardId={boardId}
          onClose={() => setVoiceOpen(false)}
          onSaved={() => setVoiceOpen(false)}
        />
      )}
    </div>
  )
}
