import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { vValidator } from '@hono/valibot-validator'
import { CommitProductImportSchema, UploadProductImportSchema } from '@jg-app/validators'
import { ValidationError } from '#/lib/errors'
import type { AuthEnvironment } from '#/middleware/authorization'
import { productImportService } from './product-import.service'

export const productImportRoutes = new Hono<AuthEnvironment>()
  .get('/template', async (c) => {
    const workbook = await productImportService.generateTemplate()
    return c.body(workbook, 200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="product-import-template.xlsx"',
    })
  })
  .post(
    '/validate',
    bodyLimit({ maxSize: 13 * 1024 * 1024 }),
    vValidator('json', UploadProductImportSchema),
    async (c) => {
      const body = c.req.valid('json')
      const result = await productImportService.enqueueValidation({
        fileName: body.fileName,
        fileBase64: body.fileBase64,
        requestedById: c.get('user').id,
      })
      return c.json({ data: result }, 202)
    },
  )
  .post('/commit', vValidator('json', CommitProductImportSchema), async (c) => {
    const body = c.req.valid('json')
    const result = await productImportService.enqueueCommit({
      jobId: body.jobId,
      requestedById: c.get('user').id,
    })
    return c.json({ data: result }, 202)
  })
  .get('/jobs/:jobId', async (c) => {
    const job = await productImportService.getJob(c.req.param('jobId'))
    if (!job) {
      const error = new ValidationError('Import job not found')
      error.statusCode = 404
      throw error
    }
    return c.json({ data: job })
  })
