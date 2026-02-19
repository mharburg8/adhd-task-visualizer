'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Task } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { BubbleCard } from './BubbleCard'

interface BubblePosition {
  id: string
  x: number
  y: number
}

interface BubbleBoardProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

function calculatePositions(tasks: Task[], width: number, height: number): BubblePosition[] {
  if (tasks.length === 0) return []

  const sorted = [...tasks].sort((a, b) => {
    const scoreA = getUrgencyInfo({ due_date: a.due_date, for_later: a.for_later, created_at: a.created_at }).score
    const scoreB = getUrgencyInfo({ due_date: b.due_date, for_later: b.for_later, created_at: b.created_at }).score
    return scoreB - scoreA
  })

  const cx = width / 2
  const cy = height / 2

  return sorted.map((task, i) => {
    const urgency = getUrgencyInfo({ due_date: task.due_date, for_later: task.for_later, created_at: task.created_at })
    const r = urgency.diameter / 2

    if (i === 0) return { id: task.id, x: cx - r, y: cy - r }

    const angle = (i / (sorted.length - 1)) * 2 * Math.PI
    const orbitRadius = 180 + i * 20
    return {
      id: task.id,
      x: Math.max(r, Math.min(width - r * 2, cx + Math.cos(angle) * orbitRadius - r)),
      y: Math.max(r, Math.min(height - r * 2, cy + Math.sin(angle) * orbitRadius - r)),
    }
  })
}

export function BubbleBoard({ tasks, onTaskClick }: BubbleBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<BubblePosition[]>([])

  const recalculate = useCallback(() => {
    if (!containerRef.current) return
    const { offsetWidth: w, offsetHeight: h } = containerRef.current
    setPositions(calculatePositions(tasks, w, h))
  }, [tasks])

  useEffect(() => {
    recalculate()
    window.addEventListener('resize', recalculate)
    return () => window.removeEventListener('resize', recalculate)
  }, [recalculate])

  if (tasks.length === 0) {
    return (
      <div ref={containerRef} className="relative flex-1 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🌱</p>
          <p className="text-lg font-medium text-[var(--color-text)]">Nothing on your plate right now</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Add a task to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-h-[calc(100vh-80px)] overflow-hidden">
      {tasks.map(task => {
        const pos = positions.find(p => p.id === task.id)
        if (!pos) return null
        return (
          <div
            key={task.id}
            style={{ position: 'absolute', left: pos.x, top: pos.y }}
          >
            <BubbleCard task={task} onClick={onTaskClick} />
          </div>
        )
      })}
    </div>
  )
}
