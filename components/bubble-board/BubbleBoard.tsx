'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Task, CustomUrgencyColors } from '@/types'
import { getUrgencyInfo } from '@/lib/urgency'
import { archiveTask } from '@/app/actions/tasks'
import { BubbleCard } from './BubbleCard'

interface BubblePosition {
  id: string
  x: number
  y: number
}

interface BubbleBoardProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  colorScheme?: 'green_urgent' | 'red_urgent' | 'electric_green' | 'custom'
  customColors?: CustomUrgencyColors
}

// Padding so spike tips (max ~40% of radius) don't clip at container edge
const EDGE_PAD = 52
const GAP      = 16

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

// Dry-run the ring algorithm with the given scaled radii, return the outermost ring edge
function ringOuterEdge(radii: number[]): number {
  if (radii.length === 0) return 0
  let edge = radii[0]
  let i    = 1
  while (i < radii.length) {
    const rMax   = radii[i]
    const ringR  = edge + GAP + rMax
    const sinArg = (2 * rMax + GAP) / (2 * ringR)
    const maxN   = sinArg >= 1 ? 1 : Math.floor(Math.PI / Math.asin(sinArg))
    const n      = Math.min(Math.max(maxN, 1), radii.length - i)
    edge = ringR + rMax
    i   += n
  }
  return edge
}

// Resolve any residual overlaps after ring placement (rare, only from edge clamping)
function separateBubbles(
  positions: BubblePosition[],
  radiusMap: Record<string, number>,
  width: number,
  height: number
): BubblePosition[] {
  const result = positions.map(p => ({ ...p }))
  for (let iter = 0; iter < 80; iter++) {
    let anyMoved = false
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const ri  = radiusMap[result[i].id]
        const rj  = radiusMap[result[j].id]
        const cxi = result[i].x + ri, cyi = result[i].y + ri
        const cxj = result[j].x + rj, cyj = result[j].y + rj
        const dx  = cxj - cxi, dy = cyj - cyi
        const dist = Math.sqrt(dx * dx + dy * dy)
        const need = ri + rj + GAP
        if (dist >= need) continue

        const push = need - dist
        const nx = dist > 0.001 ? dx / dist : 1
        const ny = dist > 0.001 ? dy / dist : 0

        const half = push / 2
        const px = result[i].x, py = result[i].y
        result[i].x = clamp(result[i].x - nx * half, EDGE_PAD, width  - EDGE_PAD - ri * 2)
        result[i].y = clamp(result[i].y - ny * half, EDGE_PAD, height - EDGE_PAD - ri * 2)
        const qx = result[j].x, qy = result[j].y
        result[j].x = clamp(result[j].x + nx * half, EDGE_PAD, width  - EDGE_PAD - rj * 2)
        result[j].y = clamp(result[j].y + ny * half, EDGE_PAD, height - EDGE_PAD - rj * 2)
        if (result[i].x !== px || result[i].y !== py ||
            result[j].x !== qx || result[j].y !== qy) anyMoved = true
      }
    }
    if (!anyMoved) break
  }
  return result
}

