import { prisma } from '#/lib/prisma'
import type { Prisma } from '@prisma/client'

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
}
