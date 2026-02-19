'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateSettings(data: {
  expiration_days?: number
  date_format?: 'MM/DD/YYYY' | 'DD/MM/YYYY'
  google_calendar_enabled?: boolean
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, ...data })
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/settings')
}
