import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('settings').select('*').single()

  return (
    <div className="flex flex-col h-screen">
      <div
        className="px-6 py-4"
        style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'white' }}
      >
        <h2 className="text-base font-semibold">Settings</h2>
      </div>
      <div className="flex-1 overflow-auto p-6 max-w-md">
        <SettingsForm settings={settings} />
      </div>
    </div>
  )
}
