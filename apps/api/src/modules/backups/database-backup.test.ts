import { describe, expect, it } from 'bun:test'
import { getPgDumpEnvironment } from './database-backup'

describe('getPgDumpEnvironment', () => {
  it('converts an encoded PostgreSQL connection URL to pg_dump environment variables', () => {
    expect(
      getPgDumpEnvironment(
        'postgresql://backup%40user:p%40ss%3Aword@db.example.com:5433/app%20data?sslmode=require&channel_binding=require',
      ),
    ).toEqual({
      PGHOST: 'db.example.com',
      PGPORT: '5433',
      PGUSER: 'backup@user',
      PGPASSWORD: 'p@ss:word',
      PGDATABASE: 'app data',
      PGSSLMODE: 'require',
      PGCHANNELBINDING: 'require',
    })
  })

  it('rejects unsupported URLs and URLs without a database name', () => {
    expect(() => getPgDumpEnvironment('mysql://db.example.com/app')).toThrow(
      'DATABASE_URL must use the postgres or postgresql protocol',
    )
    expect(() => getPgDumpEnvironment('postgresql://db.example.com')).toThrow(
      'DATABASE_URL must include a database host and name',
    )
  })
})
