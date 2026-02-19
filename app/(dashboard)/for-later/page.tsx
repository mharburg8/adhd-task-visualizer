import { createClient } from '@/lib/supabase/server'
import { ForLaterClient } from '@/components/list-view/ForLaterClient'

export default async function ForLaterPage() {
  const supabase = await createClient()
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'active')
    .eq('for_later', true)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <h2 className="text-base font-semibold">For Later</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Things you'll get to — no rush</p>
      </div>
      <ForLaterClient initialTasks={tasks ?? []} />
    </div>
  )
}
