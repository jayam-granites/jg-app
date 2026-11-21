import { Prisma } from '@prisma/client'

export const EXPENSE_NUMBER_PREFIX = 'EXP'

export function financialYearCode(date: Date): string {
  const startYear = date.getUTCMonth() >= 3 ? date.getUTCFullYear() : date.getUTCFullYear() - 1
  const endYear = startYear + 1
  return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`
}

export function expenseNumberPrefix(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${EXPENSE_NUMBER_PREFIX}/${financialYearCode(date)}/${month}/`
}

export function formatExpenseNumber(date: Date, sequence: number): string {
  return `${expenseNumberPrefix(date)}${String(sequence).padStart(5, '0')}`
}

export function sequenceFromExpenseNumber(expenseNumber: string, prefix: string): number {
  if (!expenseNumber.startsWith(prefix)) return 0
  const value = Number(expenseNumber.slice(prefix.length))
  return Number.isInteger(value) && value > 0 ? value : 0
}

export async function allocateNextExpenseNumber(
  tx: Prisma.TransactionClient,
  expenseDate: Date,
): Promise<string> {
  const prefix = expenseNumberPrefix(expenseDate)
  // Advisory locks return void, which $queryRaw cannot deserialize. Use $executeRaw.
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`)

  const expenseNumbers = await tx.expense.findMany({
    where: { expenseNumber: { startsWith: prefix } },
    select: { expenseNumber: true },
  })
  const lastSequence = expenseNumbers.reduce(
    (max, expense) => Math.max(max, sequenceFromExpenseNumber(expense.expenseNumber, prefix)),
    0,
  )

  return formatExpenseNumber(expenseDate, lastSequence + 1)
}
