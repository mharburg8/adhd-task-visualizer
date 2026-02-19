'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
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
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-white shadow-sm border border-[var(--color-border)]">
        <h1 className="text-2xl font-semibold mb-2 text-[var(--color-text)]">Get started</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">Create your task board — it only takes a moment</p>
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
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-upcoming)] text-sm"
              placeholder="At least 6 characters"
            />
          </div>
          {error && <p className="text-sm text-[var(--color-overdue)]">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-[var(--color-soon)] font-medium text-[var(--color-text)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm mt-4 text-[var(--color-text-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--color-text)] font-medium underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
