'use client'
import { useMemo } from 'react'
import type { Task } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { RadialRingTimer } from './RadialRingTimer'

interface BubbleCardProps {
  task: Task
  onClick: (task: Task) => void
}

// Deterministic random from task id (stable across renders)
function seededRandom(seed: string, index: number) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return Math.abs(Math.sin(h + index) * 10000) % 1
}

export function BubbleCard({ task, onClick }: BubbleCardProps) {
  const urgency = useMemo(
    () => getUrgencyInfo({
      due_date: task.due_date,
      for_later: task.for_later,
      created_at: task.created_at,
    }),
    [task.due_date, task.for_later, task.created_at]
  )

  const floatDuration = useMemo(() => 3 + seededRandom(task.id, 0) * 3, [task.id])
  const driftX = useMemo(() => 4 + seededRandom(task.id, 1) * 8, [task.id])
  const driftY = useMemo(() => 3 + seededRandom(task.id, 2) * 6, [task.id])

  const { diameter, color, level } = urgency

  return (
    <button
      onClick={() => onClick(task)}
      className="absolute bubble-float rounded-full flex items-center justify-center text-center
                 cursor-pointer hover:scale-105 transition-transform focus:outline-none
                 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-upcoming)]"
      style={{
        width: diameter,
        height: diameter,
        backgroundColor: color,
        opacity: 0.9,
        border: `2px solid ${color}`,
        '--drift-x': `${driftX}px`,
        '--drift-y': `${driftY}px`,
        animation: `float ${floatDuration}s ease-in-out infinite`,
      } as React.CSSProperties}
      aria-label={`Task: ${task.name}${urgency.daysRemaining !== null
        ? urgency.daysRemaining < 0
          ? ', overdue'
          : `, due in ${urgency.daysRemaining} day${urgency.daysRemaining !== 1 ? 's' : ''}`
        : ''
      }`}
    >
      <RadialRingTimer
        diameter={diameter}
        ringProgress={urgency.ringProgress}
        color={color}
        isOverdue={level === 'overdue'}
      />
      <span
        className="relative z-10 px-3 font-medium leading-tight text-[var(--color-text)] select-none"
        style={{ fontSize: diameter > 140 ? '14px' : '12px', maxWidth: diameter * 0.75 }}
      >
        {task.name}
      </span>
    </button>
  )
}
