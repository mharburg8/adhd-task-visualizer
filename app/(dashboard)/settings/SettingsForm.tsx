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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <label className="block text-sm font-medium mb-1">
          Auto-archive after
        </label>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Tasks past their due date will be archived after this many days
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={60}
            value={expirationDays}
            onChange={e => setExpirationDays(Number(e.target.value))}
            className="flex-1 accent-[var(--color-upcoming)]"
          />
          <span className="text-sm font-medium w-16 text-right">{expirationDays} days</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
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
                className="accent-[var(--color-upcoming)]"
              />
              <span className="text-sm">{fmt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sync to Google Calendar</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Adds tasks to your calendar as events when you choose
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={gcalEnabled}
            onClick={async () => {
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
            }}
            className={`relative w-12 h-7 rounded-full transition-colors ${gcalEnabled ? 'bg-[var(--color-soon)]' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${gcalEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full h-12 rounded-xl bg-[var(--color-upcoming)] font-medium text-sm hover:opacity-90 transition-opacity"
      >
        {saved ? '✓ Saved' : 'Save settings'}
      </button>
    </div>
  )
}
