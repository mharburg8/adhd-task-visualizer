'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createBoard(name: string): Promise<{ id: string; name: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('boards')
    .insert({ user_id: user.id, name })
    .select('id, name')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
  return data
}

export async function renameBoard(id: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('boards')
    .update({ name })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}

export async function deleteBoard(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error: tasksError } = await supabase
    .from('tasks')
    .delete()
    .eq('board_id', id)
    .eq('user_id', user.id)
  if (tasksError) throw new Error(tasksError.message)

  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}
