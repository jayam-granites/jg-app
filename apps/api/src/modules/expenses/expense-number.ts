export const EXPENSE_NUMBER_PREFIX = 'EXP'

export function financialYearCode(date: Date): string {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1
  const endYear = startYear + 1
  return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`
}

export function expenseNumberPrefix(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
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
