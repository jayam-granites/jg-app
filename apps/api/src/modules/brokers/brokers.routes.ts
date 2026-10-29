import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateBrokerSchema, UpdateBrokerSchema } from '@jg-app/validators'
import { brokersService } from './brokers.service'

export const brokersRoutes = new Hono()
  .get('/', async (c) => {
    const brokers = await brokersService.getAll()
    return c.json({ data: brokers })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const broker = await brokersService.getById(id)
    return c.json({ data: broker })
  })
  .post('/', vValidator('json', CreateBrokerSchema), async (c) => {
    const data = c.req.valid('json')
    const broker = await brokersService.create(data)
    return c.json({ data: broker }, 201)
  })
  .put('/:id', vValidator('json', UpdateBrokerSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const broker = await brokersService.update(id, data)
    return c.json({ data: broker })
  })
