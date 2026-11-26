import { prisma } from '#/lib/prisma'

export type CrmEntityKey =
  | 'enquiry'
  | 'resource'
  | 'customer'
  | 'supplier'
  | 'broker'
  | 'transport'

export type OpenTaskLink = {
  enquiryId: number | null
  resourceId: number | null
  customerId: number | null
  supplierId: number | null
  brokerId: number | null
  transportId: number | null
}

export async function findActiveContacts() {
  const [enquiries, resources, customers, suppliers, brokers, transportProviders, openTasks] =
    await Promise.all([
      prisma.customerEnquiry.findMany({
        where: { isActive: true },
        select: { id: true, customerName: true, mobile: true, requirementsNotes: true },
      }),
      prisma.resourceContact.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          mobile: true,
          tierGroup: true,
          productNotes: true,
        },
      }),
      prisma.customer.findMany({
        where: { isActive: true },
        select: { id: true, name: true, mobile: true, address: true },
      }),
      prisma.supplier.findMany({
        where: { isActive: true },
        select: { id: true, name: true, mobile: true, address: true },
      }),
      prisma.broker.findMany({
        where: { isActive: true },
        select: { id: true, name: true, mobile: true, address: true },
      }),
      prisma.transportProvider.findMany({
        where: { isActive: true },
        select: { id: true, name: true, mobile: true, vehicleNumber: true, address: true },
      }),
      prisma.task.findMany({
        where: { isActive: true, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        select: {
          enquiryId: true,
          resourceId: true,
          customerId: true,
          supplierId: true,
          brokerId: true,
          transportId: true,
        },
      }),
    ])

  return { enquiries, resources, customers, suppliers, brokers, transportProviders, openTasks }
}

export function countOpenTasks(openTasks: OpenTaskLink[]): Map<string, number> {
  const counts = new Map<string, number>()
  const bump = (key: CrmEntityKey, id: number | null) => {
    if (id == null) return
    const mapKey = `${key}:${id}`
    counts.set(mapKey, (counts.get(mapKey) ?? 0) + 1)
  }

  for (const task of openTasks) {
    bump('enquiry', task.enquiryId)
    bump('resource', task.resourceId)
    bump('customer', task.customerId)
    bump('supplier', task.supplierId)
    bump('broker', task.brokerId)
    bump('transport', task.transportId)
  }

  return counts
}
