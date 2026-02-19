'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createBoard, renameBoard, deleteBoard } from '@/app/actions/boards'
import type { Board } from '@/types'

const BOTTOM_NAV = [
  { href: '/for-later', label: 'For Later', emoji: '🪴' },
  { href: '/archived',  label: 'Archived',  emoji: '📦' },
  { href: '/settings',  label: 'Settings',  emoji: '⚙️' },
]

interface SidebarProps {
  initialBoards: Board[]
}

export function Sidebar({ initialBoards }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [boards, setBoards] = useState<Board[]>(initialBoards)
  const [isCreating, setIsCreating] = useState(false)
  const [newBoardName, setNewBoardName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const channel = supabase
      .channel('boards-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, async () => {
        const { data } = await supabase
          .from('boards')
          .select('id, name, user_id, created_at')
          .order('created_at', { ascending: true })
        if (data) setBoards(data)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleCreateBoard() {
    const name = newBoardName.trim()
    if (!name) { setIsCreating(false); setNewBoardName(''); return }
    const board = await createBoard(name)
    setIsCreating(false)
    setNewBoardName('')
    router.push(`/board/${board.id}`)
  }

  async function handleRename(id: string) {
    const name = renameValue.trim()
    if (name) await renameBoard(id, name)
    setRenamingId(null)
    setRenameValue('')
  }

  async function handleDelete(id: string) {
    await deleteBoard(id)
    setConfirmDeleteId(null)
    if (pathname === `/board/${id}`) router.push('/')
  }

  const navLinkClass = (href: string) => `
    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[48px]
    ${pathname === href
      ? 'bg-[var(--color-upcoming)] text-[var(--color-text)]'
      : 'text-[var(--color-text-muted)] hover:bg-gray-50 hover:text-[var(--color-text)]'
    }
  `

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-[var(--color-border)] flex flex-col p-4 shrink-0">
      <div className="mb-4 px-2">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">Task Board</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Let's get things done</p>
      </div>

      <nav className="flex-1 space-y-0.5">
        {/* My Board — always first */}
        <Link href="/" className={navLinkClass('/')}>
          <span className="text-base">🫧</span>
          My Board
        </Link>

        {/* Custom boards — right under My Board */}
        <div className="pl-3 space-y-0.5">
          {boards.map(board => {
            const isActive = pathname === `/board/${board.id}`
            return (
              <div key={board.id} className="group flex items-center gap-1">
                {renamingId === board.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(board.id)
                      if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
                    }}
                    onBlur={() => handleRename(board.id)}
                    className="flex-1 h-9 px-2 rounded-lg border border-[var(--color-upcoming)] text-sm focus:outline-none"
                  />
                ) : (
                  <Link
                    href={`/board/${board.id}`}
                    className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-xl text-sm font-medium transition-colors min-h-[40px] truncate
                      ${isActive
                        ? 'bg-[var(--color-upcoming)] text-[var(--color-text)]'
                        : 'text-[var(--color-text-muted)] hover:bg-gray-50 hover:text-[var(--color-text)]'
                      }`}
                  >
                    <span className="text-base">📋</span>
                    <span className="truncate">{board.name}</span>
                  </Link>
                )}

                {renamingId !== board.id && (
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setRenamingId(board.id); setRenameValue(board.name) }}
                      className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-gray-100 text-xs"
                      aria-label="Rename board"
                    >
                      ✏️
                    </button>
                    {confirmDeleteId === board.id ? (
                      <button
                        onClick={() => handleDelete(board.id)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200"
                        aria-label="Confirm delete"
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(board.id)}
                        className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-gray-100 text-xs"
                        aria-label="Delete board"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {isCreating ? (
            <div className="pr-1">
              <input
                autoFocus
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateBoard()
                  if (e.key === 'Escape') { setIsCreating(false); setNewBoardName('') }
                }}
                onBlur={handleCreateBoard}
                placeholder="Board name…"
                className="w-full h-9 px-2 rounded-lg border border-[var(--color-upcoming)] text-sm focus:outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => { setIsCreating(true); setNewBoardName('') }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-[var(--color-text-muted)] hover:bg-gray-50 hover:text-[var(--color-text)] transition-colors w-full"
            >
              <span className="text-sm font-bold leading-none">+</span>
              New board
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--color-border)] my-2" />

        {/* For Later, Archived, Settings */}
        {BOTTOM_NAV.map(item => (
          <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
            <span className="text-base">{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        onClick={handleSignOut}
        className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--color-text-muted)] hover:bg-gray-50 hover:text-[var(--color-text)] transition-colors min-h-[48px]"
      >
        <span className="text-base">👋</span>
        Sign out
      </button>
    </aside>
  )
}
