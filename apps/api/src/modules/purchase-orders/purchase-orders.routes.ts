import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreatePurchaseOrderSchema, UpdatePurchaseOrderSchema } from '@jg-app/validators'
import { purchaseOrdersService } from './purchase-orders.service'

export const purchaseOrdersRoutes = new Hono()
  .get('/', async (c) => {
    const orders = await purchaseOrdersService.getAll()
    return c.json({ data: orders })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const order = await purchaseOrdersService.getById(id)
    return c.json({ data: order })
  })
  .post('/', vValidator('json', CreatePurchaseOrderSchema), async (c) => {
    const data = c.req.valid('json')
    const order = await purchaseOrdersService.create(data as any)
    return c.json({ data: order }, 201)
  })
  .put('/:id', vValidator('json', UpdatePurchaseOrderSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const order = await purchaseOrdersService.update(id, data as any)
    return c.json({ data: order })
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await purchaseOrdersService.delete(id)
    return c.json({ data: null, message: 'Purchase order deleted' })
  })
