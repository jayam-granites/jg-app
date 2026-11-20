const deprecatedSslModes = new Set(['prefer', 'require', 'verify-ca'])

export function normalizeDatabaseUrl(databaseUrl: string): string {
  const connection = new URL(databaseUrl)
  const sslMode = connection.searchParams.get('sslmode')?.toLowerCase()
  const usesLibpqCompatibility =
    connection.searchParams.get('uselibpqcompat')?.toLowerCase() === 'true'

  if (sslMode && deprecatedSslModes.has(sslMode) && !usesLibpqCompatibility) {
    connection.searchParams.set('sslmode', 'verify-full')
    return connection.toString()
  }

  return databaseUrl
}
