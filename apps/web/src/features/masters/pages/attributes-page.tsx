import { useMemo, useState, useEffect } from 'react'
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
import { TagInput } from '@/components/ui/tag-input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAttributes, useCreateAttribute, useUpdateAttribute, useAttributeValues } from '../hooks/use-masters'
import { safeParse } from 'valibot'
import { CreateAttributeSchema } from '@jg-app/validators'
import { cn } from '@/lib/utils'

type AttributeRow = {
  id: number
  code: string
  name: string
  valuesCount: number
  isActive: boolean
}

export function AttributesPage() {
  const { data: attributesRes, isLoading } = useAttributes()
  const createAttribute = useCreateAttribute()
  const updateAttribute = useUpdateAttribute()

  const attributes = attributesRes?.data ?? []

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AttributeRow | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [values, setValues] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const editId = editingItem?.id ?? null
  const { data: existingValuesRes } = useAttributeValues(editId)

  useEffect(() => {
    if (editId && existingValuesRes?.data) {
      const existing = (existingValuesRes as any).data.map((v: any) => v.value)
      const merged = [...new Set([...existing])]
      setValues(merged)
    }
  }, [editId, existingValuesRes])

  const tableData: AttributeRow[] = useMemo(() => {
    return attributes.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      valuesCount: a._count.values,
      isActive: a.isActive,
    }))
  }, [attributes])

  const rowActions: DataTableRowAction<AttributeRow>[] = useMemo(
    () => [
      {
        label: 'Edit',
        onClick: (item) => {
          setEditingItem(item)
          setCode(item.code)
          setName(item.name)
          setValues([])
          setIsActive(item.isActive)
          setErrors({})
          setServerError(null)
          setIsOpen(true)
        },
      },
    ],
    [],
  )

  const columns: ColumnDef<AttributeRow>[] = useMemo(
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
        accessorKey: 'valuesCount',
        header: 'Values',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{getValue() as number}</span>
        ),
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
      setValues([])
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

    const filteredValues = values.map((v) => v.trim()).filter(Boolean)

    const result = safeParse(CreateAttributeSchema, {
      code: code.trim(),
      name: name.trim(),
      values: filteredValues.length ? filteredValues : undefined,
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

    const data = { code: code.trim(), name: name.trim(), values: filteredValues.length ? filteredValues : undefined, isActive }

    if (isEditing) {
      updateAttribute.mutate(
        { id: editingItem.id, data },
        {
          onSuccess: () => handleOpenChange(false),
          onError: (err: any) => setServerError(err.message || 'Something went wrong. Please try again.'),
        },
      )
    } else {
      createAttribute.mutate(
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
      title="Attributes"
      description="Define product attributes like thickness, finish, and size for variant management"
      action={
        <Button onClick={() => setIsOpen(true)} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Create Attribute
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'name', placeholder: 'Search attributes...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No attributes found',
          description: 'Adjust your search or add a new attribute',
        }}
      />

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col h-full justify-between">
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold">{isEditing ? 'Edit Attribute' : 'Create Attribute'}</SheetTitle>
            </SheetHeader>

            {serverError && (
              <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="attr-code" className="text-sm font-semibold">
                  Attribute Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="attr-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. COLOR"
                  maxLength={20}
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
                <Label htmlFor="attr-name" className="text-sm font-semibold">
                  Attribute Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="attr-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Color"
                  className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Attribute Values</Label>
                <TagInput
                  value={values}
                  onChange={setValues}
                  placeholder="Type value and press Enter..."
                />
                <p className="text-xs text-muted-foreground">
                  Press Enter or comma to add a value. Click X to remove.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="attr-status"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="attr-status" className="font-normal">Active</Label>
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
              disabled={createAttribute.isPending || updateAttribute.isPending}
              className="flex-1 font-semibold"
            >
              {createAttribute.isPending || updateAttribute.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Attribute'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
