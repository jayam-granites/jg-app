import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateInventoryBatchSchema, CreateInventorySlabSchema, UpdateInventoryBatchSchema, UpdateInventorySlabSchema } from '@jg-app/validators'
import { inventoryService } from './inventory.service'

export const inventoryRoutes = new Hono()
  .get('/', async (c) => {
    const batches = await inventoryService.getAll()
    return c.json({ data: batches })
  })
  .get('/available', async (c) => {
    const batches = await inventoryService.getAvailable()
    return c.json({ data: batches })
  })
  .get('/variants/:variantId', async (c) => {
    const variantId = Number(c.req.param('variantId'))
    const batches = await inventoryService.getByVariant(variantId)
    return c.json({ data: batches })
  })
  .get('/batches/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const batch = await inventoryService.getBatchById(id)
    return c.json({ data: batch })
  })
  .post('/batches', vValidator('json', CreateInventoryBatchSchema), async (c) => {
    const data = c.req.valid('json')
    const batch = await inventoryService.createBatch(data as any)
    return c.json({ data: batch }, 201)
  })
  .post('/slabs', vValidator('json', CreateInventorySlabSchema), async (c) => {
    const data = c.req.valid('json')
    const slab = await inventoryService.createSlab(data)
    return c.json({ data: slab }, 201)
  })
  .put('/batches/:id', vValidator('json', UpdateInventoryBatchSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const batch = await inventoryService.updateBatch(id, data as any)
    return c.json({ data: batch })
  })
  .put('/slabs/:id', vValidator('json', UpdateInventorySlabSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const slab = await inventoryService.updateSlab(id, data as any)
    return c.json({ data: slab })
  })
