import { Hono } from 'hono'
import { vValidator } from '@hono/valibot-validator'
import { boolean, maxLength, minLength, object, optional, pipe, regex, string } from 'valibot'
import { ValidationError } from '#/lib/errors'
import { upiProfilesService } from './upi-profiles.service'

const UpiVpaSchema = pipe(
  string(),
  maxLength(323),
  regex(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, 'Enter a valid UPI ID, such as merchant@bank'),
)
const PayeeNameSchema = pipe(string(), minLength(1), maxLength(200))

const CreateUpiProfileSchema = object({
  payeeVPA: UpiVpaSchema,
  payeeName: PayeeNameSchema,
  isDefault: optional(boolean()),
})

const UpdateUpiProfileSchema = object({
  payeeVPA: optional(UpiVpaSchema),
  payeeName: optional(PayeeNameSchema),
  isDefault: optional(boolean()),
})

function profileId(rawId: string) {
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ValidationError('UPI profile ID must be a positive integer')
  }
  return id
}

export const upiProfilesRoutes = new Hono()
  .get('/', async (c) => {
    const profiles = await upiProfilesService.list()
    return c.json({ data: profiles })
  })
  .post('/', vValidator('json', CreateUpiProfileSchema), async (c) => {
    const profile = await upiProfilesService.create(c.req.valid('json'))
    return c.json({ data: profile }, 201)
  })
  .put('/:id', vValidator('json', UpdateUpiProfileSchema), async (c) => {
    const profile = await upiProfilesService.update(
      profileId(c.req.param('id')),
      c.req.valid('json'),
    )
    return c.json({ data: profile })
  })
  .delete('/:id', async (c) => {
    await upiProfilesService.delete(profileId(c.req.param('id')))
    return c.json({ data: null, message: 'UPI profile deleted' })
  })
