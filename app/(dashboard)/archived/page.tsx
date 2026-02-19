import { createClient } from '@/lib/supabase/server'
import { ArchivedList } from '@/components/archived/ArchivedList'
import type { Task } from '@/types'

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
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <h2 className="text-base font-semibold">Archived</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Tasks you've finished or set aside</p>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <ArchivedList tasks={(tasks as Task[]) ?? []} />
      </div>
    </div>
  )
}
