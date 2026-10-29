import { useState, useMemo } from 'react'
import { Plus, Trash2, ArrowLeft, ArrowRight, Save, Sparkles, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useUnits, useCategoryAttributes, useAttributeValues } from '../hooks/use-create-product'
import { useCategories, useCreateCategory } from '@/features/masters/hooks/use-masters'

type VariantAttr = { attributeId: number; attributeValueId: number; id?: number }
export type VariantForm = {
  skuCode: string
  unitId: number
  secondaryUnitId?: number | null
  attributes: VariantAttr[]
  id?: number
}

export type ProductFormData = {
  name: string
  categoryId: number
  description: string
  hsnCode: string
  lotNumber: string
  variants: VariantForm[]
}

export function ProductForm({
  initialData,
  onSave,
  isSaving,
  mode,
}: {
  initialData?: ProductFormData
  onSave: (data: ProductFormData) => void
  isSaving: boolean
  mode: 'create' | 'edit'
}) {
  const { data: categoriesRes } = useCategories('PRODUCT')
  const { data: unitsRes } = useUnits()
  const createCategory = useCreateCategory()

  const categories = ((categoriesRes as any)?.data ?? []).filter(
    (category: any) => category.type === 'PRODUCT',
  )
  const units = (unitsRes as any)?.data ?? []

  const [step, setStep] = useState(1)

  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const [name, setName] = useState(initialData?.name ?? '')
  const [categoryId, setCategoryId] = useState(
    initialData?.categoryId ? String(initialData.categoryId) : '',
  )
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [hsnCode, setHsnCode] = useState(initialData?.hsnCode ?? '')
  const [lotNumber, setLotNumber] = useState(initialData?.lotNumber ?? '')

  const parsedCategoryId = categoryId ? Number(categoryId) : null
  const { data: linkedAttrsRes } = useCategoryAttributes(parsedCategoryId)
  const linkedAttributes = (linkedAttrsRes as any)?.data ?? []

  const [variants, setVariants] = useState<VariantForm[]>(
    initialData?.variants?.length
      ? initialData.variants.map((v) => ({
          ...v,
          attributes: v.attributes ?? [],
        }))
      : [],
  )

  const [selectedValues, setSelectedValues] = useState<Record<number, number[]>>({})
  const [defaultUnitId, setDefaultUnitId] = useState<number>(0)
  const [defaultSecondaryUnitId, setDefaultSecondaryUnitId] = useState<number>(0)

  const [manualOpen, setManualOpen] = useState(false)
  const [manualSku, setManualSku] = useState('')
  const [manualUnitId, setManualUnitId] = useState<number>(0)
  const [manualSecondaryUnitId, setManualSecondaryUnitId] = useState<number>(0)
  const [manualAttrs, setManualAttrs] = useState<Record<number, number>>({})
  const [editIdx, setEditIdx] = useState<number | null>(null)

  const hasSelectedValues = useMemo(() => {
    return Object.values(selectedValues).some((v) => v.length > 0)
  }, [selectedValues])

  const generationReady = hasSelectedValues && defaultUnitId > 0
  const hasSecondaryUnits = variants.some((v) => v.secondaryUnitId)

  const totalCombinations = useMemo(() => {
    const valueArrays = Object.values(selectedValues).filter((v) => v.length > 0)
    if (valueArrays.length === 0) return 0
    return valueArrays.reduce((acc, v) => acc * v.length, 1)
  }, [selectedValues])

  function toggleValue(attrId: number, valueId: number) {
    setSelectedValues((prev) => {
      const current = prev[attrId] ?? []
      const next = current.includes(valueId)
        ? current.filter((id) => id !== valueId)
        : [...current, valueId]
      return { ...prev, [attrId]: next.length > 0 ? next : [] }
    })
  }

  function cartesian<T>(arrays: T[][]): T[][] {
    if (arrays.length === 0) return [[]]
    const [first, ...rest] = arrays
    const restCombinations = cartesian(rest)
    return first.flatMap((item) => restCombinations.map((combo) => [item, ...combo]))
  }

  function generateVariants() {
    const attrEntries = Object.entries(selectedValues).filter(([, ids]) => ids.length > 0)
    if (attrEntries.length === 0) return

    const valueArrays = attrEntries.map(([attrId, ids]) =>
      ids.map((valueId) => ({
        attributeId: Number(attrId),
        attributeValueId: valueId,
      })),
    )

    const combinations = cartesian(valueArrays)
    const prefix = name.trim().slice(0, 3).toUpperCase() || 'PRD'
    const existingCount = variants.length

    const newVariants: VariantForm[] = combinations.map((combo, i) => ({
      skuCode: `${prefix}-${(existingCount + i + 1).toString().padStart(3, '0')}`,
      unitId: defaultUnitId,
      secondaryUnitId: defaultSecondaryUnitId || null,
      attributes: combo,
    }))

    setVariants((prev) => [...prev, ...newVariants])
  }

  function generateSku() {
    const prefix = name.trim().slice(0, 2).toUpperCase()
    return prefix || name
      ? `${prefix || 'PRD'}-${Date.now().toString(36).toUpperCase()}`
      : ''
  }

  function handleAddManual() {
    const attrs = Object.entries(manualAttrs)
      .filter(([, valueId]) => valueId > 0)
      .map(([attrId, valueId]) => ({
        attributeId: Number(attrId),
        attributeValueId: valueId,
      }))

    if (!manualSku || manualUnitId === 0) return

    if (editIdx !== null) {
      setVariants(
        variants.map((v, i) =>
          i === editIdx
            ? {
                ...v,
                skuCode: manualSku,
                unitId: manualUnitId,
                secondaryUnitId: manualSecondaryUnitId || null,
                attributes: attrs,
              }
            : v,
        ),
      )
    } else {
      setVariants([
        ...variants,
        {
          skuCode: manualSku,
          unitId: manualUnitId,
          secondaryUnitId: manualSecondaryUnitId || null,
          attributes: attrs,
        },
      ])
    }

    resetManualForm()
  }

  function resetManualForm() {
    setManualSku('')
    setManualUnitId(0)
    setManualSecondaryUnitId(0)
    setManualAttrs({})
    setEditIdx(null)
    setManualOpen(false)
  }

  function removeVariant(index: number) {
    setVariants(variants.filter((_, i) => i !== index))
  }

  function startEdit(index: number) {
    const v = variants[index]
    const attrMap: Record<number, number> = {}
    for (const a of v.attributes) {
      attrMap[a.attributeId] = a.attributeValueId
    }
    setManualAttrs(attrMap)
    setManualUnitId(v.unitId)
    setManualSecondaryUnitId(v.secondaryUnitId ?? 0)
    setManualSku(v.skuCode)
    setEditIdx(index)
    setManualOpen(true)
  }

  function selectCategory(value: string) {
    if (value === '__add__') {
      setIsAddingCategory(true)
      return
    }
    setCategoryId(value)
  }

  async function saveNewCategory() {
    const categoryName = newCategoryName.trim()
    if (!categoryName) {
      alert('Category name is required')
      return
    }

    try {
      const res: any = await createCategory.mutateAsync({
        name: categoryName,
        type: 'PRODUCT',
        isActive: true,
      })
      const newId = res?.data?.id
      if (newId) setCategoryId(String(newId))
      setNewCategoryName('')
      setIsAddingCategory(false)
    } catch (error: any) {
      alert(error?.message || 'Failed to create category')
    }
  }

  function canGoNext() {
    return name && categoryId
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) {
      if (canGoNext()) setStep(2)
      return
    }
    onSave({
      name,
      categoryId: Number(categoryId),
      description,
      hsnCode,
      lotNumber,
      variants: variants.map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        skuCode: v.skuCode,
        unitId: v.unitId,
        secondaryUnitId: v.secondaryUnitId ?? null,
        attributes: v.attributes
          .filter((a) => a.attributeId > 0 && a.attributeValueId > 0)
          .map((a) => ({
            ...(a.id ? { id: a.id } : {}),
            attributeId: a.attributeId,
            attributeValueId: a.attributeValueId,
          })),
      })),
    })
  }

  const steps = [
    { num: 1, label: 'Product Info' },
    { num: 2, label: 'Variants' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  step === s.num
                    ? 'bg-primary text-primary-foreground'
                    : step > s.num
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span
                className={cn(
                  'text-sm',
                  step === s.num ? 'font-medium' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && <Separator className="w-8" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Absolute Black Granite"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={categoryId} onValueChange={selectCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add__">
                    <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add new category</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {isAddingCategory && (
                <div className="mt-2 space-y-2 rounded-lg border bg-muted/20 p-3">
                  <Label className="text-[11px]">New Product Category</Label>
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="hsnCode">HSN Code</Label>
              <Input
                id="hsnCode"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="e.g. 6802.23"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lotNumber">Lot Number</Label>
              <Input
                id="lotNumber"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. LOT-001"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief product description"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {/* Variant Matrix Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variant Matrix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {linkedAttributes.length === 0 ? (
                <div className="flex items-center justify-center h-24 rounded-md border border-dashed text-sm text-muted-foreground">
                  {categoryId
                    ? 'This category has no linked attributes. Add attribute mapping in Categories page.'
                    : 'Select a category in Step 1 to generate variants.'}
                </div>
              ) : (
                <>
                  {/* Default and secondary units */}
                  <div className="grid max-w-xl gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Default Unit *</Label>
                      <Select
                        value={defaultUnitId ? String(defaultUnitId) : ''}
                        onValueChange={(v) => setDefaultUnitId(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((u: any) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.code} - {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Secondary Unit</Label>
                      <Select
                        value={
                          defaultSecondaryUnitId ? String(defaultSecondaryUnitId) : 'none'
                        }
                        onValueChange={(v) =>
                          setDefaultSecondaryUnitId(v === 'none' ? 0 : Number(v))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select secondary unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (optional)</SelectItem>
                          {units
                            .filter((u: any) => u.id !== defaultUnitId)
                            .map((u: any) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {u.code} - {u.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Default unit is used for quantity and rate. Secondary unit is optional
                      (e.g. sqft with slabs).
                    </p>
                  </div>

                  <Separator />

                  {/* Attribute value matrix */}
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {linkedAttributes.map((attr: any) => (
                      <AttributeValueMatrix
                        key={attr.id}
                        attribute={attr}
                        selectedIds={selectedValues[attr.id] ?? []}
                        onToggle={(valueId) => toggleValue(attr.id, valueId)}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      type="button"
                      onClick={generateVariants}
                      disabled={!generationReady}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate{totalCombinations > 0 ? ` ${totalCombinations}` : ''} Variants
                    </Button>
                    {totalCombinations > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {totalCombinations} combination{totalCombinations !== 1 ? 's' : ''} will
                        be generated
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Variants Table */}
          {variants.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Variants{' '}
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {variants.length}
                  </Badge>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetManualForm()
                    setManualOpen(true)
                  }}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Manually
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9">#</TableHead>
                      <TableHead className="h-9">Attributes</TableHead>
                      <TableHead className="h-9">SKU</TableHead>
                      <TableHead className="h-9">Unit</TableHead>
                      {hasSecondaryUnits && (
                        <TableHead className="h-9">Secondary Unit</TableHead>
                      )}
                      <TableHead className="h-9 w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v, i) => {
                      const unit = units.find((u: any) => u.id === v.unitId)
                      const secondaryUnit = units.find(
                        (u: any) => u.id === v.secondaryUnitId,
                      )
                      const attrLabels = v.attributes
                        .map((a) => {
                          const attr = linkedAttributes.find(
                            (ga: any) => ga.id === a.attributeId,
                          )
                          return attr?.name ?? ''
                        })
                        .filter(Boolean)
                        .join(', ')
                      return (
                        <TableRow key={i}>
                          <TableCell className="py-2 text-xs text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell className="py-2 text-sm text-muted-foreground">
                            {attrLabels || '—'}
                          </TableCell>
                          <TableCell className="py-2 font-mono text-xs">{v.skuCode}</TableCell>
                          <TableCell className="py-2 text-sm">{unit?.code ?? '—'}</TableCell>
                          {hasSecondaryUnits && (
                            <TableCell className="py-2 text-sm">
                              {secondaryUnit?.code ?? '—'}
                            </TableCell>
                          )}
                          <TableCell className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => startEdit(i)}
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeVariant(i)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Manual Add / Edit Form */}
          {manualOpen && (
            <Card className="border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium">
                  {editIdx !== null ? 'Edit Variant' : 'Add Variant Manually'}
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={resetManualForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Attribute dropdowns for manual add */}
                {linkedAttributes.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {linkedAttributes.map((attr: any) => (
                      <AttributeValueSelect
                        key={attr.id}
                        attribute={attr}
                        value={manualAttrs[attr.id] ?? 0}
                        onChange={(valueId) =>
                          setManualAttrs({ ...manualAttrs, [attr.id]: valueId })
                        }
                      />
                    ))}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>SKU Code *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={manualSku}
                        onChange={(e) => setManualSku(e.target.value)}
                        placeholder="Auto-generated"
                        className="font-mono text-xs"
                      />
                      {!manualSku && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-9 text-xs"
                          onClick={() => setManualSku(generateSku())}
                        >
                          Auto
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit *</Label>
                    <Select
                      value={manualUnitId ? String(manualUnitId) : ''}
                      onValueChange={(v) => setManualUnitId(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u: any) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.code} - {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Unit</Label>
                    <Select
                      value={
                        manualSecondaryUnitId ? String(manualSecondaryUnitId) : 'none'
                      }
                      onValueChange={(v) =>
                        setManualSecondaryUnitId(v === 'none' ? 0 : Number(v))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select secondary unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (optional)</SelectItem>
                        {units
                          .filter((u: any) => u.id !== manualUnitId)
                          .map((u: any) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.code} - {u.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleAddManual}
                    disabled={!manualSku || manualUnitId === 0}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {editIdx !== null ? 'Update Variant' : 'Add Variant'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetManualForm}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {variants.length === 0 && !manualOpen && (
            <div className="flex items-center justify-center h-24 rounded-md border border-dashed text-sm text-muted-foreground">
              Generate variants from the matrix above, or click "Add Manually" to create one.
            </div>
          )}
        </div>
      )}

      {/* Footer navigation */}
      <div className="flex items-center justify-between">
        <div>
          {step === 2 ? (
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          ) : (
            <div />
          )}
        </div>
        <div className="flex gap-3">
          {step === 1 ? (
            <Button type="submit" disabled={!canGoNext()}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={variants.length === 0 || isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving
                ? 'Saving...'
                : mode === 'create'
                  ? 'Save Product'
                  : 'Update Product'}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}

function AttributeValueMatrix({
  attribute,
  selectedIds,
  onToggle,
}: {
  attribute: { id: number; name: string }
  selectedIds: number[]
  onToggle: (valueId: number) => void
}) {
  const { data: valuesRes } = useAttributeValues(attribute.id)
  const values = (valuesRes as any)?.data ?? []

  if (values.length === 0) return null

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{attribute.name}</Label>
      <div className="flex flex-wrap gap-1.5">
        {values.map((av: any) => {
          const isSelected = selectedIds.includes(av.id)
          return (
            <label
              key={av.id}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm cursor-pointer transition-colors select-none',
                isSelected
                  ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/20'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggle(av.id)}
                className="h-3.5 w-3.5"
              />
              {av.value}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function AttributeValueSelect({
  attribute,
  value,
  onChange,
}: {
  attribute: { id: number; name: string }
  value: number
  onChange: (v: number) => void
}) {
  const { data: valuesRes } = useAttributeValues(attribute.id)
  const values = (valuesRes as any)?.data ?? []

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{attribute.name}</Label>
      <Select value={value ? String(value) : ''} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={`Select ${attribute.name.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {values.map((av: any) => (
            <SelectItem key={av.id} value={String(av.id)}>
              {av.value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
