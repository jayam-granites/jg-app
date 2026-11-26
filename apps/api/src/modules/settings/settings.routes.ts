import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { vValidator } from '@hono/valibot-validator'
import {
  array,
  integer,
  maxLength,
  maxValue,
  minLength,
  minValue,
  number,
  object,
  optional,
  picklist,
  pipe,
  regex,
  string,
} from 'valibot'
import { requirePermission, type AuthEnvironment } from '#/middleware/authorization'
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

const InvoiceNumberingSchema = object({
  normalPrefix: pipe(string(), minLength(1), maxLength(50)),
  normalCurrentNumber: pipe(number(), integer(), minValue(0), maxValue(999_999_999)),
  gstPrefix: pipe(string(), minLength(1), maxLength(50)),
  gstCurrentNumber: pipe(number(), integer(), minValue(0), maxValue(999_999_999)),
  paddingDigits: pipe(number(), integer(), minValue(1), maxValue(10)),
})

const WhatsAppSettingsSchema = object({
  apiUrl: pipe(string(), maxLength(500)),
  apiKey: pipe(string(), maxLength(1000)),
  sessionId: pipe(string(), maxLength(200)),
})

export const settingsRoutes = new Hono<AuthEnvironment>()
  .use('*', bodyLimit({ maxSize: 4 * 1024 * 1024 }))
  .use('*', requirePermission('system:manage'))
  .get('/profile', async (c) => {
    const profile = await settingsService.getProfile()
    return c.json({ data: profile })
  })
  .put('/profile', vValidator('json', UpdateProfileSchema), async (c) => {
    const profile = await settingsService.updateProfile(c.req.valid('json'))
    return c.json({ data: profile, message: 'Company profile updated' })
  })
  .get('/invoice-numbering', async (c) => {
    const settings = await settingsService.getInvoiceNumbering()
    return c.json({ data: settings })
  })
  .put('/invoice-numbering', vValidator('json', InvoiceNumberingSchema), async (c) => {
    const settings = await settingsService.updateInvoiceNumbering(c.req.valid('json'))
    return c.json({ data: settings, message: 'Invoice numbering settings saved' })
  })
  .get('/whatsapp', async (c) => {
    const settings = await settingsService.getWhatsAppSettings()
    return c.json({ data: settings })
  })
  .put('/whatsapp', vValidator('json', WhatsAppSettingsSchema), async (c) => {
    const settings = await settingsService.updateWhatsAppSettings(c.req.valid('json'))
    return c.json({ data: settings, message: 'WhatsApp settings saved' })
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
