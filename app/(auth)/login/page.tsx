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
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-surface)' }}>
      <div className="w-full max-w-sm p-8 rounded-2xl bg-white shadow-sm" style={{ border: '1px solid var(--color-border)' }}>
        <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Welcome back</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>Sign in to your task board</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border text-sm focus:outline-none"
              style={{ borderColor: 'var(--color-border)' }}
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
              className="w-full h-12 px-4 rounded-xl border text-sm focus:outline-none"
              style={{ borderColor: 'var(--color-border)' }}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--color-overdue)' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-upcoming)', color: 'var(--color-text)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm mt-4" style={{ color: 'var(--color-text-muted)' }}>
          No account?{' '}
          <Link href="/signup" className="font-medium underline" style={{ color: 'var(--color-text)' }}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
