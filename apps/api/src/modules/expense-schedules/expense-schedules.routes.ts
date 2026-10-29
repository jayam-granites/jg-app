import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateExpenseScheduleSchema, UpdateExpenseScheduleSchema } from '@jg-app/validators'
import { expenseSchedulesService } from './expense-schedules.service'

export const expenseSchedulesRoutes = new Hono()
  .get('/', async (c) => {
    const schedules = await expenseSchedulesService.getAll()
    return c.json({ data: schedules })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const schedule = await expenseSchedulesService.getById(id)
    return c.json({ data: schedule })
  })
  .post('/', vValidator('json', CreateExpenseScheduleSchema), async (c) => {
    const data = c.req.valid('json')
    const schedule = await expenseSchedulesService.create(data)
    return c.json({ data: schedule }, 201)
  })
  .put('/:id', vValidator('json', UpdateExpenseScheduleSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const schedule = await expenseSchedulesService.update(id, data)
    return c.json({ data: schedule })
  })
