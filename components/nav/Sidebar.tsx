'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/',          label: 'My Board',  emoji: '🫧' },
  { href: '/for-later', label: 'For Later', emoji: '🪴' },
  { href: '/archived',  label: 'Archived',  emoji: '📦' },
  { href: '/settings',  label: 'Settings',  emoji: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="w-56 min-h-screen flex flex-col p-4"
      style={{ backgroundColor: 'white', borderRight: '1px solid var(--color-border)' }}
    >
      <div className="mb-8 px-2">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Task Board</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Let's get things done</p>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              minHeight: '48px',
              backgroundColor: pathname === item.href ? 'var(--color-upcoming)' : 'transparent',
              color: pathname === item.href ? 'var(--color-text)' : 'var(--color-text-muted)',
            }}
          >
            <span className="text-base">{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={handleSignOut}
        className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors hover:bg-gray-50"
        style={{ minHeight: '48px', color: 'var(--color-text-muted)' }}
      >
        <span className="text-base">👋</span>
        Sign out
      </button>
    </aside>
  )
}
