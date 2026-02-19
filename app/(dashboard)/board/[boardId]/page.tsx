import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BoardClient } from '@/components/bubble-board/BoardClient'

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const supabase = await createClient()
  const { boardId } = await params

  const [{ data: board }, { data: tasks }, { data: settings }] = await Promise.all([
    supabase
      .from('boards')
      .select('id, name')
      .eq('id', boardId)
      .single(),
    supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .eq('status', 'active')
      .eq('for_later', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('settings')
      .select('*')
      .single(),
  ])

  if (!board) notFound()

  return (
    <BoardClient
      boardId={boardId}
      boardName={board.name}
      initialTasks={tasks ?? []}
      initialSettings={settings ?? null}
    />
  )
}
