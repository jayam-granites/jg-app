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
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '../hooks/use-suppliers'
import { safeParse } from 'valibot'
import { CreateSupplierSchema } from '@jg-app/validators'
import { cn } from '@/lib/utils'

type SupplierRow = {
  id: number
  name: string
  mobile: string | null
  address: string | null
  gstNumber: string | null
  isActive: boolean
}

export function SuppliersPage() {
  const { data: suppliersRes, isLoading } = useSuppliers()
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const suppliers = suppliersRes?.data ?? []

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SupplierRow | null>(null)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [address, setAddress] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const tableData: SupplierRow[] = useMemo(() => {
    return suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      mobile: s.mobile,
      address: s.address,
      gstNumber: s.gstNumber,
      isActive: s.isActive,
    }))
  }, [suppliers])

  const rowActions: DataTableRowAction<SupplierRow>[] = useMemo(
    () => [
      {
        label: 'Edit',
        onClick: (item) => {
          setEditingItem(item)
          setName(item.name)
          setMobile(item.mobile ?? '')
          setAddress(item.address ?? '')
          setGstNumber(item.gstNumber ?? '')
          setIsActive(item.isActive)
          setErrors({})
          setServerError(null)
          setIsOpen(true)
        },
      },
    ],
    [],
  )

  const columns: ColumnDef<SupplierRow>[] = useMemo(
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
        accessorKey: 'gstNumber',
        header: 'GST',
        cell: ({ getValue }) => {
          const val = getValue() as string | null
          return <span className="font-mono text-sm">{val ?? '-'}</span>
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
      setGstNumber('')
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

    const result = safeParse(CreateSupplierSchema, {
      name: name.trim(),
      mobile: mobile.trim() || undefined,
      address: address.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
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
      gstNumber: gstNumber.trim() || undefined,
      isActive,
    }

    if (isEditing) {
      updateSupplier.mutate(
        { id: editingItem.id, data },
        {
          onSuccess: () => handleOpenChange(false),
          onError: (err: any) => setServerError(err.message || 'Something went wrong. Please try again.'),
        },
      )
    } else {
      createSupplier.mutate(
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
      title="Suppliers"
      description="Manage suppliers for purchase orders"
      action={
        <Button onClick={() => setIsOpen(true)} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Create Supplier
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'name', placeholder: 'Search suppliers...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No suppliers found',
          description: 'Adjust your search or add a new supplier',
        }}
      />

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col h-full justify-between">
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold">{isEditing ? 'Edit Supplier' : 'Create Supplier'}</SheetTitle>
            </SheetHeader>

            {serverError && (
              <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="supplier-name" className="text-sm font-semibold">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="supplier-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Supplier name"
                  className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-mobile" className="text-sm font-semibold">Mobile</Label>
                <Input
                  id="supplier-mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Mobile number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-address" className="text-sm font-semibold">Address</Label>
                <Input
                  id="supplier-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-gst" className="text-sm font-semibold">GST Number</Label>
                <Input
                  id="supplier-gst"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="GST Number"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="supplier-status"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="supplier-status" className="font-normal">Active</Label>
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
              disabled={createSupplier.isPending || updateSupplier.isPending}
              className="flex-1 font-semibold"
            >
              {createSupplier.isPending || updateSupplier.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Supplier'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
