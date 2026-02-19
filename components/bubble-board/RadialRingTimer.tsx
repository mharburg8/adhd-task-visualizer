interface RadialRingTimerProps {
  diameter: number
  ringProgress: number   // 0.0–1.0
  color: string
  isOverdue: boolean
  strokeWidth?: number
}

export function RadialRingTimer({
  diameter,
  ringProgress,
  color,
  isOverdue,
  strokeWidth,
}: RadialRingTimerProps) {
  if (ringProgress === 0 && !isOverdue) return null

  const sw = strokeWidth ?? (diameter >= 160 ? 6 : 4)
  const gap = 4  // gap between bubble edge and ring
  const radius = diameter / 2 - sw / 2 - gap
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - ringProgress)

  return (
    <svg
      width={diameter}
      height={diameter}
      className="absolute inset-0 pointer-events-none"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Track ring (ghost) */}
      <circle
        cx={diameter / 2}
        cy={diameter / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        opacity={0.15}
      />
      {/* Progress ring */}
      <circle
        className={`ring-progress${isOverdue ? ' pulse-ring' : ''}`}
        cx={diameter / 2}
        cy={diameter / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={String(circumference)}
        strokeDashoffset={String(strokeDashoffset)}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  )
}
