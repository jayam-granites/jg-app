import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import {
  CreateCustomerEnquirySchema,
  UpdateCustomerEnquirySchema,
} from '@jg-app/validators'
import { parsePositiveId } from '#/lib/parse-id'
import { enquiriesService } from './enquiries.service'

export const enquiriesRoutes = new Hono()
  .get('/', async (c) => {
    const data = await enquiriesService.getAll()
    return c.json({ data })
  })
  .get('/:id', async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    const data = await enquiriesService.getById(id)
    return c.json({ data })
  })
  .post('/', vValidator('json', CreateCustomerEnquirySchema), async (c) => {
    const data = await enquiriesService.create(c.req.valid('json'))
    return c.json({ data }, 201)
  })
  .put('/:id', vValidator('json', UpdateCustomerEnquirySchema), async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    const data = await enquiriesService.update(id, c.req.valid('json'))
    return c.json({ data })
  })
  .delete('/:id', async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    await enquiriesService.archive(id)
    return c.json({ success: true })
  })
