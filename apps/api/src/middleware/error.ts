import type { ErrorHandler } from 'hono'
import { Prisma } from '@prisma/client'
import { AppError } from '#/lib/errors'
import { logger } from '#/lib/logger'

export const errorMiddleware: ErrorHandler = (err, c) => {
  const log = c.var.logger ?? logger

  if (err instanceof AppError) {
    log.warn({ code: err.code, status: err.statusCode, message: err.message })
    return c.json(
      { error: { code: err.code, message: err.message } },
      err.statusCode as 400 | 404 | 409 | 500,
    )
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      log.warn({ code: err.code, message: 'Unique constraint failed' })
      return c.json(
        { error: { code: 'CONFLICT', message: 'A record with these details already exists' } },
        409,
      )
    }
    if (err.code === 'P2003') {
      log.warn({ code: err.code, message: 'Foreign key constraint failed' })
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Referenced record does not exist' } },
        400,
      )
    }
    if (err.code === 'P2025') {
      log.warn({ code: err.code, message: 'Record not found' })
      return c.json({ error: { code: 'NOT_FOUND', message: 'Record not found' } }, 404)
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    log.error({ err, message: 'Prisma client is out of sync with the database schema' })
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Database client out of sync. Run "bun run db-generate" and restart the API.',
        },
      },
      500,
    )
  }

  log.error({ err, message: 'Unhandled error' })
  return c.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    500 as const,
  )
}
