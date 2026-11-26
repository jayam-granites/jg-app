import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import {
  CreateResourceContactSchema,
  TierGroupEnum,
  TradeContactTypeEnum,
  UpdateResourceContactSchema,
} from '@jg-app/validators'
import { object, optional } from 'valibot'
import { parsePositiveId } from '#/lib/parse-id'
import { resourcesService } from './resources.service'

const ResourceFilterSchema = object({
  contactType: optional(TradeContactTypeEnum),
  tierGroup: optional(TierGroupEnum),
})

export const resourcesRoutes = new Hono()
  .get('/', vValidator('query', ResourceFilterSchema), async (c) => {
    const data = await resourcesService.getAll(c.req.valid('query'))
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
