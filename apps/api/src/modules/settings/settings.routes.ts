import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { vValidator } from '@hono/valibot-validator'
import {
  array,
  maxLength,
  minLength,
  object,
  optional,
  picklist,
  pipe,
  regex,
  string,
} from 'valibot'
import { ForbiddenError } from '#/lib/errors'
import { auth } from '#/lib/auth'
import { settingsService } from './settings.service'

const optionalText = (limit: number) => optional(pipe(string(), maxLength(limit)))
const ImageSchema = optionalText(2_800_000)

const UpdateProfileSchema = object({
  companyName: optionalText(200),
  address: optionalText(1000),
  logoUrl: ImageSchema,
  website: optionalText(300),
  primaryPhone: optionalText(30),
  secondaryPhone: optionalText(30),
  email: optionalText(254),
  gstNumber: optionalText(15),
  panNumber: optionalText(10),
  tanNumber: optionalText(10),
  bankName: optionalText(150),
  accountHolderName: optionalText(150),
  accountNumber: optionalText(50),
  ifscCode: optionalText(11),
  branch: optionalText(150),
  upiId: optionalText(260),
  upiQrUrl: ImageSchema,
})

const ConfigurationSchema = object({
  configKey: pipe(string(), minLength(2), maxLength(100), regex(/^[a-z][a-z0-9_]{1,99}$/)),
  configLabel: pipe(string(), minLength(1), maxLength(150)),
  configValue: pipe(string(), maxLength(10_000)),
  dataType: picklist(['string', 'number', 'boolean', 'select', 'json']),
  options: optional(array(object({
    label: pipe(string(), minLength(1), maxLength(100)),
    value: pipe(string(), maxLength(250)),
  }))),
  category: optional(pipe(string(), maxLength(100))),
  description: optional(pipe(string(), maxLength(1000))),
})

export const settingsRoutes = new Hono()
  .use('*', bodyLimit({ maxSize: 4 * 1024 * 1024 }))
  .use('*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })
    if (!session) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401)
    }
    if (session.user.role !== 'super_admin') {
      throw new ForbiddenError('Super admin access is required')
    }
    await next()
  })
  .get('/profile', async (c) => {
    const profile = await settingsService.getProfile()
    return c.json({ data: profile })
  })
  .put('/profile', vValidator('json', UpdateProfileSchema), async (c) => {
    const profile = await settingsService.updateProfile(c.req.valid('json'))
    return c.json({ data: profile, message: 'Company profile updated' })
  })
  .get('/system-configurations', async (c) => {
    const configurations = await settingsService.listConfigurations()
    return c.json({ data: configurations })
  })
  .post('/system-configurations', vValidator('json', ConfigurationSchema), async (c) => {
    const configuration = await settingsService.createConfiguration(c.req.valid('json'))
    return c.json({ data: configuration }, 201)
  })
  .put('/system-configurations/:id', vValidator('json', ConfigurationSchema), async (c) => {
    const configuration = await settingsService.updateConfiguration(
      c.req.param('id'),
      c.req.valid('json'),
    )
    return c.json({ data: configuration })
  })
  .delete('/system-configurations/:id', async (c) => {
    await settingsService.deleteConfiguration(c.req.param('id'))
    return c.json({ data: null, message: 'Configuration deleted' })
  })
