import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateCustomerSchema, UpdateCustomerSchema } from '@jg-app/validators'
import { customersService } from './customers.service'

export const customersRoutes = new Hono()
  .get('/', async (c) => {
    const data = await customersService.getAll()
    return c.json({ data })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const data = await customersService.getById(id)
    return c.json({ data })
  })
  .post('/', vValidator('json', CreateCustomerSchema), async (c) => {
    const body = c.req.valid('json')
    const data = await customersService.create(body)
    return c.json({ data }, 201)
  })
  .put('/:id', vValidator('json', UpdateCustomerSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const data = await customersService.update(id, body)
    return c.json({ data })
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await customersService.delete(id)
    return c.json({ success: true })
  })
