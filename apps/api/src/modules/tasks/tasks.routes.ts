import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateTaskSchema, UpdateTaskSchema } from '@jg-app/validators'
import { parsePositiveId } from '#/lib/parse-id'
import { tasksService } from './tasks.service'

export const tasksRoutes = new Hono()
  .get('/', async (c) => {
    const data = await tasksService.getAll()
    return c.json({ data })
  })
  .get('/:id', async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    const data = await tasksService.getById(id)
    return c.json({ data })
  })
  .post('/', vValidator('json', CreateTaskSchema), async (c) => {
    const data = await tasksService.create(c.req.valid('json'))
    return c.json({ data }, 201)
  })
  .put('/:id', vValidator('json', UpdateTaskSchema), async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    const data = await tasksService.update(id, c.req.valid('json'))
    return c.json({ data })
  })
  .delete('/:id', async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    await tasksService.archive(id)
    return c.json({ success: true })
  })
