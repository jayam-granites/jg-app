import { mkdir, rename, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const backupDirectory = fileURLToPath(new URL('../../../../../backup/', import.meta.url))

export function getPgDumpEnvironment(databaseUrl: string): Record<string, string> {
  const connection = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(connection.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol')
  }

  const database = decodeURIComponent(connection.pathname.slice(1))
  if (!connection.hostname || !database) {
    throw new Error('DATABASE_URL must include a database host and name')
  }

  const environment: Record<string, string> = {
    PGHOST: connection.hostname.replace(/^\[|\]$/g, ''),
    PGUSER: decodeURIComponent(connection.username),
    PGPASSWORD: decodeURIComponent(connection.password),
    PGDATABASE: database,
  }

  if (connection.port) environment.PGPORT = connection.port

  const libpqParameters = [
    'sslmode',
    'sslrootcert',
    'sslcert',
    'sslkey',
    'sslcrl',
    'sslcrldir',
    'channel_binding',
    'connect_timeout',
    'application_name',
  ] as const
  for (const parameter of libpqParameters) {
    const value = connection.searchParams.get(parameter)
    if (value) {
      const name = parameter.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
      environment[`PG${name.toUpperCase()}`] = value
    }
  }

  return environment
}

function localDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: 'year' | 'month' | 'day') =>
    parts.find((item) => item.type === type)?.value ?? ''

  return `${part('year')}-${part('month')}-${part('day')}`
}

export async function createDailyDatabaseBackup(
  databaseUrl: string,
  timeZone: string,
): Promise<string> {
  const backupPath = `${backupDirectory}${localDateKey(new Date(), timeZone)}.dump`
  const temporaryPath = `${backupPath}.tmp`
  await mkdir(dirname(backupPath), { recursive: true })

  try {
    const process = Bun.spawn(
      ['pg_dump', '--format=custom', '--no-owner', '--no-acl', '--file', temporaryPath],
      {
        env: {
          ...globalThis.process.env,
          ...getPgDumpEnvironment(databaseUrl),
        },
        stdout: 'ignore',
        stderr: 'pipe',
      },
    )
    const [exitCode, stderr] = await Promise.all([
      process.exited,
      new Response(process.stderr).text(),
    ])

    if (exitCode !== 0) {
      throw new Error(`pg_dump exited with code ${exitCode}: ${stderr.trim() || 'no error output'}`)
    }

    await rename(temporaryPath, backupPath)
    return backupPath
  } catch (error) {
    await rm(temporaryPath, { force: true })
    throw error
  }
}
