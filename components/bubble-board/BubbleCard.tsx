'use client'
import { useMemo } from 'react'
import type { Task, CustomUrgencyColors } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { archiveTask } from '@/app/actions/tasks'
import { RadialRingTimer } from './RadialRingTimer'

interface BubbleCardProps {
  task: Task
  onClick: (task: Task) => void
  colorScheme?: 'green_urgent' | 'red_urgent' | 'custom'
  customColors?: CustomUrgencyColors
}

function seededRandom(seed: string, index: number) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return Math.abs(Math.sin(h + index) * 10000) % 1
}

export function BubbleCard({ task, onClick, colorScheme = 'green_urgent', customColors }: BubbleCardProps) {
  const urgency = useMemo(
    () => getUrgencyInfo({
      due_date: task.due_date,
      for_later: task.for_later,
      created_at: task.created_at,
      colorScheme,
      customColors,
    }),
    [task.due_date, task.for_later, task.created_at, colorScheme, customColors]
  )

  const floatDuration = useMemo(() => 3 + seededRandom(task.id, 0) * 3, [task.id])
  const driftX = useMemo(() => 4 + seededRandom(task.id, 1) * 8, [task.id])
  const driftY = useMemo(() => 3 + seededRandom(task.id, 2) * 6, [task.id])

  const { diameter, color, borderColor, textColor, level } = urgency
  const isOverdue = level === 'overdue'

  return (
    <div
      className={`group ${isOverdue ? 'bubble-overdue' : 'bubble-float'}`}
      style={{
        position: 'relative',
        width: diameter,
        height: diameter,
        '--drift-x': `${driftX}px`,
        '--drift-y': `${driftY}px`,
        ...(isOverdue ? {} : { animation: `float ${floatDuration}s ease-in-out infinite` }),
      } as React.CSSProperties}
    >
      {/* Main bubble */}
      <button
        onClick={() => onClick(task)}
        className="w-full h-full rounded-full flex items-center justify-center text-center cursor-pointer hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-upcoming)]"
        style={{
          backgroundColor: color,
          opacity: 0.9,
          border: `2px solid ${borderColor}`,
        }}
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
          color={borderColor}
          isOverdue={isOverdue}
        />
        <span
          className="relative z-10 px-3 font-medium leading-tight select-none"
          style={{ fontSize: diameter > 140 ? '14px' : '12px', maxWidth: diameter * 0.75, color: textColor }}
        >
          {task.name}
        </span>
      </button>

      {/* Hover checkmark — completes (archives) the task */}
      <button
        onClick={e => { e.stopPropagation(); archiveTask(task.id) }}
        className="absolute top-1 right-1 z-20 w-7 h-7 rounded-full bg-white/90 border border-gray-200 hidden group-hover:flex items-center justify-center transition-colors hover:bg-green-50 hover:border-green-300"
        aria-label="Complete task"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#16a34a" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  )
}
