import { object, string, pipe, minLength, optional, parse } from 'valibot'

const envSchema = object({
  DATABASE_URL: pipe(string(), minLength(1, 'DATABASE_URL is required')),
  PORT: optional(string(), '3001'),
  NODE_ENV: optional(string(), 'development'),
  LOG_LEVEL: optional(string(), 'info'),
})

function validateEnv() {
  const result = parse(envSchema, process.env, { abortEarly: true })
  return {
    databaseUrl: result.DATABASE_URL,
    port: Number(result.PORT),
    nodeEnv: result.NODE_ENV,
    logLevel: result.LOG_LEVEL,
    isDev: result.NODE_ENV === 'development',
    isProd: result.NODE_ENV === 'production',
  }
}

export const env = validateEnv()
