'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CustomUrgencyColors } from '@/types'

export async function updateSettings(data: {
  expiration_days?: number
  date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY'
  google_calendar_enabled?: boolean
  theme?: 'light' | 'dark'
  default_view?: 'bubble' | 'list'
  voice_enabled?: boolean
  urgency_color_scheme?: 'green_urgent' | 'red_urgent' | 'electric_green' | 'custom'
  custom_urgency_colors?: CustomUrgencyColors
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, ...data }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}

export async function deleteAccountAndData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await supabase.from('tasks').delete().eq('user_id', user.id)
  await supabase.from('boards').delete().eq('user_id', user.id)
  await supabase.from('settings').delete().eq('user_id', user.id)
}
