import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CrmContactQuerySchema } from '@jg-app/validators'
import { crmService } from './crm.service'

export const crmRoutes = new Hono().get(
  '/contacts',
  vValidator('query', CrmContactQuerySchema),
  async (c) => {
    const data = await crmService.getContacts(c.req.valid('query'))
    return c.json({ data })
  },
)
