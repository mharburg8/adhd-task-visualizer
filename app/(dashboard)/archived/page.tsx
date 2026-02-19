import { createClient } from '@/lib/supabase/server'
import { format, parseISO } from 'date-fns'

export default async function ArchivedPage() {
  const supabase = await createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'archived')
    .order('archived_at', { ascending: false })
    .limit(100)

  return (
    <div className="flex flex-col h-screen">
      <div
        className="px-6 py-4"
        style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'white' }}
      >
        <h2 className="text-base font-semibold">Archived</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Tasks you've finished or set aside</p>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!tasks || tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl mb-4">📦</p>
            <p className="text-lg font-medium">Nothing archived yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Completed tasks will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="bg-white rounded-xl px-4 py-3 opacity-70"
                style={{ border: '1px solid var(--color-border)' }}
              >
                <p className="text-sm font-medium">{task.name}</p>
                {task.archived_at && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
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
