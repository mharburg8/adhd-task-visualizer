'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Task, CustomUrgencyColors } from '@/types'
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
  colorScheme?: 'green_urgent' | 'red_urgent' | 'custom'
  customColors?: CustomUrgencyColors
}

function separateBubbles(
  positions: BubblePosition[],
  radiusMap: Record<string, number>,
  width: number,
  height: number
): BubblePosition[] {
  const result = positions.map(p => ({ ...p }))
  const GAP = 10

  for (let iter = 0; iter < 120; iter++) {
    let moved = false
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const ri = radiusMap[result[i].id]
        const rj = radiusMap[result[j].id]
        const cxi = result[i].x + ri
        const cyi = result[i].y + ri
        const cxj = result[j].x + rj
        const cyj = result[j].y + rj
        const dx = cxj - cxi
        const dy = cyj - cyi
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = ri + rj + GAP
        if (dist < minDist) {
          const push = dist > 0 ? (minDist - dist) : minDist
          const nx = dist > 0 ? dx / dist : 1
          const ny = dist > 0 ? dy / dist : 0
          if (i === 0) {
            // Pin the center bubble — push j the full amount
            result[j].x += nx * push
            result[j].y += ny * push
          } else {
            const half = push / 2
            result[i].x -= nx * half
            result[i].y -= ny * half
            result[j].x += nx * half
            result[j].y += ny * half
          }
          // Clamp to viewport
          if (i > 0) {
            result[i].x = Math.max(0, Math.min(width - ri * 2, result[i].x))
            result[i].y = Math.max(0, Math.min(height - ri * 2, result[i].y))
          }
          result[j].x = Math.max(0, Math.min(width - rj * 2, result[j].x))
          result[j].y = Math.max(0, Math.min(height - rj * 2, result[j].y))
          moved = true
        }
      }
    }
    if (!moved) break
  }
  return result
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

  const radiusMap: Record<string, number> = {}
  const initial: BubblePosition[] = sorted.map((task, i) => {
    const urgency = getUrgencyInfo({ due_date: task.due_date, for_later: task.for_later, created_at: task.created_at })
    const r = urgency.diameter / 2
    radiusMap[task.id] = r

    if (i === 0) return { id: task.id, x: cx - r, y: cy - r }

    const angle = (i / sorted.length) * 2 * Math.PI
    const orbitRadius = 160 + i * 25
    return {
      id: task.id,
      x: Math.max(r, Math.min(width - r * 2, cx + Math.cos(angle) * orbitRadius - r)),
      y: Math.max(r, Math.min(height - r * 2, cy + Math.sin(angle) * orbitRadius - r)),
    }
  })

  return separateBubbles(initial, radiusMap, width, height)
}

export function BubbleBoard({ tasks, onTaskClick, colorScheme = 'green_urgent', customColors }: BubbleBoardProps) {
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
            <BubbleCard task={task} onClick={onTaskClick} colorScheme={colorScheme} customColors={customColors} />
          </div>
        )
      })}
    </div>
  )
}
