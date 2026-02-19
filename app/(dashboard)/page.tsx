import { createClient } from '@/lib/supabase/server'
import { BoardClient } from '@/components/bubble-board/BoardClient'

export default async function MainBoardPage() {
  const supabase = createClient()

  const [{ data: tasks }, { data: settings }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .eq('status', 'active')
      .eq('for_later', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('settings')
      .select('*')
      .single(),
  ])

  return (
    <BoardClient
      initialTasks={tasks ?? []}
      initialSettings={settings ?? null}
    />
  )
}
