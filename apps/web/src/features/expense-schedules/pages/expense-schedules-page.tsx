import { useMemo, useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useExpenseSchedules, useCreateExpenseSchedule, useUpdateExpenseSchedule } from '../hooks/use-expense-schedules'
import { useCategories } from '@/features/masters/hooks/use-masters'
import { useLookupOptions } from '@/features/masters/hooks/use-lookups'
import { LOOKUP_GROUPS } from '@jg-app/shared'
import { safeParse } from 'valibot'
import { CreateExpenseScheduleSchema } from '@jg-app/validators'
import { cn } from '@/lib/utils'

type ScheduleRow = {
  id: number
  title: string
  categoryName: string
  frequency: string
  amount: number | null
  startDate: string
  isActive: boolean
}

export function ExpenseSchedulesPage() {
  const { data: schedulesRes, isLoading } = useExpenseSchedules()
  const { data: categoriesRes } = useCategories('EXPENSE')
  const { data: frequencyOptionsRes } = useLookupOptions(LOOKUP_GROUPS.EXPENSE_FREQUENCY)
  const createSchedule = useCreateExpenseSchedule()
  const updateSchedule = useUpdateExpenseSchedule()

  const schedules = schedulesRes?.data ?? []
  const categories = categoriesRes?.data ?? []
  const frequencyOptions = frequencyOptionsRes?.data?.[LOOKUP_GROUPS.EXPENSE_FREQUENCY] ?? []
  const frequencyLabels = useMemo(() => {
    return Object.fromEntries(frequencyOptions.map((o) => [o.value, o.label]))
  }, [frequencyOptions])

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduleRow | null>(null)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState('ONE_TIME')
  const [amount, setAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [intervalDays, setIntervalDays] = useState('')
  const [remarks, setRemarks] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const tableData: ScheduleRow[] = useMemo(() => {
    return schedules.map((s) => ({
      id: s.id,
      title: s.title,
      categoryName: s.category.name,
      frequency: s.frequency,
      amount: s.amount ? Number(s.amount) : null,
      startDate: s.startDate,
      isActive: s.isActive,
    }))
  }, [schedules])

  const rowActions: DataTableRowAction<ScheduleRow>[] = useMemo(
    () => [
      {
        label: 'Edit',
        onClick: (item) => {
          const schedule = schedules.find((s) => s.id === item.id)
          setEditingItem(item)
          setTitle(item.title)
          setCategoryId(String(schedule?.categoryId ?? ''))
          setFrequency(item.frequency)
          setAmount(item.amount != null ? String(item.amount) : '')
          setStartDate(item.startDate ? item.startDate.slice(0, 10) : '')
          setEndDate(schedule?.endDate ? schedule.endDate.slice(0, 10) : '')
          setIntervalDays(schedule?.intervalDays != null ? String(schedule.intervalDays) : '')
          setRemarks(schedule?.remarks ?? '')
          setIsActive(item.isActive)
          setErrors({})
          setServerError(null)
          setIsOpen(true)
        },
      },
    ],
    [schedules],
  )

  const columns: ColumnDef<ScheduleRow>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'categoryName',
        header: 'Category',
        cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
      },
      {
        accessorKey: 'frequency',
        header: 'Frequency',
        cell: ({ getValue }) => {
          const val = getValue() as string
          return <span className="text-sm">{frequencyLabels[val] ?? val}</span>
        },
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => {
          const val = getValue() as number | null
          return <span className="text-sm font-mono">{val != null ? `₹${val.toFixed(2)}` : '-'}</span>
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
    ],
    [],
  )

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setEditingItem(null)
      setTitle('')
      setCategoryId('')
      setFrequency('ONE_TIME')
      setAmount('')
      setStartDate('')
      setEndDate('')
      setIntervalDays('')
      setRemarks('')
      setIsActive(true)
      setErrors({})
      setServerError(null)
    }
  }

  const isEditing = !!editingItem

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setServerError(null)

    const result = safeParse(CreateExpenseScheduleSchema, {
      title: title.trim(),
      categoryId: Number(categoryId),
      frequency,
      amount: amount ? Number(amount) : undefined,
      startDate,
      endDate: endDate || undefined,
      intervalDays: intervalDays ? Number(intervalDays) : undefined,
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
      title: title.trim(),
      categoryId: Number(categoryId),
      frequency: frequency as any,
      amount: amount ? Number(amount) : undefined,
      startDate,
      endDate: endDate || undefined,
      intervalDays: intervalDays ? Number(intervalDays) : undefined,
      remarks: remarks.trim() || undefined,
      isActive,
    }

    if (isEditing) {
      updateSchedule.mutate(
        { id: editingItem.id, data },
        {
          onSuccess: () => handleOpenChange(false),
          onError: (err: any) => setServerError(err.message || 'Something went wrong. Please try again.'),
        },
      )
    } else {
      createSchedule.mutate(
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
      title="Expense Schedules"
      description="Manage recurring expense schedules"
      action={
        <Button onClick={() => setIsOpen(true)} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Create Schedule
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'title', placeholder: 'Search schedules...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No schedules found',
          description: 'Adjust your search or add a new schedule',
        }}
      />

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col h-full justify-between overflow-y-auto">
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold">{isEditing ? 'Edit Schedule' : 'Create Schedule'}</SheetTitle>
            </SheetHeader>

            {serverError && (
              <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="schedule-title" className="text-sm font-semibold">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="schedule-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Schedule title"
                  className={cn(errors.title && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.title && <p className="text-xs font-semibold text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-category" className="text-sm font-semibold">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className={cn(errors.categoryId && 'border-destructive')}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-xs font-semibold text-destructive">{errors.categoryId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-frequency" className="text-sm font-semibold">
                  Frequency <span className="text-destructive">*</span>
                </Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-amount" className="text-sm font-semibold">Amount</Label>
                <Input
                  id="schedule-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-start" className="text-sm font-semibold">
                  Start Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="schedule-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={cn(errors.startDate && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.startDate && <p className="text-xs font-semibold text-destructive">{errors.startDate}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-end" className="text-sm font-semibold">End Date</Label>
                <Input
                  id="schedule-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {frequency === 'CUSTOM' && (
                <div className="space-y-2">
                  <Label htmlFor="schedule-interval" className="text-sm font-semibold">Interval (Days)</Label>
                  <Input
                    id="schedule-interval"
                    type="number"
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                    placeholder="Number of days"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="schedule-remarks" className="text-sm font-semibold">Remarks</Label>
                <Input
                  id="schedule-remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Optional remarks"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="schedule-status"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="schedule-status" className="font-normal">Active</Label>
              </div>
            </form>
          </div>

          <div className="flex gap-3 pt-6 border-t mt-auto">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={createSchedule.isPending || updateSchedule.isPending}
              className="flex-1 font-semibold"
            >
              {createSchedule.isPending || updateSchedule.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                'Save Schedule'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
