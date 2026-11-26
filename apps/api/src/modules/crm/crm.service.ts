import type { InferOutput } from 'valibot'
import { safeParse } from 'valibot'
import {
  CrmContactQuerySchema,
  CrmEntityTypeEnum,
  type CrmContact,
} from '@jg-app/validators'
import { ValidationError } from '#/lib/errors'
import { countOpenTasks, findActiveContacts, type CrmEntityKey } from './crm.repository'

type CrmQuery = InferOutput<typeof CrmContactQuerySchema>

const SOURCE_ROUTES: Record<CrmEntityKey, string> = {
  enquiry: '/enquiries',
  resource: '/resources',
  customer: '/customers',
  supplier: '/suppliers',
  broker: '/brokers',
  transport: '/transport',
}

const CATEGORY_LABELS: Record<CrmEntityKey, string> = {
  enquiry: 'Customer enquiry',
  resource: 'Resource contact',
  customer: 'Customer',
  supplier: 'Supplier',
  broker: 'Broker',
  transport: 'Transport provider',
}

const ENTITY_TYPE_CANDIDATES: Record<CrmEntityKey, string[]> = {
  enquiry: [
    'enquiry',
    'ENQUIRY',
    'enquiries',
    'ENQUIRIES',
    'customerEnquiry',
    'CUSTOMER_ENQUIRY',
    'customer_enquiry',
    'CUSTOMERENQUIRY',
  ],
  resource: [
    'resource',
    'RESOURCE',
    'resources',
    'RESOURCES',
    'resourceContact',
    'RESOURCE_CONTACT',
    'resource_contact',
    'RESOURCECONTACT',
  ],
  customer: ['customer', 'CUSTOMER', 'customers', 'CUSTOMERS'],
  supplier: ['supplier', 'SUPPLIER', 'suppliers', 'SUPPLIERS'],
  broker: ['broker', 'BROKER', 'brokers', 'BROKERS'],
  transport: [
    'transport',
    'TRANSPORT',
    'transports',
    'TRANSPORTS',
    'transportProvider',
    'TRANSPORT_PROVIDER',
    'transport_provider',
    'TRANSPORTPROVIDER',
  ],
}

const entityTypeCache = new Map<CrmEntityKey, CrmContact['entityType']>()

function resolveEntityType(key: CrmEntityKey): CrmContact['entityType'] {
  const cached = entityTypeCache.get(key)
  if (cached) return cached

  for (const candidate of ENTITY_TYPE_CANDIDATES[key]) {
    const parsed = safeParse(CrmEntityTypeEnum, candidate)
    if (parsed.success) {
      const entityType = parsed.output as CrmContact['entityType']
      entityTypeCache.set(key, entityType)
      return entityType
    }
  }

  throw new ValidationError(`Unsupported CRM entity type: ${key}`)
}

type ContactInput = {
  key: CrmEntityKey
  id: number
  name: string | null
  mobile: string | null
  notes?: string | null
  tierGroup?: CrmContact['tierGroup']
}

function makeContact(
  input: ContactInput,
  counts: Map<string, number>,
): CrmContact {
  return {
    id: input.id,
    entityType: resolveEntityType(input.key),
    name: input.name?.trim() || 'Unnamed contact',
    mobile: input.mobile ?? '',
    categoryLabel: CATEGORY_LABELS[input.key],
    ...(input.key === 'resource' ? { tierGroup: input.tierGroup } : {}),
    notes: input.notes ?? null,
    openTasksCount: counts.get(`${input.key}:${input.id}`) ?? 0,
    sourceRoute: SOURCE_ROUTES[input.key],
  } as CrmContact
}

export const crmService = {
  async getContacts(query: CrmQuery): Promise<CrmContact[]> {
    const rows = await findActiveContacts()
    const counts = countOpenTasks(rows.openTasks)

    const contacts: CrmContact[] = [
      ...rows.enquiries.map((row) =>
        makeContact(
          {
            key: 'enquiry',
            id: row.id,
            name: row.customerName,
            mobile: row.mobile,
            notes: row.requirementsNotes,
          },
          counts,
        ),
      ),
      ...rows.resources.map((row) =>
        makeContact(
          {
            key: 'resource',
            id: row.id,
            name: row.name,
            mobile: row.mobile,
            notes: row.productNotes,
            tierGroup: row.tierGroup as CrmContact['tierGroup'],
          },
          counts,
        ),
      ),
      ...rows.customers.map((row) =>
        makeContact(
          {
            key: 'customer',
            id: row.id,
            name: row.name,
            mobile: row.mobile,
            notes: row.address,
          },
          counts,
        ),
      ),
      ...rows.suppliers.map((row) =>
        makeContact(
          {
            key: 'supplier',
            id: row.id,
            name: row.name,
            mobile: row.mobile,
            notes: row.address,
          },
          counts,
        ),
      ),
      ...rows.brokers.map((row) =>
        makeContact(
          {
            key: 'broker',
            id: row.id,
            name: row.name,
            mobile: row.mobile,
            notes: row.address,
          },
          counts,
        ),
      ),
      ...rows.transportProviders.map((row) =>
        makeContact(
          {
            key: 'transport',
            id: row.id,
            name: row.name,
            mobile: row.mobile,
            notes: [row.vehicleNumber, row.address].filter(Boolean).join(' · ') || null,
          },
          counts,
        ),
      ),
    ]

    const search = query.search?.trim().toLowerCase()
    return contacts.filter((contact) => {
      if (query.entityType && contact.entityType !== query.entityType) return false
      if (query.tierGroup && contact.tierGroup !== query.tierGroup) return false
      if (!search) return true
      return (
        contact.name.toLowerCase().includes(search) ||
        (contact.mobile ?? '').toLowerCase().includes(search)
      )
    })
  },
}
