'use client'
import { useState } from 'react'
import type { Task, CustomUrgencyColors } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { archiveTask } from '@/app/actions/tasks'
import { ListRow } from './ListRow'

interface ListViewProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  dateFormat: string
  colorScheme?: 'green_urgent' | 'red_urgent' | 'electric_green' | 'custom'
  customColors?: CustomUrgencyColors
}

export function ListView({ tasks, onTaskClick, dateFormat, colorScheme = 'green_urgent', customColors }: ListViewProps) {
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())

  const sorted = [...tasks].sort((a, b) => {
    const scoreA = getUrgencyInfo({ due_date: a.due_date, for_later: a.for_later, created_at: a.created_at, colorScheme, customColors }).score
    const scoreB = getUrgencyInfo({ due_date: b.due_date, for_later: b.for_later, created_at: b.created_at, colorScheme, customColors }).score
    return scoreB - scoreA
  })

  function handleComplete(id: string) {
    setCompletingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      archiveTask(id)
      setCompletingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 350)
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center" style={{ background: '#0D0D1A', flex: 1 }}>
        <p className="text-4xl mb-4">🌱</p>
        <p className="text-lg font-medium text-gray-300">Nothing on your plate right now</p>
        <p className="text-sm text-gray-500 mt-1">Add a task to get started</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto" style={{ background: '#0D0D1A' }}>
      {/* Column headers */}
      <div
        className="flex sticky top-0 z-10"
        style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', background: '#0D0D1A' }}
      >
        <div style={{ width: 44, flexShrink: 0 }} />
        <div style={{ width: 200, flexShrink: 0, padding: '10px 18px', borderRight: '1px solid rgba(255,255,255,0.08)', fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase' as const }}>Task</div>
        <div style={{ width: 160, flexShrink: 0, padding: '10px 16px', borderRight: '1px solid rgba(255,255,255,0.08)', fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase' as const }}>Due</div>
        <div style={{ flex: 1, padding: '10px 16px', fontSize: 11, fontWeight: 900, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase' as const }}>Time Remaining ▶</div>
      </div>

      {sorted.map(task => (
        <ListRow
          key={task.id}
          task={task}
          onClick={onTaskClick}
          onComplete={handleComplete}
          dateFormat={dateFormat}
          colorScheme={colorScheme}
          customColors={customColors}
          completing={completingIds.has(task.id)}
        />
      ))}
    </div>
  )
}
