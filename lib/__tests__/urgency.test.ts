import { getUrgencyInfo, getDefaultCustomColors } from '../urgency'

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

  it('returns red_1 when due_date is 1 day away', () => {
    // Feb 19 is 1 day from Feb 18 → red_1
    const result = getUrgencyInfo({
      due_date: '2026-02-19',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('red_1')
    expect(result.score).toBe(0.80)
  })

  it('returns orange_2 when due in 3–4 days', () => {
    // Feb 22 is 4 days from Feb 18 → orange_2
    const result = getUrgencyInfo({
      due_date: '2026-02-22',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('orange_2')
    expect(result.score).toBe(0.70)
  })

  it('returns yellow_1 when due in 10–14 days', () => {
    // Feb 28 is 10 days from Feb 18 → yellow_1
    const result = getUrgencyInfo({
      due_date: '2026-02-28',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('yellow_1')
    expect(result.score).toBe(0.40)
  })

  it('returns green_3 when due in 15–21 days', () => {
    // Mar 10 is 20 days from Feb 18 → green_3
    const result = getUrgencyInfo({
      due_date: '2026-03-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.level).toBe('green_3')
    expect(result.score).toBe(0.30)
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

    // Mar 10 = 20 days away → green_3, score 0.30, diameter = 80 + 120*0.30 = 116
    const future = getUrgencyInfo({
      due_date: '2026-03-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(future.diameter).toBe(116)  // 80 + (120 * 0.30)
  })

  it('uses red_urgent config when colorScheme is red_urgent', () => {
    const green = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
      colorScheme: 'green_urgent',
    })
    const red = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
      colorScheme: 'red_urgent',
    })
    expect(green.color).not.toBe(red.color)
    expect(red.level).toBe('overdue')
  })

  it('uses custom colors when colorScheme is custom', () => {
    const customColors = getDefaultCustomColors('green_urgent')
    customColors.overdue.fill = '#ABCDEF'
    const result = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
      colorScheme: 'custom',
      customColors,
    })
    expect(result.color).toBe('#ABCDEF')
  })

  it('returns borderColor and textColor', () => {
    const result = getUrgencyInfo({
      due_date: '2026-02-10',
      for_later: false,
      created_at: '2026-02-01T00:00:00Z',
      today: TODAY,
    })
    expect(result.borderColor).toBeDefined()
    expect(result.textColor).toBeDefined()
  })
})
