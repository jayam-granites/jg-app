import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateTransportSchema, UpdateTransportSchema } from '@jg-app/validators'
import { transportService } from './transport.service'

export const transportRoutes = new Hono()
  .get('/', async (c) => {
    const providers = await transportService.getAll()
    return c.json({ data: providers })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const provider = await transportService.getById(id)
    return c.json({ data: provider })
  })
  .post('/', vValidator('json', CreateTransportSchema), async (c) => {
    const data = c.req.valid('json')
    const provider = await transportService.create(data)
    return c.json({ data: provider }, 201)
  })
  .put('/:id', vValidator('json', UpdateTransportSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const provider = await transportService.update(id, data)
    return c.json({ data: provider })
  })
