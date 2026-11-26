import { describe, expect, it } from 'bun:test'
import { tomorrowAtLocalTime } from '../../lib/timezone'

describe('tomorrowAtLocalTime', () => {
  it('uses tomorrow in the configured calendar, not the UTC date', () => {
    expect(
      tomorrowAtLocalTime(
        'Asia/Kolkata',
        9,
        0,
        new Date('2026-01-01T10:00:00.000Z'),
      ).toISOString(),
    ).toBe('2026-01-02T03:30:00.000Z')
  })

  it('keeps 09:00 local across daylight-saving transitions', () => {
    expect(
      tomorrowAtLocalTime(
        'America/New_York',
        9,
        0,
        new Date('2026-03-07T12:00:00.000Z'),
      ).toISOString(),
    ).toBe('2026-03-08T13:00:00.000Z')
    expect(
      tomorrowAtLocalTime(
        'America/New_York',
        9,
        0,
        new Date('2026-10-31T12:00:00.000Z'),
      ).toISOString(),
    ).toBe('2026-11-01T14:00:00.000Z')
  })
})
