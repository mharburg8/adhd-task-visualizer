import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/nav/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: boards } = await supabase
    .from('boards')
    .select('id, name, user_id, created_at')
    .order('created_at', { ascending: true })

  return (
    <div className="flex min-h-screen">
      <Sidebar initialBoards={boards ?? []} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
