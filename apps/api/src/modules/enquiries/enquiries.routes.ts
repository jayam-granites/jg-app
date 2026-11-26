import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import {
  CreateCustomerEnquirySchema,
  UpdateCustomerEnquirySchema,
} from '@jg-app/validators'
import { check, object, optional, pipe, safeParse, string } from 'valibot'
import { ValidationError } from '#/lib/errors'
import { parsePositiveId } from '#/lib/parse-id'
import { enquiriesService } from './enquiries.service'

const UpdateEnquiryRequestSchema = object({
  ...UpdateCustomerEnquirySchema.entries,
  followUpDueDate: optional(
    pipe(
      string(),
      check((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid due date'),
    ),
  ),
})

const LogFollowUpSchema = object({
  notes: optional(string()),
})

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
  .post('/:id/follow-ups', async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    const body = await c.req.json().catch(() => ({}))
    const result = safeParse(LogFollowUpSchema, body)
    if (!result.success) throw new ValidationError('Invalid follow-up notes')
    const data = await enquiriesService.logFollowUp(id, result.output.notes)
    return c.json({ data }, 201)
  })
  .put('/:id', vValidator('json', UpdateEnquiryRequestSchema), async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    const data = await enquiriesService.update(id, c.req.valid('json'))
    return c.json({ data })
  })
  .delete('/:id', async (c) => {
    const id = parsePositiveId(c.req.param('id'))
    await enquiriesService.archive(id)
    return c.json({ success: true })
  })
