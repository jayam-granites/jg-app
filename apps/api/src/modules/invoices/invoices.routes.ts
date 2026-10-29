import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import {
  CreateInvoiceCommissionSchema,
  CreateInvoicePaymentSchema,
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
} from '@jg-app/validators'
import { invoicesService } from './invoices.service'

export const invoicesRoutes = new Hono()
  .get('/', async (c) => {
    const data = await invoicesService.getAll()
    return c.json({ data })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const data = await invoicesService.getById(id)
    return c.json({ data })
  })
  .post('/', vValidator('json', CreateInvoiceSchema), async (c) => {
    const body = c.req.valid('json')
    const data = await invoicesService.create(body)
    return c.json({ data }, 201)
  })
  .put('/:id', vValidator('json', UpdateInvoiceSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const data = await invoicesService.update(id, body)
    return c.json({ data })
  })
  .post('/:id/payments', vValidator('json', CreateInvoicePaymentSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const data = await invoicesService.recordPayment(id, body)
    return c.json({ data }, 201)
  })
  .delete('/:id/payments/:paymentId', async (c) => {
    const id = Number(c.req.param('id'))
    const paymentId = Number(c.req.param('paymentId'))
    const data = await invoicesService.deletePayment(id, paymentId)
    return c.json({ data })
  })
  .post('/:id/commissions', vValidator('json', CreateInvoiceCommissionSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const data = await invoicesService.createCommission(id, body)
    return c.json({ data }, 201)
  })
  .delete('/:id/commissions/:commissionId', async (c) => {
    const id = Number(c.req.param('id'))
    const commissionId = Number(c.req.param('commissionId'))
    const data = await invoicesService.deleteCommission(id, commissionId)
    return c.json(data)
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await invoicesService.delete(id)
    return c.json({ success: true })
  })
