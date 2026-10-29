import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateSupplierSchema, UpdateSupplierSchema } from '@jg-app/validators'
import { suppliersService } from './suppliers.service'

export const suppliersRoutes = new Hono()
  .get('/', async (c) => {
    const suppliers = await suppliersService.getAll()
    return c.json({ data: suppliers })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const supplier = await suppliersService.getById(id)
    return c.json({ data: supplier })
  })
  .post('/', vValidator('json', CreateSupplierSchema), async (c) => {
    const data = c.req.valid('json')
    const supplier = await suppliersService.create(data)
    return c.json({ data: supplier }, 201)
  })
  .put('/:id', vValidator('json', UpdateSupplierSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const supplier = await suppliersService.update(id, data)
    return c.json({ data: supplier })
  })
