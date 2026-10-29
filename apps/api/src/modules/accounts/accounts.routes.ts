import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { CreateAccountSchema, UpdateAccountSchema, CreateAccountAdjustmentSchema } from '@jg-app/validators'
import { accountsService } from './accounts.service'

export const accountsRoutes = new Hono()
  .get('/', async (c) => {
    const accounts = await accountsService.getAll()
    return c.json(accounts)
  })
  .get('/all', async (c) => {
    const accounts = await accountsService.getAllWithInactive()
    return c.json(accounts)
  })
  .get('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const account = await accountsService.getById(id)
    return c.json(account)
  })
  .get('/:id/statement', async (c) => {
    const id = Number(c.req.param('id'))
    const statement = await accountsService.getStatement(id)
    return c.json(statement)
  })
  .post('/', vValidator('json', CreateAccountSchema), async (c) => {
    const body = c.req.valid('json')
    const account = await accountsService.create(body)
    return c.json(account, 201)
  })
  .post('/adjustment', vValidator('json', CreateAccountAdjustmentSchema), async (c) => {
    const body = c.req.valid('json')
    const account = await accountsService.adjustBalance(body.accountId, {
      type: body.type,
      amount: body.amount,
      note: body.note,
      transactionDate: body.transactionDate,
    })
    return c.json(account, 201)
  })
  .put('/:id', vValidator('json', UpdateAccountSchema), async (c) => {
    const id = Number(c.req.param('id'))
    const body = c.req.valid('json')
    const account = await accountsService.update(id, body)
    return c.json(account)
  })
  .delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const account = await accountsService.delete(id)
    return c.json(account)
  })
