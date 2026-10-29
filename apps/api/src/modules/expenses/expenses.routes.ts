import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateExpenseSchema, UpdateExpenseSchema } from '@jg-app/validators'
import { expensesService } from './expenses.service'

export const expensesRoutes = new Hono()
  .get('/', async (c) => {
    const expenses = await expensesService.getAll()
    return c.json({ data: expenses })
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const expense = await expensesService.getById(id)
    return c.json({ data: expense })
  })
  .post('/', vValidator('json', CreateExpenseSchema), async (c) => {
    const data = c.req.valid('json')
    const expense = await expensesService.create(data)
    return c.json({ data: expense }, 201)
  })
  .put('/:id', vValidator('json', UpdateExpenseSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const data = c.req.valid('json')
    const expense = await expensesService.update(id, data)
    return c.json({ data: expense })
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    await expensesService.delete(id)
    return c.json({ success: true })
  })
