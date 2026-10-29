import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreatePurchaseReceiptSchema, UpdatePurchaseReceiptSchema } from '@jg-app/validators'
import { purchaseReceiptsService } from './purchase-receipts.service'

export const purchaseReceiptsRoutes = new Hono()
  .get('/', async (c) => {
    const receipts = await purchaseReceiptsService.getAll()
    return c.json({ data: receipts })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const receipt = await purchaseReceiptsService.getById(id)
    return c.json({ data: receipt })
  })
  .post('/', vValidator('json', CreatePurchaseReceiptSchema), async (c) => {
    const data = c.req.valid('json')
    const receipt = await purchaseReceiptsService.create(data as any)
    return c.json({ data: receipt }, 201)
  })
  .put('/:id', vValidator('json', UpdatePurchaseReceiptSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const receipt = await purchaseReceiptsService.update(id, data as any)
    return c.json({ data: receipt })
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await purchaseReceiptsService.delete(id)
    return c.json({ data: null, message: 'Purchase receipt deleted' })
  })
