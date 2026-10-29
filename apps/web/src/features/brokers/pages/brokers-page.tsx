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
import { useBrokers, useCreateBroker, useUpdateBroker } from '../hooks/use-brokers'
import { safeParse } from 'valibot'
import { CreateBrokerSchema } from '@jg-app/validators'
import { cn } from '@/lib/utils'

type BrokerRow = {
  id: number
  name: string
  mobile: string | null
  address: string | null
  commissionPercent: number | null
  isActive: boolean
}

export function BrokersPage() {
  const { data: brokersRes, isLoading } = useBrokers()
  const createBroker = useCreateBroker()
  const updateBroker = useUpdateBroker()

  const brokers = brokersRes?.data ?? []

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BrokerRow | null>(null)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [address, setAddress] = useState('')
  const [commissionPercent, setCommissionPercent] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const tableData: BrokerRow[] = useMemo(() => {
    return brokers.map((b) => ({
      id: b.id,
      name: b.name,
      mobile: b.mobile,
      address: b.address,
      commissionPercent: b.commissionPercent,
      isActive: b.isActive,
    }))
  }, [brokers])

  const rowActions: DataTableRowAction<BrokerRow>[] = useMemo(
    () => [
      {
        label: 'Edit',
        onClick: (item) => {
          setEditingItem(item)
          setName(item.name)
          setMobile(item.mobile ?? '')
          setAddress(item.address ?? '')
          setCommissionPercent(item.commissionPercent != null ? String(item.commissionPercent) : '')
          setIsActive(item.isActive)
          setErrors({})
          setServerError(null)
          setIsOpen(true)
        },
      },
    ],
    [],
  )

  const columns: ColumnDef<BrokerRow>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'mobile',
        header: 'Mobile',
        cell: ({ getValue }) => {
          const val = getValue() as string | null
          return <span className="text-sm">{val ?? '-'}</span>
        },
      },
      {
        accessorKey: 'commissionPercent',
        header: 'Commission %',
        cell: ({ getValue }) => {
          const val = getValue() as number | null
          return <span className="text-sm">{val != null ? `${val}%` : '-'}</span>
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
      setName('')
      setMobile('')
      setAddress('')
      setCommissionPercent('')
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

    const result = safeParse(CreateBrokerSchema, {
      name: name.trim(),
      mobile: mobile.trim() || undefined,
      address: address.trim() || undefined,
      commissionPercent: commissionPercent ? Number(commissionPercent) : undefined,
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
      name: name.trim(),
      mobile: mobile.trim() || undefined,
      address: address.trim() || undefined,
      commissionPercent: commissionPercent ? Number(commissionPercent) : undefined,
      isActive,
    }

    if (isEditing) {
      updateBroker.mutate(
        { id: editingItem.id, data },
        {
          onSuccess: () => handleOpenChange(false),
          onError: (err: any) => setServerError(err.message || 'Something went wrong. Please try again.'),
        },
      )
    } else {
      createBroker.mutate(
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
      title="Brokers"
      description="Manage brokers for sales commissions"
      action={
        <Button onClick={() => setIsOpen(true)} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Create Broker
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'name', placeholder: 'Search brokers...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No brokers found',
          description: 'Adjust your search or add a new broker',
        }}
      />

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col h-full justify-between">
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold">{isEditing ? 'Edit Broker' : 'Create Broker'}</SheetTitle>
            </SheetHeader>

            {serverError && (
              <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="broker-name" className="text-sm font-semibold">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="broker-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Broker name"
                  className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="broker-mobile" className="text-sm font-semibold">Mobile</Label>
                <Input
                  id="broker-mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Mobile number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="broker-address" className="text-sm font-semibold">Address</Label>
                <Input
                  id="broker-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="broker-commission" className="text-sm font-semibold">Commission %</Label>
                <Input
                  id="broker-commission"
                  type="number"
                  step="0.01"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="broker-status"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="broker-status" className="font-normal">Active</Label>
              </div>
            </form>
          </div>

          <div className="flex gap-3 pt-6 border-t mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={createBroker.isPending || updateBroker.isPending}
              className="flex-1 font-semibold"
            >
              {createBroker.isPending || updateBroker.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Broker'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
