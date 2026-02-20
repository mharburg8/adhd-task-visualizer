import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/nav/Sidebar'
import { ThemeApplier } from '@/components/ThemeApplier'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const [{ data: boards }, { data: settingsData }] = await Promise.all([
    supabase.from('boards').select('id, name, user_id, created_at').order('created_at', { ascending: true }),
    supabase.from('settings').select('theme').single(),
  ])

  const theme = (settingsData?.theme ?? 'light') as 'light' | 'dark'

  return (
    <div className="flex min-h-screen">
      <ThemeApplier theme={theme} />
      <Sidebar initialBoards={boards ?? []} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
