'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google-calendar'

async function getTokens() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.provider_token || !session?.provider_refresh_token) {
    throw new Error('No Google OAuth tokens — user must re-authenticate with Google')
  }
  return {
    accessToken: session.provider_token,
    refreshToken: session.provider_refresh_token,
    supabase,
  }
}

export async function pushTaskToCalendar(taskId: string) {
  const { accessToken, refreshToken, supabase } = await getTokens()

  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (!task?.due_date) throw new Error('Task must have a due date to add to calendar')

  let eventId: string
  if (task.google_event_id) {
    await updateCalendarEvent({
      accessToken,
      refreshToken,
      eventId: task.google_event_id,
      name: task.name,
      dueDate: task.due_date,
      details: task.details,
    })
    eventId = task.google_event_id
  } else {
    eventId = await createCalendarEvent({
      accessToken,
      refreshToken,
      name: task.name,
      dueDate: task.due_date,
      details: task.details,
    })
    await supabase.from('tasks').update({ google_event_id: eventId }).eq('id', taskId)
  }

  revalidatePath('/')
  return eventId
}

export async function removeTaskFromCalendar(taskId: string) {
  const { accessToken, refreshToken, supabase } = await getTokens()

  const { data: task } = await supabase
    .from('tasks')
    .select('google_event_id')
    .eq('id', taskId)
    .single()

  if (!task?.google_event_id) return

  await deleteCalendarEvent({ accessToken, refreshToken, eventId: task.google_event_id })
  await supabase.from('tasks').update({ google_event_id: null }).eq('id', taskId)
  revalidatePath('/')
}
