'use client'
import { useState } from 'react'
import type { Settings } from '@/types'
import { updateSettings } from '@/app/actions/settings'
import { createClient } from '@/lib/supabase/client'

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [expirationDays, setExpirationDays] = useState(settings?.expiration_days ?? 14)
  const [dateFormat, setDateFormat] = useState<'MM/DD/YYYY' | 'DD/MM/YYYY'>(settings?.date_format ?? 'MM/DD/YYYY')
  const [gcalEnabled, setGcalEnabled] = useState(settings?.google_calendar_enabled ?? false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    await updateSettings({ expiration_days: expirationDays, date_format: dateFormat })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleGcalToggle() {
    if (!gcalEnabled) {
      const supabase = createClient()
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.events',
          redirectTo: `${window.location.origin}/settings`,
        },
      })
    } else {
      await updateSettings({ google_calendar_enabled: false })
      setGcalEnabled(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--color-border)' }}>
        <label className="block text-sm font-medium mb-1">Auto-archive after</label>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Tasks past their due date will be archived after this many days
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={60}
            value={expirationDays}
            onChange={e => setExpirationDays(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: 'var(--color-upcoming)' }}
          />
          <span className="text-sm font-medium w-16 text-right">{expirationDays} days</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--color-border)' }}>
        <label className="block text-sm font-medium mb-3">Date format</label>
        <div className="space-y-2">
          {(['MM/DD/YYYY', 'DD/MM/YYYY'] as const).map(fmt => (
            <label key={fmt} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="date_format"
                value={fmt}
                checked={dateFormat === fmt}
                onChange={() => setDateFormat(fmt)}
                style={{ accentColor: 'var(--color-upcoming)' }}
              />
              <span className="text-sm">{fmt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-5" style={{ border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sync to Google Calendar</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Adds tasks to your calendar as events when you choose
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={gcalEnabled}
            onClick={handleGcalToggle}
            className="relative w-12 h-7 rounded-full transition-colors"
            style={{ backgroundColor: gcalEnabled ? 'var(--color-soon)' : '#E5E7EB' }}
          >
            <span
              className="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform"
              style={{ transform: gcalEnabled ? 'translateX(24px)' : 'translateX(4px)' }}
            />
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full h-12 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
        style={{ backgroundColor: 'var(--color-upcoming)', color: 'var(--color-text)' }}
      >
        {saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  )
}
