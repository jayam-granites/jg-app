import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateMeasurementSchema, UpdateMeasurementSchema } from '@jg-app/validators'
import { measurementsService } from './measurements.service'

export const measurementsRoutes = new Hono()
  .get('/', async (c) => {
    const measurements = await measurementsService.getAll()
    return c.json({ data: measurements })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const measurement = await measurementsService.getById(id)
    if (!measurement) return c.json({ error: { message: 'Measurement not found' } }, 404)
    return c.json({ data: measurement })
  })
  .post('/', vValidator('json', CreateMeasurementSchema), async (c) => {
    const body = c.req.valid('json')
    const measurement = await measurementsService.create({
      name: body.name,
      phone: body.phone,
      address: body.address,
      notes: body.notes,
    })
    return c.json({ data: measurement }, 201)
  })
  .put('/:id', vValidator('json', UpdateMeasurementSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const measurement = await measurementsService.update(id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    })
    return c.json({ data: measurement })
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await measurementsService.delete(id)
    return c.json({ success: true })
  })
