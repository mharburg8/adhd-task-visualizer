import { createClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'

export default async function ArchivedPage() {
  const supabase = createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'archived')
    .order('archived_at', { ascending: false })
    .limit(100)

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <h2 className="text-base font-semibold">Archived</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Tasks you've finished or set aside</p>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!tasks || tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-lg font-medium">Nothing archived yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Completed tasks will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-[var(--color-border)] px-4 py-3 opacity-70"
              >
                <p className="text-sm font-medium">{task.name}</p>
                {task.archived_at && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Archived {format(parseISO(task.archived_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
