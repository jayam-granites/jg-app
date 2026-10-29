import { useMemo, useRef, useState } from 'react'
import { Plus, Pencil, Loader2, Check } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableFilterableColumn } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCategories, useCreateCategory, useUpdateCategory, useCategoryAttributes, useLinkCategoryAttributes, useAttributes } from '../hooks/use-masters'
import { useLookupOptions, lookupOptionMap, optionColorClasses } from '../hooks/use-lookups'
import { LOOKUP_GROUPS } from '@jg-app/shared'
import { safeParse } from 'valibot'
import { CreateCategorySchema } from '@jg-app/validators'
import { cn } from '@/lib/utils'

type CategoryRow = {
  id: number
  name: string
  type: string
  parentName: string | null
  isActive: boolean
}

export function CategoriesPage() {
  const { data: categoriesRes, isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const { data: typeOptionsRes } = useLookupOptions(LOOKUP_GROUPS.CATEGORY_TYPE)

  const categories = categoriesRes?.data ?? []
  const categoryTypeOptions = typeOptionsRes?.data?.[LOOKUP_GROUPS.CATEGORY_TYPE] ?? []
  const typeOptionMap = useMemo(() => lookupOptionMap(categoryTypeOptions), [categoryTypeOptions])

  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CategoryRow | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<string>('PRODUCT')
  const [parentId, setParentId] = useState<string>('none')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const { data: attributesRes } = useAttributes()
  const allAttributes = attributesRes?.data ?? []
  const [selectedAttrIds, setSelectedAttrIds] = useState<number[]>([])

  const editingId = editingItem?.id ?? null
  const { data: linkedRes } = useCategoryAttributes(editingId)
  const linkedIds = linkedRes?.data?.map((a) => a.id) ?? []
  const linkMutation = useLinkCategoryAttributes()

  const prevEditingId = useRef<number | null>(null)
  if (editingId !== prevEditingId.current) {
    prevEditingId.current = editingId
    setSelectedAttrIds(editingId ? linkedIds : [])
  }

  function toggleAttribute(attrId: number) {
    setSelectedAttrIds((prev) =>
      prev.includes(attrId) ? prev.filter((id) => id !== attrId) : [...prev, attrId],
    )
  }

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c.name]))
  }, [categories])

  const tableData: CategoryRow[] = useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      parentName: cat.parentId ? categoryMap.get(cat.parentId) || null : null,
      isActive: cat.isActive,
    }))
  }, [categories, categoryMap])

  const parentOptions = useMemo(() => {
    return categories.filter((cat) => cat.type === type)
  }, [categories, type])

  const handleEdit = (item: CategoryRow) => {
    const original = categories.find((c) => c.id === item.id)
    setEditingItem(item)
    setName(item.name)
    setType(item.type)
    setParentId(original?.parentId ? String(original.parentId) : 'none')
    setIsActive(item.isActive)
    setErrors({})
    setServerError(null)
    setIsOpen(true)
  }

  const columns: ColumnDef<CategoryRow>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ getValue }) => {
          const val = getValue() as string
          const opt = typeOptionMap.get(val)
          return (
            <Badge
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${optionColorClasses(opt)}`}
            >
              {opt?.label ?? val}
            </Badge>
          )
        },
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'parentName',
        header: 'Parent',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{getValue() as string ?? '—'}</span>
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
      {
        id: 'action',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-muted-foreground/60 hover:text-foreground"
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ),
        size: 56,
      },
    ],
    [handleEdit, typeOptionMap],
  )

  const filterableColumns: DataTableFilterableColumn<CategoryRow>[] = useMemo(
    () => [
      {
        id: 'type',
        title: 'Type',
        options: categoryTypeOptions.map((o) => ({ label: o.label, value: o.value })),
      },
    ],
    [categoryTypeOptions],
  )

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setEditingItem(null)
      setName('')
      setType('PRODUCT')
      setParentId('none')
      setIsActive(true)
      setSelectedAttrIds([])
      setErrors({})
      setServerError(null)
    }
  }

  const isEditing = !!editingItem

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setServerError(null)

    const parsedParentId = parentId === 'none' ? null : Number(parentId)

    const result = safeParse(CreateCategorySchema, {
      name: name.trim(),
      type,
      parentId: parsedParentId,
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

    const data = { name: name.trim(), type: type as 'PRODUCT' | 'EXPENSE' | 'SERVICE' | 'PURCHASE', parentId: parsedParentId, isActive }

    function linkAndClose(categoryId: number) {
      if (allAttributes.length > 0) {
        linkMutation.mutate(
          { categoryId, attributes: selectedAttrIds.map(id => ({ attributeId: id, isRequired: true })) },
          { onSuccess: () => handleOpenChange(false) },
        )
      } else {
        handleOpenChange(false)
      }
    }

    if (isEditing) {
      updateCategory.mutate(
        { id: editingItem.id, data },
        {
          onSuccess: () => linkAndClose(editingItem.id),
          onError: (err: any) => setServerError(err.message || 'Something went wrong. Please try again.'),
        },
      )
    } else {
      createCategory.mutate(
        data,
        {
          onSuccess: (res) => {
            const newCategory = (res as any).data
            linkAndClose(newCategory.id)
          },
          onError: (err: any) => setServerError(err.message || 'Something went wrong. Please try again.'),
        },
      )
    }
  }

  return (
    <PageLayout
      title="Categories"
      description="Manage hierarchical categories for products, expenses, and services"
      action={
        <Button onClick={() => setIsOpen(true)} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'name', placeholder: 'Search categories...' }}
        filterableColumns={filterableColumns}
        isLoading={isLoading}
        emptyState={{
          title: 'No categories found',
          description: 'Adjust your search or add a new category',
        }}
      />

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col h-full justify-between">
          <div className="space-y-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-bold">{isEditing ? 'Edit Category' : 'Create Category'}</SheetTitle>
            </SheetHeader>

            {serverError && (
              <div className="p-3 text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="category-name" className="text-sm font-semibold">
                  Category Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="category-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Italian Granite"
                  className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Category Type <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={type}
                  onValueChange={(val: string) => {
                    setType(val)
                    setParentId('none')
                  }}
                >
                  {categoryTypeOptions.map((o) => (
                    <div key={o.value} className="flex items-center gap-2">
                      <RadioGroupItem value={o.value} id={`type-${o.value.toLowerCase()}`} />
                      <Label htmlFor={`type-${o.value.toLowerCase()}`} className="font-normal">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
                {errors.type && (
                  <p className="text-xs font-semibold text-destructive">{errors.type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-parent" className="text-sm font-semibold">
                  Parent Category
                </Label>
                <Select value={parentId} onValueChange={setParentId}>
                  <SelectTrigger id="category-parent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Root Category)</SelectItem>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.parentId && (
                  <p className="text-xs font-semibold text-destructive">{errors.parentId}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="category-status"
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(checked === true)}
                />
                <Label htmlFor="category-status" className="font-normal">Active</Label>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Attribute Mapping</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedAttrIds.length} of {allAttributes.length} selected
                  </span>
                </div>
                {allAttributes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No attributes available. Create attributes first.</p>
                ) : (
                  <ScrollArea className="h-56 rounded-md border">
                    <div className="space-y-0.5 p-1">
                      {allAttributes.map((attr: any) => {
                        const isLinked = selectedAttrIds.includes(attr.id)
                        return (
                          <label
                            key={attr.id}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer hover:bg-muted/50',
                              isLinked && 'bg-primary/5',
                            )}
                          >
                            <Checkbox
                              checked={isLinked}
                              onCheckedChange={() => toggleAttribute(attr.id)}
                            />
                            <span className="flex-1 font-medium truncate">{attr.name}</span>
                            {isLinked && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </label>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
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
              disabled={createCategory.isPending || updateCategory.isPending || linkMutation.isPending}
              className="flex-1 font-semibold"
            >
              {createCategory.isPending || updateCategory.isPending || linkMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                'Save Category'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </PageLayout>
  )
}

