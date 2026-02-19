'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Check your email and password and try again.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-white shadow-sm border border-[var(--color-border)]">
        <h1 className="text-2xl font-semibold mb-2 text-[var(--color-text)]">Welcome back</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">Sign in to your task board</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-overdue)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[var(--color-upcoming)] font-medium text-[var(--color-text)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 text-[var(--color-text-muted)]">
          No account?{' '}
          <Link href="/signup" className="text-[var(--color-text)] font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
