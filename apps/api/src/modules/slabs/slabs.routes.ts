import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateSlabSchema, UpdateSlabSchema } from '@jg-app/validators'
import { slabsService } from './slabs.service'

export const slabsRoutes = new Hono()
  .get('/', async (c) => {
    const slabs = await slabsService.getAll()
    return c.json({ data: slabs })
  })
  .get('/by-measurement/:measurementId', async (c) => {
    const measurementId = Number(c.req.param('measurementId'))
    const slabs = await slabsService.getByMeasurement(measurementId)
    return c.json({ data: slabs })
  })
  .get('/:productId', async (c) => {
    const productId = Number(c.req.param('productId'))
    const slabs = await slabsService.getByProduct(productId)
    return c.json({ data: slabs })
  })
  .post('/', vValidator('json', CreateSlabSchema), async (c) => {
    const data = c.req.valid('json')
    const slab = await slabsService.create(data)
    return c.json({ data: slab }, 201)
  })
  .put('/:id', vValidator('json', UpdateSlabSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const slab = await slabsService.update(id, data)
    return c.json({ data: slab })
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await slabsService.delete(id)
    return c.json({ success: true })
  })
