import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import {
  CreateResourceContactSchema,
  UpdateResourceContactSchema,
} from '@jg-app/validators'
import { parsePositiveId } from '#/lib/parse-id'
import { resourcesService } from './resources.service'

export const resourcesRoutes = new Hono()
  .get('/', async (c) => {
    const data = await resourcesService.getAll()
    return c.json({ data })
  })
  .get('/:id', async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    const data = await resourcesService.getById(id)
    return c.json({ data })
  })
  .post('/', vValidator('json', CreateResourceContactSchema), async (c) => {
    const data = await resourcesService.create(c.req.valid('json'))
    return c.json({ data }, 201)
  })
  .put('/:id', vValidator('json', UpdateResourceContactSchema), async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    const data = await resourcesService.update(id, c.req.valid('json'))
    return c.json({ data })
  })
  .delete('/:id', async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    await resourcesService.archive(id)
    return c.json({ success: true })
  })
