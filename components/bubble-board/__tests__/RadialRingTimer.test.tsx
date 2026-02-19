import { render } from '@testing-library/react'
import { RadialRingTimer } from '../RadialRingTimer'

describe('RadialRingTimer', () => {
  it('renders an SVG with correct stroke-dashoffset for 50% progress', () => {
    const diameter = 120
    const { container } = render(
      <RadialRingTimer
        diameter={diameter}
        ringProgress={0.5}
        color="var(--color-upcoming)"
      />
    )
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    // Ring sits OUTSIDE: radius = diameter/2 + gap(6) + sw/2(2) = 60 + 6 + 2 = 68
    const sw = 4  // diameter < 160
    const gap = 6
    const ringRadius = diameter / 2 + gap + sw / 2
    const circumference = 2 * Math.PI * ringRadius
    const expectedOffset = circumference * (1 - 0.5)
    const circles = container.querySelectorAll('circle')
    const progressCircle = circles[1]  // second circle is the progress ring
    expect(progressCircle).toHaveAttribute('stroke-dasharray', String(circumference))
    expect(progressCircle).toHaveAttribute('stroke-dashoffset', String(expectedOffset))
  })

  it('renders nothing when ringProgress is 0', () => {
    const { container } = render(
      <RadialRingTimer
        diameter={120}
        ringProgress={0}
        color="var(--color-upcoming)"
      />
    )
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders nothing when ringProgress is negative', () => {
    const { container } = render(
      <RadialRingTimer
        diameter={120}
        ringProgress={-0.1}
        color="var(--color-upcoming)"
      />
    )
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})
