import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { UserSchema } from '@jg-app/validators'
import { userService } from './users.service'

export const userRoutes = new Hono()
  .get('/', async (c) => {
    const users = await userService.getAll()
    return c.json({ data: users })
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id')
    const user = await userService.getById(id)
    return c.json({ data: user })
  })
  .post('/', vValidator('json', UserSchema), async (c) => {
    const data = c.req.valid('json')
    const user = await userService.create(data)
    return c.json({ data: user }, 201)
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id')
    await userService.delete(id)
    return c.json({ data: null, message: 'User deleted' })
  })
