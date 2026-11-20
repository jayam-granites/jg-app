import { describe, expect, it } from 'bun:test'
import { normalizeDatabaseUrl } from './database-url'

describe('normalizeDatabaseUrl', () => {
  it.each(['prefer', 'require', 'verify-ca'])(
    'uses verify-full for the deprecated %s SSL mode',
    (sslMode) => {
      const databaseUrl = normalizeDatabaseUrl(
        `postgresql://db.example.com/app?sslmode=${sslMode}&channel_binding=require`,
      )

      expect(new URL(databaseUrl).searchParams.get('sslmode')).toBe('verify-full')
      expect(new URL(databaseUrl).searchParams.get('channel_binding')).toBe('require')
    },
  )

  it('preserves libpq compatibility mode', () => {
    const databaseUrl =
      'postgresql://db.example.com/app?sslmode=require&uselibpqcompat=true'

    expect(normalizeDatabaseUrl(databaseUrl)).toBe(databaseUrl)
  })

  it('leaves non-deprecated SSL modes unchanged', () => {
    const databaseUrl = 'postgresql://db.example.com/app?sslmode=verify-full'

    expect(normalizeDatabaseUrl(databaseUrl)).toBe(databaseUrl)
  })
})
