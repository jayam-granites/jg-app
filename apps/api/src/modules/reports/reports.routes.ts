import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { ReportsQuerySchema } from '@jg-app/validators'
import { parsePositiveId } from '#/lib/parse-id'
import { reportsService } from './reports.service'

export const reportsRoutes = new Hono()
  .get('/sales', vValidator('query', ReportsQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const data = await reportsService.getSalesReport(query)
    return c.json({ data })
  })
  .get('/invoices/:id/insight', async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    const data = await reportsService.getInvoiceInsight(id)
    return c.json({ data })
  })
