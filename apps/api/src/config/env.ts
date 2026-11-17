import { object, string, pipe, minLength, optional, parse } from 'valibot'

const envSchema = object({
  DATABASE_URL: pipe(string(), minLength(1, 'DATABASE_URL is required')),
  PORT: optional(string(), '3001'),
  NODE_ENV: optional(string(), 'development'),
  LOG_LEVEL: optional(string(), 'info'),
  BETTER_AUTH_SECRET: optional(string()),
  BETTER_AUTH_URL: optional(string()),
  WEB_ORIGIN: optional(string(), 'http://localhost:5173'),
  EXPENSE_SCHEDULE_TIME_ZONE: optional(pipe(string(), minLength(1)), 'Asia/Kolkata'),
  WHATSAPP_API_URL: optional(string()),
  WHATSAPP_API_KEY: optional(string()),
  WHATSAPP_SESSION_ID: optional(string()),
})

function validateEnv() {
  const result = parse(envSchema, process.env, { abortEarly: true })
  const port = Number(result.PORT)
  const whatsappApiUrl = result.WHATSAPP_API_URL?.trim() || undefined
  const whatsappApiKey = result.WHATSAPP_API_KEY?.trim() || undefined
  const whatsappSessionId = result.WHATSAPP_SESSION_ID?.trim() || undefined
  const whatsappValues = [whatsappApiUrl, whatsappApiKey, whatsappSessionId]
  const whatsappConfigured = whatsappValues.every(Boolean)

  if (whatsappValues.some(Boolean) && !whatsappConfigured) {
    throw new Error(
      'WHATSAPP_API_URL, WHATSAPP_API_KEY, and WHATSAPP_SESSION_ID must be configured together',
    )
  }

  if (whatsappApiUrl) {
    const parsedWhatsAppUrl = new URL(whatsappApiUrl)
    if (!['http:', 'https:'].includes(parsedWhatsAppUrl.protocol)) {
      throw new Error('WHATSAPP_API_URL must use HTTP or HTTPS')
    }
  }

  return {
    databaseUrl: result.DATABASE_URL,
    port,
    nodeEnv: result.NODE_ENV,
    logLevel: result.LOG_LEVEL,
    betterAuthSecret: result.BETTER_AUTH_SECRET,
    betterAuthUrl: result.BETTER_AUTH_URL ?? `http://localhost:${port}`,
    webOrigin: result.WEB_ORIGIN,
    expenseScheduleTimeZone: result.EXPENSE_SCHEDULE_TIME_ZONE,
    whatsappApiUrl: whatsappApiUrl?.replace(/\/+$/, ''),
    whatsappApiKey,
    whatsappSessionId,
    whatsappConfigured,
    isDev: result.NODE_ENV === 'development',
    isProd: result.NODE_ENV === 'production',
  }
}

export const env = validateEnv()