function calculatePositions(
  tasks: Task[],
  width: number,
  height: number
): { positions: BubblePosition[]; scale: number } {
  if (tasks.length === 0) return { positions: [], scale: 1 }

  // Sort: most urgent (highest score) first → goes to center
  const sorted = [...tasks].sort((a, b) => {
    const sA = getUrgencyInfo({ due_date: a.due_date, for_later: a.for_later, created_at: a.created_at }).score
    const sB = getUrgencyInfo({ due_date: b.due_date, for_later: b.for_later, created_at: b.created_at }).score
    return sB - sA
  })

  const rawRadii = sorted.map(t =>
    getUrgencyInfo({ due_date: t.due_date, for_later: t.for_later, created_at: t.created_at }).diameter / 2
  )

  const cx = width  / 2
  const cy = height / 2
  // Usable radius (rings must fit within this)
  const displayR = Math.min(cx, cy) - EDGE_PAD

  // Start with area-based scale so bubbles fill ~55% of board area
  const totalArea  = rawRadii.reduce((s, r) => s + Math.PI * r * r, 0)
  const usableArea = Math.max(1, width - EDGE_PAD * 2) * Math.max(1, height - EDGE_PAD * 2)
  let scale = clamp(Math.sqrt(usableArea * 0.55 / totalArea), 0.35, 1.8)

  // Iteratively shrink scale until all rings fit inside displayR
  for (let iter = 0; iter < 12; iter++) {
    const scaledRadii = rawRadii.map(r => Math.round(r * scale))
    const roe         = ringOuterEdge(scaledRadii)
    if (roe <= displayR) break
    scale = clamp(scale * displayR / roe, 0.35, 1.8)
    if (scale === 0.35) break
  }

  const radii: number[] = rawRadii.map(r => Math.round(r * scale))
  const radiusMap: Record<string, number> = {}
  sorted.forEach((t, i) => { radiusMap[t.id] = radii[i] })

  const positions: BubblePosition[] = []

  // Ring 0 — most urgent at center
  positions.push({
    id: sorted[0].id,
    x:  clamp(cx - radii[0], EDGE_PAD, width  - EDGE_PAD - radii[0] * 2),
    y:  clamp(cy - radii[0], EDGE_PAD, height - EDGE_PAD - radii[0] * 2),
  })

  if (sorted.length === 1) return { positions, scale }

  // Outer rings — fill outward in urgency order
  let edge     = radii[0]
  let taskIdx  = 1

  while (taskIdx < sorted.length) {
    const rMax  = radii[taskIdx]
    const ringR = edge + GAP + rMax

    const sinArg = (2 * rMax + GAP) / (2 * ringR)
    const maxN   = sinArg >= 1 ? 1 : Math.floor(Math.PI / Math.asin(sinArg))
    const n      = Math.min(Math.max(maxN, 1), sorted.length - taskIdx)

    for (let k = 0; k < n; k++) {
      const angle = (k / n) * 2 * Math.PI - Math.PI / 2   // start from top
      const r     = radii[taskIdx + k]
      positions.push({
        id: sorted[taskIdx + k].id,
        x:  clamp(cx + ringR * Math.cos(angle) - r, EDGE_PAD, width  - EDGE_PAD - r * 2),
        y:  clamp(cy + ringR * Math.sin(angle) - r, EDGE_PAD, height - EDGE_PAD - r * 2),
      })
    }

    edge    = ringR + rMax
    taskIdx += n
  }

  // Final pass — fix any residual overlaps caused by EDGE_PAD clamping
  return { positions: separateBubbles(positions, radiusMap, width, height), scale }
}

export function BubbleBoard({ tasks, onTaskClick, colorScheme = 'green_urgent', customColors }: BubbleBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions,     setPositions]     = useState<BubblePosition[]>([])
  const [scale,         setScale]         = useState(1)
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set())
  const [hiddenIds,     setHiddenIds]     = useState<Set<string>>(new Set())
  const hasLaidOut        = useRef(false)
  const prevTaskCountRef  = useRef(0)

  const overdueIds = new Set(
    tasks
      .filter(t => getUrgencyInfo({ due_date: t.due_date, for_later: t.for_later, created_at: t.created_at }).level === 'overdue')
      .map(t => t.id)
  )

  const recalculate = useCallback(() => {
    if (!containerRef.current) return
    const { offsetWidth: w, offsetHeight: h } = containerRef.current
    const activeTasks = tasks.filter(t => !hiddenIds.has(t.id))
    // Disable transition when tasks are added (unarchive) so new layout snaps in without overlap
    if (activeTasks.length > prevTaskCountRef.current) {
      hasLaidOut.current = false
    }
    prevTaskCountRef.current = activeTasks.length
    const { positions: newPos, scale: newScale } = calculatePositions(activeTasks, w, h)
    setPositions(newPos)
    setScale(newScale)
    if (!hasLaidOut.current && newPos.length > 0) {
      requestAnimationFrame(() => { hasLaidOut.current = true })
    }
  }, [tasks, hiddenIds])

  useEffect(() => {
    recalculate()
    window.addEventListener('resize', recalculate)
    return () => window.removeEventListener('resize', recalculate)
  }, [recalculate])

  function handleComplete(id: string) {
    setCompletingIds(prev => new Set(prev).add(id))
    setTimeout(() => {
      setHiddenIds(prev => new Set(prev).add(id))
      setCompletingIds(prev => { const n = new Set(prev); n.delete(id); return n })
      archiveTask(id)
    }, 400)
  }

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

  const visibleTasks = tasks.filter(t => !hiddenIds.has(t.id))

  return (
    <div ref={containerRef} className="relative flex-1 min-h-[calc(100vh-80px)] overflow-hidden">
      {visibleTasks.map(task => {
        const pos = positions.find(p => p.id === task.id)
        if (!pos) return null
        return (
          <div
            key={task.id}
            style={{
              position:   'absolute',
              left:        pos.x,
              top:         pos.y,
              transition:  hasLaidOut.current ? 'left 0.5s ease, top 0.5s ease' : 'none',
            }}
          >
            <BubbleCard
              task={task}
              onClick={onTaskClick}
              onComplete={handleComplete}
              colorScheme={colorScheme}
              customColors={customColors}
              isSpiky={overdueIds.has(task.id)}
              completing={completingIds.has(task.id)}
              scaleFactor={scale}
            />
          </div>
        )
      })}
    </div>
  )
}
