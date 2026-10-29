import { useMemo, useState } from 'react'
import { CalendarRange, CheckCircle2, Loader2, Plus, Trash2, X } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { DatePicker } from '@/shared/components/date-picker'
import { PageLayout } from '@/shared/components/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../hooks/use-expenses'
import { useCategories, useCreateCategory } from '@/features/masters/hooks/use-masters'
import { useLookupOptions } from '@/features/masters/hooks/use-lookups'
import { useExpenseSchedules } from '@/features/expense-schedules/hooks/use-expense-schedules'
import { LOOKUP_GROUPS } from '@jg-app/shared'
import { safeParse } from 'valibot'
import { CreateExpenseSchema } from '@jg-app/validators'
import { cn } from '@/lib/utils'
import { formatDate, formatMonth } from '@/lib/date'
import dayjs from '@/lib/dayjs'
import { api } from '@/lib/api'

type DatePeriod = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

type ExpenseRow = {
  id: number
  expenseNumber: string
  expenseDate: string
  categoryName: string
  amount: number
  paymentMode: string | null
  remarks: string | null
  isPaid: boolean
  isActive: boolean
}

export function ExpensesPage() {
  const { data: expensesRes, isLoading } = useExpenses()
  const { data: categoriesRes } = useCategories('EXPENSE')
  const { data: schedulesRes } = useExpenseSchedules()
  const { data: paymentModeOptionsRes } = useLookupOptions(LOOKUP_GROUPS.PAYMENT_MODE)
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()
  const createCategory = useCreateCategory()

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.accounts.$get()
      return res.json()
    },
  })

  const expenses = expensesRes?.data ?? []
  const categories = categoriesRes?.data ?? []
  const schedules = schedulesRes?.data ?? []
  const paymentModes = paymentModeOptionsRes?.data?.[LOOKUP_GROUPS.PAYMENT_MODE] ?? []

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ExpenseRow | null>(null)
  const [expenseDate, setExpenseDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [expenseScheduleId, setExpenseScheduleId] = useState('')
  const [amount, setAmount] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paymentMode, setPaymentMode] = useState('')
  const [accountId, setAccountId] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [period, setPeriod] = useState<DatePeriod>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const tableData: ExpenseRow[] = useMemo(() => {
    return expenses
      .map((e) => ({
        id: e.id,
        expenseNumber: e.expenseNumber,
        expenseDate: e.expenseDate,
        categoryName: e.category.name,
        amount: Number(e.amount),
        paymentMode: e.paymentMode,
        remarks: e.remarks ?? null,
        isPaid: e.isPaid,
        isActive: e.isActive,
      }))
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
  }, [expenses])

  const periodRange = useMemo(() => {
    if (period === 'all') return null

    const now = dayjs()

    if (period === 'daily') {
      return { start: now.startOf('day'), end: now.endOf('day') }
    }

    if (period === 'weekly') {
      const start = now.startOf('day').subtract((now.day() + 6) % 7, 'day')
      return { start, end: start.add(6, 'day').endOf('day') }
    }

    if (period === 'monthly') {
      return { start: now.startOf('month'), end: now.endOf('month') }
    }

    if (period === 'yearly') {
      return { start: now.startOf('year'), end: now.endOf('year') }
    }

    if (!customFrom && !customTo) return null

    return {
      start: customFrom ? dayjs(customFrom).startOf('day') : undefined,
      end: customTo ? dayjs(customTo).endOf('day') : undefined,
    }
  }, [period, customFrom, customTo])

  const filteredTableData = useMemo(() => {
    if (!periodRange) return tableData

    return tableData.filter((row) => {
      const date = dayjs(row.expenseDate)
      if (!date.isValid()) return true
      if (periodRange.start && date.isBefore(periodRange.start)) return false
      if (periodRange.end && date.isAfter(periodRange.end)) return false
      return true
    })
  }, [tableData, periodRange])

  const resetPeriod = () => {
    setPeriod('all')
    setCustomFrom('')
    setCustomTo('')
  }

  const openExpense = (item: ExpenseRow) => {
    const expense = expenses.find((e) => e.id === item.id)
    if (!expense) return
    setEditingItem(item)
    setExpenseDate(expense.expenseDate.slice(0, 10))
    setCategoryId(String(expense.categoryId))
    setExpenseScheduleId(expense.expenseScheduleId != null ? String(expense.expenseScheduleId) : '')
    setAmount(String(Number(expense.amount)))
    setFromDate(expense.fromDate ? expense.fromDate.slice(0, 10) : '')
    setToDate(expense.toDate ? expense.toDate.slice(0, 10) : '')
    setPaymentMode(expense.paymentMode ?? '')
    setAccountId(expense.accountId != null ? String(expense.accountId) : '')
    setReferenceNumber(expense.referenceNumber ?? '')
    setRemarks(expense.remarks ?? '')
    setIsActive(item.isActive)
    setIsAddingCategory(false)
    setNewCategoryName('')
    setErrors({})
    setServerError(null)
    setIsOpen(true)
  }

  const rowActions: DataTableRowAction<ExpenseRow>[] = useMemo(
    () => [
      {
        label: (item) => (item.isPaid ? 'Mark as Unpaid' : 'Mark as Paid'),
        icon: CheckCircle2,
        onClick: (item) => {
          updateExpense.mutate(
            {
              id: item.id,
              data: item.isPaid
                ? { isPaid: false, paidDate: null }
                : { isPaid: true, paidDate: new Date().toISOString() },
            },
            {
              onError: (err: any) => alert(err?.message || 'Failed to update payment status'),
            },
          )
        },
      },
      {
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        onClick: (item) => {
          if (!confirm('Delete this expense?')) return
          deleteExpense.mutate(item.id, {
            onError: (err: any) => alert(err?.message || 'Failed to delete expense'),
          })
        },
      },
    ],
    [updateExpense, deleteExpense],
  )

  const columns: ColumnDef<ExpenseRow>[] = useMemo(
    () => [
      {
        accessorKey: 'expenseNumber',
        header: 'Expense #',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm font-medium">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'expenseDate',
        header: 'Date',
        cell: ({ getValue }) => {
          const val = getValue() as string
          return <span className="text-sm">{formatDate(val)}</span>
        },
      },
      {
        accessorKey: 'categoryName',
        header: 'Category',
        cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => {
          const val = getValue() as number
          return <span className="text-sm font-mono font-medium">₹{val.toFixed(2)}</span>
        },
      },
      {
        accessorKey: 'paymentMode',
        header: 'Payment Mode',
        cell: ({ getValue }) => {
          const val = getValue() as string | null
          return <span className="text-sm">{val ?? '-'}</span>
        },
      },
      {
        accessorKey: 'isPaid',
        header: 'Paid',
        cell: ({ getValue }) => {
          const paid = getValue() as boolean
          return (
            <Badge
              variant={paid ? 'default' : 'outline'}
              className={cn(
                'rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium',
                paid
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-100',
              )}
            >
              {paid ? 'Paid' : 'Unpaid'}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'remarks',
        header: 'Remarks',
        cell: ({ getValue }) => {
          const val = getValue() as string | null
          return <span className="text-sm text-muted-foreground">{val ?? '-'}</span>
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ getValue }) => {
          const active = getValue() as boolean
          return (
            <Badge
              variant={active ? 'default' : 'secondary'}
              className="rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium"
            >
              {active ? 'Active' : 'Inactive'}
            </Badge>
          )
        },
        filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: () => null,
      },
    ],
    [],
  )

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setEditingItem(null)
      setExpenseDate('')
      setCategoryId('')
      setExpenseScheduleId('')
      setAmount('')
      setFromDate('')
    setToDate('')
    setPaymentMode('')
    setAccountId('')
    setReferenceNumber('')
    setRemarks('')
    setIsActive(true)
    setIsAddingCategory(false)
    setNewCategoryName('')
    setErrors({})
    setServerError(null)
  }
  }

  const isEditing = !!editingItem

  const handleCategoryChange = (value: string) => {
    if (value === '__add__') {
      setIsAddingCategory(true)
      return
    }
    setCategoryId(value)
  }

  const saveNewCategory = async () => {
    const name = newCategoryName.trim()
    if (name.length < 2) {
      alert('Category name must be at least 2 characters')
      return
    }

    try {
      const result: any = await createCategory.mutateAsync({
        name,
        type: 'EXPENSE',
        isActive: true,
      })
      const newId = result?.data?.id
      if (newId) setCategoryId(String(newId))
      setNewCategoryName('')
      setIsAddingCategory(false)
    } catch (error: any) {
      alert(error?.message || 'Failed to create category')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setServerError(null)

    const result = safeParse(CreateExpenseSchema, {
      expenseDate,
      categoryId: Number(categoryId),
      expenseScheduleId: expenseScheduleId ? Number(expenseScheduleId) : undefined,
      amount: Number(amount),
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      paymentMode: paymentMode.trim() || undefined,
      accountId: accountId ? Number(accountId) : undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      remarks: remarks.trim() || undefined,
      isActive,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.issues) {
        const path = issue.path?.[0]?.key
        if (typeof path === 'string') {
          fieldErrors[path] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    const data = {
      expenseDate,
      categoryId: Number(categoryId),
      expenseScheduleId: expenseScheduleId ? Number(expenseScheduleId) : undefined,
      amount: Number(amount),
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      paymentMode: paymentMode.trim() || undefined,
      accountId: accountId ? Number(accountId) : undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      remarks: remarks.trim() || undefined,
      isActive,
    }

    if (isEditing) {
      updateExpense.mutate(
        { id: editingItem.id, data },
        {
          onSuccess: () => handleOpenChange(false),
          onError: (err: any) => setServerError(err.message || 'Something went wrong. Please try again.'),
        },
      )
    } else {
      createExpense.mutate(
        data,
        {
          onSuccess: () => handleOpenChange(false),
          onError: (err: any) => setServerError(err.message || 'Something went wrong. Please try again.'),
        },
      )
    }
  }

  return (
    <PageLayout
      title="Expenses"
      description="Manage business expenses"
      action={
        <Button onClick={() => setIsOpen(true)} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Create Expense
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={filteredTableData}
        searchKey={{ id: 'expenseNumber', placeholder: 'Search expenses...' }}
        groupByKey={(row) =>
          formatMonth(row.expenseDate)
        }
        rowActions={rowActions}
        onRowClick={openExpense}
        isLoading={isLoading}
        toolbarChildren={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={(value) => setPeriod(value as DatePeriod)}>
              <SelectTrigger className="h-9 w-[150px] gap-2 rounded-lg text-xs font-medium">
                <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <>
                <DatePicker
                  value={customFrom}
                  onChange={setCustomFrom}
                  placeholder="From date"
                  className="h-9 w-[150px]"
                />
                <DatePicker
                  value={customTo}
                  onChange={setCustomTo}
                  placeholder="To date"
                  className="h-9 w-[150px]"
                />
              </>
            )}
            {period !== 'all' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetPeriod}
                className="h-9 text-xs text-muted-foreground"
              >
                Clear
                <X className="ml-1 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        }
        emptyState={{
          title: 'No expenses found',
          description: 'Adjust your search or add a new expense',
        }}
      />

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col h-full justify-between overflow-y-auto">
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold">{isEditing ? 'Edit Expense' : 'Create Expense'}</SheetTitle>
            </SheetHeader>

            {serverError && (
              <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="expense-date" className="text-sm font-semibold">
                  Expense Date <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  id="expense-date"
                  value={expenseDate}
                  onChange={setExpenseDate}
                  placeholder="Select expense date"
                  className={cn(errors.expenseDate && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.expenseDate && <p className="text-xs font-semibold text-destructive">{errors.expenseDate}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-category" className="text-sm font-semibold">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={categoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger className={cn(errors.categoryId && 'border-destructive')}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__add__">
                      <span className="flex items-center gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add new category
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {isAddingCategory && (
                  <div className="mt-2 space-y-2 rounded-lg border bg-muted/20 p-3">
                    <Label className="text-[11px]">New Expense Category</Label>
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingCategory(false)
                          setNewCategoryName('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={saveNewCategory}
                        disabled={createCategory.isPending}
                      >
                        {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Category'}
                      </Button>
                    </div>
                  </div>
                )}
                {errors.categoryId && <p className="text-xs font-semibold text-destructive">{errors.categoryId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-amount" className="text-sm font-semibold">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={cn(errors.amount && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.amount && <p className="text-xs font-semibold text-destructive">{errors.amount}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-schedule" className="text-sm font-semibold">Schedule</Label>
                <Select value={expenseScheduleId} onValueChange={setExpenseScheduleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (one-time expense)" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expense-from" className="text-sm font-semibold">From Date</Label>
                  <Input id="expense-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-to" className="text-sm font-semibold">To Date</Label>
                  <Input id="expense-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-payment">Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger id="expense-payment">
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((option) => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-account">Pay From Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger id="expense-account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {(accounts || []).map((acc: any) => (
                      <SelectItem key={acc.id} value={String(acc.id)}>
                        {acc.name} ({acc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-reference" className="text-sm font-semibold">Reference Number</Label>
                <Input
                  id="expense-reference"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Cheque/Transaction ref"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-remarks" className="text-sm font-semibold">Remarks</Label>
                <Input
                  id="expense-remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="expense-status"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="expense-status" className="font-normal">Active</Label>
              </div>
            </form>
          </div>

          <div className="flex gap-3 pt-6 border-t mt-auto">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={createExpense.isPending || updateExpense.isPending}
              className="flex-1 font-semibold"
            >
              {createExpense.isPending || updateExpense.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                'Save Expense'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
