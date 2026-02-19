'use client'
import { useState, useEffect } from 'react'
import type { Task } from '@/types'
import { createTask, updateTask, archiveTask, deleteTask } from '@/app/actions/tasks'
import { pushTaskToCalendar } from '@/app/actions/calendar'

interface TaskModalProps {
  task?: Task | null        // null = create mode
  onClose: () => void
  googleCalendarEnabled?: boolean
  boardId?: string | null
}

export function TaskModal({ task, onClose, googleCalendarEnabled, boardId }: TaskModalProps) {
  const [name, setName] = useState(task?.name ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [details, setDetails] = useState(task?.details ?? '')
  const [forLater, setForLater] = useState(task?.for_later ?? false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const data = {
      name,
      due_date: dueDate || null,
      details: details || null,
      for_later: forLater,
    }
    if (task) {
      await updateTask(task.id, data)
    } else {
      await createTask({ ...data, board_id: boardId ?? null })
    }
    setSuccess(true)
    setTimeout(onClose, 1200)
  }

  async function handleArchive() {
    if (!task) return
    setLoading(true)
    await archiveTask(task.id)
    onClose()
  }

  async function handleDelete() {
    if (!task) return
    setLoading(true)
    await deleteTask(task.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white rounded-t-3xl md:rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">
            {task ? 'Edit task' : 'New task'}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">✓</p>
            <p className="font-medium text-[var(--color-soon)] saturate-150">
              {task ? 'Task updated' : 'Task added'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="task-name">
                Task name <span className="text-[var(--color-overdue)]">*</span>
              </label>
              <input
                id="task-name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="What needs doing?"
                className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="due-date">
                Due date
              </label>
              <input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                disabled={forLater}
                className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="details">
                Details
              </label>
              <textarea
                id="details"
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Any notes? Totally optional."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-for-later)]/20">
              <div>
                <p className="text-sm font-medium">Park it for later</p>
                <p className="text-xs text-[var(--color-text-muted)]">No pressure — it'll wait</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={forLater}
                onClick={() => setForLater(!forLater)}
                className={`relative w-12 h-7 rounded-full transition-colors ${forLater ? 'bg-[var(--color-for-later)]' : 'bg-gray-200'}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${forLater ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-[var(--color-upcoming)] font-medium text-[var(--color-text)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '…' : task ? 'Save changes' : 'Add task'}
            </button>

            {task?.due_date && googleCalendarEnabled && (
              <button
                type="button"
                onClick={async () => {
                  setLoading(true)
                  await pushTaskToCalendar(task.id)
                  setLoading(false)
                }}
                disabled={loading}
                className="w-full h-10 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>📅</span>
                {task.google_event_id ? 'Update in Google Calendar' : 'Add to Google Calendar'}
              </button>
            )}

            {task && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={loading}
                  className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:bg-gray-50 disabled:opacity-50"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 h-10 rounded-xl border border-[var(--color-overdue)]/30 text-sm text-[var(--color-overdue)] hover:bg-[var(--color-overdue)]/10 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
