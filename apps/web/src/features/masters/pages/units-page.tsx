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
import { useUnits, useCreateUnit, useUpdateUnit } from '../hooks/use-masters'
import { safeParse } from 'valibot'
import { CreateUnitSchema } from '@jg-app/validators'
import { cn } from '@/lib/utils'

type UnitRow = {
  id: number
  code: string
  name: string
  isActive: boolean
}

export function UnitsPage() {
  const { data: unitsRes, isLoading } = useUnits()
  const createUnit = useCreateUnit()
  const updateUnit = useUpdateUnit()

  const units = unitsRes?.data ?? []

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<UnitRow | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const tableData: UnitRow[] = useMemo(() => {
    return units.map((u) => ({ id: u.id, code: u.code, name: u.name, isActive: u.isActive }))
  }, [units])

  const rowActions: DataTableRowAction<UnitRow>[] = useMemo(
    () => [
      {
        label: 'Edit',
        onClick: (item) => {
          setEditingItem(item)
          setCode(item.code)
          setName(item.name)
          setIsActive(item.isActive)
          setErrors({})
          setServerError(null)
          setIsOpen(true)
        },
      },
    ],
    [],
  )

  const columns: ColumnDef<UnitRow>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm font-medium">{getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
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
      setCode('')
      setName('')
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

    const result = safeParse(CreateUnitSchema, {
      code: code.trim(),
      name: name.trim(),
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

    const data = { code: code.trim(), name: name.trim(), isActive }

    if (isEditing) {
      updateUnit.mutate(
        { id: editingItem.id, data },
        {
          onSuccess: () => handleOpenChange(false),
          onError: (err: any) => setServerError(err.message || 'Something went wrong. Please try again.'),
        },
      )
    } else {
      createUnit.mutate(
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
      title="Units"
      description="Manage units of measurement for products and inventory"
      action={
        <Button onClick={() => setIsOpen(true)} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Create Unit
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'name', placeholder: 'Search units...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No units found',
          description: 'Adjust your search or add a new unit',
        }}
      />

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col h-full justify-between">
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold">{isEditing ? 'Edit Unit' : 'Create Unit'}</SheetTitle>
            </SheetHeader>

            {serverError && (
              <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="unit-code" className="text-sm font-semibold">
                  Unit Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="unit-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SQFT"
                  maxLength={10}
                  className={cn(
                    'font-mono uppercase',
                    errors.code && 'border-destructive focus-visible:ring-destructive',
                  )}
                />
                {errors.code && (
                  <p className="text-xs font-semibold text-destructive">{errors.code}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit-name" className="text-sm font-semibold">
                  Unit Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="unit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Square Feet"
                  className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="unit-status"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="unit-status" className="font-normal">Active</Label>
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
              disabled={createUnit.isPending || updateUnit.isPending}
              className="flex-1 font-semibold"
            >
              {createUnit.isPending || updateUnit.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Unit'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
