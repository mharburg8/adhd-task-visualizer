interface RadialRingTimerProps {
  diameter: number
  ringProgress: number   // 0.0–1.0
  color: string
  strokeWidth?: number
}

export function RadialRingTimer({
  diameter,
  ringProgress,
  color,
  strokeWidth,
}: RadialRingTimerProps) {
  if (ringProgress <= 0) return null

  const sw = strokeWidth ?? (diameter >= 160 ? 6 : 4)
  const gap = 6                          // gap between bubble edge and ring
  const ringRadius = diameter / 2 + gap + sw / 2   // ring sits OUTSIDE the bubble
  const svgSize = Math.ceil(diameter + (gap + sw + 2) * 2)
  const cx = svgSize / 2
  const cy = svgSize / 2
  const offset = (svgSize - diameter) / 2

  const circumference = 2 * Math.PI * ringRadius
  const strokeDashoffset = circumference * (1 - ringProgress)

  return (
    <svg
      width={svgSize}
      height={svgSize}
      style={{
        position: 'absolute',
        top: -offset,
        left: -offset,
        pointerEvents: 'none',
        zIndex: 1,
        transform: 'rotate(-90deg)',
        transformOrigin: `${cx}px ${cy}px`,
      }}
    >
      {/* Ghost track */}
      <circle
        cx={cx} cy={cy} r={ringRadius}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        opacity={0.2}
      />
      {/* Progress ring */}
      <circle
        cx={cx} cy={cy} r={ringRadius}
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
