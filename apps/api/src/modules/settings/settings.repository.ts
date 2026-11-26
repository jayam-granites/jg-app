import { prisma } from '#/lib/prisma'
import type { Prisma } from '@prisma/client'
import { SETTINGS_KEYS, type InvoiceNumberScope, type InvoiceNumberSettings, type WhatsAppSettings } from '@jg-app/shared'

export const settingsRepository = {
  getProfile() {
    return prisma.companySettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        companyName: 'Jayam Granites',
        address: 'Avinashi Road, Lingam Palayam Bus Stop, Palangarai (Vill), Tiruppur (Dt).',
        primaryPhone: '7530044200',
        secondaryPhone: '7530044722',
        email: 'jayamgranitestn39@gmail.com',
        gstNumber: '33GSYPD6667L1ZS',
        bankName: 'HDFC BANK',
        accountHolderName: 'JAYAM GRANITES',
        accountNumber: '50200097002262',
        ifscCode: 'HDFC0002225',
        branch: 'AVINASHI',
        upiId: '6382483513@hdfc',
      },
      update: {},
    })
  },

  updateProfile(data: Prisma.CompanySettingsUpdateInput) {
    return prisma.companySettings.update({ where: { id: 1 }, data })
  },

  listConfigurations() {
    return prisma.systemConfiguration.findMany({
      orderBy: [{ category: 'asc' }, { configLabel: 'asc' }],
    })
  },

  createConfiguration(data: Prisma.SystemConfigurationCreateInput) {
    return prisma.systemConfiguration.create({ data })
  },

  updateConfiguration(id: string, data: Prisma.SystemConfigurationUpdateInput) {
    return prisma.systemConfiguration.update({ where: { id }, data })
  },

  deleteConfiguration(id: string) {
    return prisma.systemConfiguration.delete({ where: { id } })
  },

  async getWhatsAppSettings(): Promise<WhatsAppSettings> {
    const rows = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            SETTINGS_KEYS.WHATSAPP_API_URL,
            SETTINGS_KEYS.WHATSAPP_API_KEY,
            SETTINGS_KEYS.WHATSAPP_SESSION_ID,
          ],
        },
      },
      select: { key: true, value: true },
    })
    const values = new Map(rows.map((row) => [row.key, row.value]))
    return {
      apiUrl: values.get(SETTINGS_KEYS.WHATSAPP_API_URL) ?? '',
      apiKey: values.get(SETTINGS_KEYS.WHATSAPP_API_KEY) ?? '',
      sessionId: values.get(SETTINGS_KEYS.WHATSAPP_SESSION_ID) ?? '',
    }
  },

  async saveWhatsAppSettings(settings: WhatsAppSettings): Promise<WhatsAppSettings> {
    const values: [string, string][] = [
      [SETTINGS_KEYS.WHATSAPP_API_URL, settings.apiUrl],
      [SETTINGS_KEYS.WHATSAPP_API_KEY, settings.apiKey],
      [SETTINGS_KEYS.WHATSAPP_SESSION_ID, settings.sessionId],
    ]
    await prisma.$transaction(
      values.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    )
    return settings
  },

  getInvoiceNumberSequences() {
    return prisma.invoiceNumberSequence.findMany()
  },

  upsertInvoiceNumberSequence(
    scope: InvoiceNumberScope,
    data: { prefix: string; currentNumber: number; paddingDigits: number },
  ) {
    return prisma.invoiceNumberSequence.upsert({
      where: { scope },
      create: { scope, ...data },
      update: {},
    })
  },

  updateInvoiceNumberSequence(
    scope: InvoiceNumberScope,
    data: { prefix: string; currentNumber: number; paddingDigits: number },
  ) {
    return prisma.invoiceNumberSequence.update({ where: { scope }, data })
  },

  saveInvoiceNumbering(settings: InvoiceNumberSettings) {
    const data = {
      paddingDigits: settings.paddingDigits,
      updatedAt: new Date(),
    }
    return prisma.$transaction([
      prisma.invoiceNumberSequence.update({
        where: { scope: 'normal' },
        data: { ...data, prefix: settings.normalPrefix, currentNumber: settings.normalCurrentNumber },
      }),
      prisma.invoiceNumberSequence.update({
        where: { scope: 'gst' },
        data: { ...data, prefix: settings.gstPrefix, currentNumber: settings.gstCurrentNumber },
      }),
    ])
  },

  /** Highest sequence already used by an invoice of this type (0 when none). */
  async findMaxUsedInvoiceSequence(scope: InvoiceNumberScope) {
    const rows = await prisma.$queryRaw<{ max_sequence: number | bigint | null }[]>`
      SELECT MAX(CAST(regexp_replace("invoice_number", '^.*/', '') AS INTEGER)) AS max_sequence
      FROM "invoices"
      WHERE "invoice_type" = ${scope} AND "invoice_number" ~ '/[0-9]+$'
    `
    return Number(rows[0]?.max_sequence ?? 0)
  },
}
