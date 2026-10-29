import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const LOOKUP_OPTIONS: {
  group: string
  value: string
  label: string
  color?: string
  sortOrder: number
}[] = [
  // Category types
  { group: 'CATEGORY_TYPE', value: 'PRODUCT', label: 'Product', color: 'default', sortOrder: 10 },
  { group: 'CATEGORY_TYPE', value: 'EXPENSE', label: 'Expense', color: 'destructive', sortOrder: 20 },
  { group: 'CATEGORY_TYPE', value: 'SERVICE', label: 'Service', color: 'secondary', sortOrder: 30 },
  { group: 'CATEGORY_TYPE', value: 'PURCHASE', label: 'Purchase', color: 'secondary', sortOrder: 40 },

  // Expense frequencies
  { group: 'EXPENSE_FREQUENCY', value: 'ONE_TIME', label: 'One Time', sortOrder: 10 },
  { group: 'EXPENSE_FREQUENCY', value: 'DAILY', label: 'Daily', sortOrder: 20 },
  { group: 'EXPENSE_FREQUENCY', value: 'WEEKLY', label: 'Weekly', sortOrder: 30 },
  { group: 'EXPENSE_FREQUENCY', value: 'MONTHLY', label: 'Monthly', sortOrder: 40 },
  { group: 'EXPENSE_FREQUENCY', value: 'CUSTOM', label: 'Custom', sortOrder: 50 },

  // Payment modes
  { group: 'PAYMENT_MODE', value: 'Cash', label: 'Cash', sortOrder: 10 },
  { group: 'PAYMENT_MODE', value: 'Bank Transfer', label: 'Bank Transfer', sortOrder: 20 },
  { group: 'PAYMENT_MODE', value: 'UPI', label: 'UPI', sortOrder: 30 },
  { group: 'PAYMENT_MODE', value: 'Cheque', label: 'Cheque', sortOrder: 40 },
  { group: 'PAYMENT_MODE', value: 'Credit Card', label: 'Credit Card', sortOrder: 50 },
  { group: 'PAYMENT_MODE', value: 'Debit Card', label: 'Debit Card', sortOrder: 60 },
  { group: 'PAYMENT_MODE', value: 'Online Payment', label: 'Online Payment', sortOrder: 70 },

  // Item types
  { group: 'ITEM_TYPE', value: 'PRODUCT', label: 'Product', sortOrder: 10 },
  { group: 'ITEM_TYPE', value: 'SERVICE', label: 'Service', sortOrder: 20 },
  { group: 'ITEM_TYPE', value: 'CHARGE', label: 'Charge', sortOrder: 30 },

  // Invoice statuses
  { group: 'INVOICE_STATUS', value: 'DRAFT', label: 'Draft', color: 'yellow', sortOrder: 10 },
  { group: 'INVOICE_STATUS', value: 'PENDING', label: 'Pending', color: 'blue', sortOrder: 20 },
  { group: 'INVOICE_STATUS', value: 'PARTIAL_PAID', label: 'Partially Paid', color: 'orange', sortOrder: 30 },
  { group: 'INVOICE_STATUS', value: 'PAID', label: 'Paid', color: 'green', sortOrder: 40 },
  { group: 'INVOICE_STATUS', value: 'CANCELLED', label: 'Cancelled', color: 'red', sortOrder: 50 },

  // Purchase order statuses
  { group: 'PURCHASE_ORDER_STATUS', value: 'DRAFT', label: 'Draft', color: 'yellow', sortOrder: 10 },
  { group: 'PURCHASE_ORDER_STATUS', value: 'APPROVED', label: 'Approved', color: 'blue', sortOrder: 20 },
  { group: 'PURCHASE_ORDER_STATUS', value: 'PARTIAL_RECEIVED', label: 'Partially Received', color: 'orange', sortOrder: 30 },
  { group: 'PURCHASE_ORDER_STATUS', value: 'COMPLETED', label: 'Completed', color: 'green', sortOrder: 40 },
  { group: 'PURCHASE_ORDER_STATUS', value: 'CANCELLED', label: 'Cancelled', color: 'red', sortOrder: 50 },
]

const SETTINGS: { key: string; value: string }[] = [
  { key: 'invoice.gstPercent', value: '18' },
]

async function main() {
  await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: { name: 'Alice', email: 'alice@example.com' },
  })

  await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: { name: 'Bob', email: 'bob@example.com' },
  })

  const optionCount = await prisma.lookupOption.count()

  if (optionCount === 0) {
    await prisma.lookupOption.createMany({
      data: LOOKUP_OPTIONS.map((o) => ({
        group: o.group,
        value: o.value,
        label: o.label,
        color: o.color ?? null,
        sortOrder: o.sortOrder,
      })),
    })
    console.log(`Seeded lookup options: ${LOOKUP_OPTIONS.length}`)
  } else {
    console.log(`Lookup options already present, skipping (${optionCount} rows)`)
  }

  for (const setting of SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  }

  console.log('Seeded:', { users: ['alice@example.com', 'bob@example.com'], settings: SETTINGS.map((s) => s.key) })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())