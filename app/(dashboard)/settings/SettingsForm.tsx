'use client'
import { useState } from 'react'
import type { Settings, CustomUrgencyColors, UrgencyLevel } from '@/types'
import { updateSettings } from '@/app/actions/settings'
import { getDefaultCustomColors } from '@/lib/urgency'
import { createClient } from '@/lib/supabase/client'

const TIER_LABELS: { level: UrgencyLevel; label: string }[] = [
  { level: 'overdue',   label: 'Overdue' },
  { level: 'red_2',     label: 'Due today' },
  { level: 'red_1',     label: '1–2 days' },
  { level: 'orange_2',  label: '3–4 days' },
  { level: 'orange_1',  label: '5–6 days' },
  { level: 'yellow_2',  label: '7–9 days' },
  { level: 'yellow_1',  label: '10–14 days' },
  { level: 'green_3',   label: '15–21 days' },
  { level: 'green_2',   label: '22–30 days' },
  { level: 'green_1',   label: '30+ days' },
  { level: 'for_later', label: 'For later' },
  { level: 'no_date',   label: 'No date' },
]

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [expirationDays, setExpirationDays] = useState(settings?.expiration_days ?? 14)
  const [dateFormat, setDateFormat] = useState<'MM/DD/YYYY' | 'DD/MM/YYYY'>(settings?.date_format ?? 'MM/DD/YYYY')
  const [theme, setTheme] = useState<'light' | 'dark'>(settings?.theme ?? 'light')
  const [defaultView, setDefaultView] = useState<'bubble' | 'list'>(settings?.default_view ?? 'bubble')
  const [voiceEnabled, setVoiceEnabled] = useState(settings?.voice_enabled ?? false)
  const [gcalEnabled, setGcalEnabled] = useState(settings?.google_calendar_enabled ?? false)
  const [colorScheme, setColorScheme] = useState<'green_urgent' | 'red_urgent' | 'electric_green' | 'custom'>(
    settings?.urgency_color_scheme ?? 'green_urgent'
  )
  const [customColors, setCustomColors] = useState<CustomUrgencyColors>(
    settings?.custom_urgency_colors ?? getDefaultCustomColors('green_urgent')
  )
  const [saved, setSaved] = useState(false)

  function updateCustomColor(level: UrgencyLevel, field: 'fill' | 'border' | 'text', value: string) {
    setCustomColors(prev => ({
      ...prev,
      [level]: { ...prev[level], [field]: value },
    }))
  }

  async function handleSave() {
    await updateSettings({
      expiration_days: expirationDays,
      date_format: dateFormat,
      theme,
      default_view: defaultView,
      voice_enabled: voiceEnabled,
      urgency_color_scheme: colorScheme,
      custom_urgency_colors: customColors,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const colorSchemeOptions = [
    { value: 'green_urgent' as const,    label: '🔴 Default',        desc: 'Dark red for urgent → light green for safe' },
    { value: 'electric_green' as const,  label: '⚡ Electric Green',  desc: 'Neon green for urgent → dark green for safe' },
    { value: 'red_urgent' as const,      label: '🟫 Red palette',     desc: 'Deep red tones throughout' },
    { value: 'custom' as const,          label: '🎨 Custom',          desc: 'Pick your own colors for each tier' },
  ]

  return (
    <div className="space-y-6">
      {/* Auto-archive */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <label className="block text-sm font-medium mb-1">Auto-archive after</label>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Tasks past their due date will be archived after this many days
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range" min={1} max={60} value={expirationDays}
            onChange={e => setExpirationDays(Number(e.target.value))}
            className="flex-1 accent-[var(--color-upcoming)]"
          />
          <span className="text-sm font-medium w-16 text-right">{expirationDays} days</span>
        </div>
      </div>

      {/* Date format */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <label className="block text-sm font-medium mb-3">Date format</label>
        <div className="space-y-2">
          {(['MM/DD/YYYY', 'DD/MM/YYYY'] as const).map(fmt => (
            <label key={fmt} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio" name="date_format" value={fmt}
                checked={dateFormat === fmt} onChange={() => setDateFormat(fmt)}
                className="accent-[var(--color-upcoming)]"
              />
              <span className="text-sm">{fmt}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <label className="block text-sm font-medium mb-3">Theme</label>
        <div className="flex gap-3">
          {(['light', 'dark'] as const).map(t => (
            <label key={t} className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 cursor-pointer transition-colors ${theme === t ? 'border-[var(--color-upcoming)] bg-[var(--color-upcoming)]/10' : 'border-[var(--color-border)]'}`}>
              <input type="radio" name="theme" value={t} checked={theme === t} onChange={() => setTheme(t)} className="sr-only" />
              <span>{t === 'light' ? '☀️' : '🌙'}</span>
              <span className="text-sm font-medium capitalize">{t}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Default view */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <label className="block text-sm font-medium mb-3">Default view</label>
        <div className="flex gap-3">
          {(['bubble', 'list'] as const).map(v => (
            <label key={v} className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border-2 cursor-pointer transition-colors ${defaultView === v ? 'border-[var(--color-upcoming)] bg-[var(--color-upcoming)]/10' : 'border-[var(--color-border)]'}`}>
              <input type="radio" name="default_view" value={v} checked={defaultView === v} onChange={() => setDefaultView(v)} className="sr-only" />
              <span>{v === 'bubble' ? '🫧' : '📋'}</span>
              <span className="text-sm font-medium capitalize">{v}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Voice */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">🎤 Voice task capture</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Add tasks by speaking naturally</p>
          </div>
          <button
            type="button" role="switch" aria-checked={voiceEnabled}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`relative w-12 h-7 rounded-full transition-colors ${voiceEnabled ? 'bg-[var(--color-soon)]' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${voiceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Color scheme */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <label className="block text-sm font-medium mb-3">Urgency color scheme</label>
        <div className="space-y-2">
          {colorSchemeOptions.map(opt => (
            <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio" name="color_scheme" value={opt.value}
                checked={colorScheme === opt.value} onChange={() => setColorScheme(opt.value)}
                className="accent-[var(--color-upcoming)] mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">{opt.label}</span>
                <p className="text-xs text-[var(--color-text-muted)]">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {colorScheme === 'custom' && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium">Custom colors per tier</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCustomColors(getDefaultCustomColors('green_urgent'))}
                className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] hover:bg-gray-50 transition-colors">
                Default
              </button>
              <button type="button" onClick={() => setCustomColors(getDefaultCustomColors('electric_green'))}
                className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] hover:bg-gray-50 transition-colors">
                Electric
              </button>
              <button type="button" onClick={() => setCustomColors(getDefaultCustomColors('red_urgent'))}
                className="text-xs px-2.5 py-1 rounded-lg border border-[var(--color-border)] hover:bg-gray-50 transition-colors">
                Red
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid text-xs font-semibold text-[var(--color-text-muted)] pb-1"
              style={{ gridTemplateColumns: '20px 90px 1fr 1fr 1fr' }}>
              <div /><div>Tier</div>
              <div className="text-center">Fill</div>
              <div className="text-center">Ring</div>
              <div className="text-center">Text</div>
            </div>
            {TIER_LABELS.map(({ level, label }) => (
              <div key={level} className="grid items-center gap-2" style={{ gridTemplateColumns: '20px 90px 1fr 1fr 1fr' }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, background: customColors[level].fill, border: `2px solid ${customColors[level].border}`, flexShrink: 0 }} />
                <span className="text-xs truncate">{label}</span>
                <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                  <input type="color" value={customColors[level].fill}
                    onChange={e => updateCustomColor(level, 'fill', e.target.value)}
                    className="w-8 h-8 cursor-pointer rounded border-0 p-0.5" style={{ background: 'none' }} />
                </label>
                <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                  <input type="color" value={customColors[level].border}
                    onChange={e => updateCustomColor(level, 'border', e.target.value)}
                    className="w-8 h-8 cursor-pointer rounded border-0 p-0.5" style={{ background: 'none' }} />
                </label>
                <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                  <input type="color" value={customColors[level].text}
                    onChange={e => updateCustomColor(level, 'text', e.target.value)}
                    className="w-8 h-8 cursor-pointer rounded border-0 p-0.5" style={{ background: 'none' }} />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Google Calendar */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sync to Google Calendar</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Adds tasks to your calendar as events when you choose</p>
          </div>
          <button
            type="button" role="switch" aria-checked={gcalEnabled}
            onClick={async () => {
              if (!gcalEnabled) {
                const supabase = createClient()
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { scopes: 'https://www.googleapis.com/auth/calendar.events', redirectTo: `${window.location.origin}/settings` },
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
