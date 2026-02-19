import { render } from '@testing-library/react'
import { RadialRingTimer } from '../RadialRingTimer'

describe('RadialRingTimer', () => {
  it('renders an SVG circle with correct stroke-dashoffset for 50% progress', () => {
    const diameter = 120
    const { container } = render(
      <RadialRingTimer
        diameter={diameter}
        ringProgress={0.5}
        color="var(--color-upcoming)"
        isOverdue={false}
      />
    )
    const circle = container.querySelector('circle.ring-progress')
    expect(circle).toBeInTheDocument()
    const sw = 4
    const gap = 4
    const radius = diameter / 2 - sw / 2 - gap
    const circumference = 2 * Math.PI * radius
    const expectedOffset = circumference * (1 - 0.5)
    expect(circle).toHaveAttribute('stroke-dasharray', String(circumference))
    expect(circle).toHaveAttribute('stroke-dashoffset', String(expectedOffset))
  })

  it('applies pulse-ring class when isOverdue is true', () => {
    const { container } = render(
      <RadialRingTimer
        diameter={120}
        ringProgress={0}
        color="var(--color-overdue)"
        isOverdue={true}
      />
    )
    const circle = container.querySelector('circle.ring-progress')
    expect(circle?.getAttribute('class')).toContain('pulse-ring')
  })

  it('renders nothing when ringProgress is 0 and not overdue', () => {
    const { container } = render(
      <RadialRingTimer
        diameter={120}
        ringProgress={0}
        color="var(--color-upcoming)"
        isOverdue={false}
      />
    )
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})
