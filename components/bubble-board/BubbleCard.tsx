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
  isSpiky?: boolean
}

function StarBurst({ diameter }: { diameter: number }) {
  const r = diameter / 2
  const spikes = 20
  const spikeLen = Math.max(14, r * 0.38)
  const outerR = r + spikeLen
  const innerR = r + 4
  const cx = outerR
  const cy = outerR
  const svgSize = outerR * 2

  const pts: string[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const rad = i % 2 === 0 ? outerR : innerR
    pts.push(`${(cx + rad * Math.cos(angle)).toFixed(1)},${(cy + rad * Math.sin(angle)).toFixed(1)}`)
  }

  return (
    <svg
      style={{
        position: 'absolute',
        top: -spikeLen,
        left: -spikeLen,
        width: svgSize,
        height: svgSize,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <polygon points={pts.join(' ')} fill="#FFD700" />
    </svg>
  )
}

export function BubbleCard({ task, onClick, colorScheme = 'green_urgent', customColors, isSpiky }: BubbleCardProps) {
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

  const { diameter, color, borderColor, textColor, level } = urgency
  const isOverdue = level === 'overdue'

  return (
    <div
      className={`group ${isOverdue ? 'bubble-overdue' : ''}`}
      style={{
        position: 'relative',
        width: diameter,
        height: diameter,
      }}
    >
      {/* Yellow spikes behind the bubble */}
      {isSpiky && <StarBurst diameter={diameter} />}

      {/* Main bubble */}
      <button
        onClick={() => onClick(task)}
        className="w-full h-full rounded-full flex items-center justify-center text-center cursor-pointer hover:scale-105 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-upcoming)]"
        style={{
          position: 'relative',
          zIndex: 1,
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

      {/* Checkmark — archives task, centered near bottom of bubble */}
      <button
        onClick={e => { e.stopPropagation(); archiveTask(task.id) }}
        className="absolute z-20 w-8 h-8 rounded-full bg-white/90 border border-gray-200 hidden group-hover:flex items-center justify-center transition-colors hover:bg-green-50 hover:border-green-300"
        style={{
          bottom: Math.round(diameter * 0.18),
          left: '50%',
          transform: 'translateX(-50%)',
        }}
        aria-label="Complete task"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#16a34a" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  )
}
