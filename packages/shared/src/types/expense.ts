export type Expense = {
  id: number
  expenseNumber: string
  expenseDate: string
  categoryId: number
  category?: { id: number; name: string }
  expenseScheduleId: number | null
  purchaseReceiptId: number | null
  amount: number
  fromDate: string | null
  toDate: string | null
  remarks: string | null
  paymentMode: string | null
  referenceNumber: string | null
  isPurchaseExpense: boolean
  isPaid: boolean
  paidDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}
