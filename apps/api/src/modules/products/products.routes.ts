import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateProductSchema, UpdateProductSchema } from '@jg-app/validators'
import { productService } from './products.service'

export const productRoutes = new Hono()
  .get('/', async (c) => {
    const products = await productService.getAll()
    return c.json({ data: products })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const product = await productService.getById(id)
    return c.json({ data: product })
  })
  .post('/', vValidator('json', CreateProductSchema), async (c) => {
    const data = c.req.valid('json')
    const product = await productService.create(data)
    return c.json({ data: product }, 201)
  })
  .put('/:id', vValidator('json', UpdateProductSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const product = await productService.update(id, data)
    return c.json({ data: product })
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await productService.delete(id)
    return c.json({ data: null, message: 'Product deleted' })
  })
