import { getUrgencyInfo } from '../urgency'

const TODAY = new Date(2026, 1, 18)  // Feb 18 in local time (avoids UTC parse offset)

describe('getUrgencyInfo', () => {
  it('returns for_later level when for_later is true', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-20',
      for_later: true,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('for_later')
    expect(result.ringProgress).toBe(0)
  })

  it('returns overdue when due_date is in the past', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('overdue')
    expect(result.score).toBe(1.0)
    expect(result.ringProgress).toBe(0)
  })

  it('returns tomorrow when due_date is within 1 day', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-19',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('tomorrow')
    expect(result.score).toBe(0.85)
  })

  it('returns soon when due in 1–5 days', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-22',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('soon')
    expect(result.score).toBe(0.6)
  })

  it('returns upcoming when due in 5–14 days', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-28',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('upcoming')
    expect(result.score).toBe(0.3)
  })

  it('returns future when due in more than 14 days', () => {
    const result = getUrgencyInfo({
      due_date: '2026-03-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('future')
    expect(result.score).toBe(0.1)
  })

  it('returns no_date when due_date is null', () => {
    const result = getUrgencyInfo({
      due_date: null,
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('no_date')
    expect(result.ringProgress).toBe(0)
  })

  it('calculates ring progress correctly mid-way through', () => {
    // created Feb 1, due March 1 = 28 days total
    // today is Feb 18 = 17 days elapsed
    // progress = 1 - (17/28) ≈ 0.393
    const result = getUrgencyInfo({
      due_date: '2026-03-01',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.ringProgress).toBeCloseTo(0.393, 1)
  })

  it('clamps ring progress to 0 when overdue', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.ringProgress).toBe(0)
  })

  it('calculates bubble diameter proportional to urgency score', () => {
    const overdue = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(overdue.diameter).toBe(200)  // 80 + (120 * 1.0)

    const future = getUrgencyInfo({
      due_date: '2026-03-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(future.diameter).toBe(92)  // 80 + (120 * 0.1)
  })
})
