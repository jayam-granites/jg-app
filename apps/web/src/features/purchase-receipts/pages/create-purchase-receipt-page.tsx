import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, ChevronDown, Copy, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useCreatePurchaseReceipt } from '../hooks/use-purchase-receipts'
import { usePurchaseOrders } from '@/features/purchase-orders/hooks/use-purchase-orders'
import { useCategories } from '@/features/masters/hooks/use-masters'
import { useAppSettings, useLookupOptions } from '@/features/masters/hooks/use-lookups'
import { calculateReceiptBilling, LOOKUP_GROUPS, SETTINGS_KEYS, type GstCalculationMode } from '@jg-app/shared'
import { formatDateTime } from '@/lib/date'

type SlabEntry = {
  id: string
  serialNo: string
  length: number
  width: number
  thickness: number
  sqft: number
  isCrack: boolean
  crackWidth: number
  crackHeight: number
  crackArea: number
  isBroken: boolean
}

type ProductDraft = {
  batchNo: string
  buyingPrice: string
  widthAllowance: string
  heightAllowance: string
  gstInvoiceSqft: string
  gstInvoiceRate: string
  slabs: SlabEntry[]
  error: string
}

type LineItem = {
  purchaseOrderItemId: number
  productVariantId: number
  productName: string
  batchNo: string
  buyingPrice: number
  landingPrice: number
  sellingPriceFrom: number
  sellingPriceTo: number
  widthAllowance: number
  heightAllowance: number
  slabs: SlabEntry[]
  measuredSqft: number
  totalSqft: number
  itemSubtotal: number
  gstInvoiceSqft: number
  gstInvoiceRate: number
}

function calcSqft(length: number, width: number, widthAllowance = 0, heightAllowance = 0): number {
  return Math.round(((length + heightAllowance) * (width + widthAllowance)) / 144 * 1000) / 1000
}

function calcMeasuredSqft(length: number, width: number): number {
  return Math.round((length * width) / 144 * 1000) / 1000
}

function calcActualSqft(
  length: number,
  width: number,
  widthAllowance: number,
  heightAllowance: number,
  crackArea: number,
): number {
  return Math.max(
    Math.round((calcSqft(length, width, widthAllowance, heightAllowance) - crackArea) * 1000) / 1000,
    0,
  )
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

const emptySlab = (index: number): SlabEntry => ({
  id: `slab-${Date.now()}-${index}-${Math.random()}`,
  serialNo: `SLAB-${String(index + 1).padStart(3, '0')}`,
  length: 0,
  width: 0,
  thickness: 0,
  sqft: 0,
  isCrack: false,
  crackWidth: 0,
  crackHeight: 0,
  crackArea: 0,
  isBroken: false,
})

const EMPTY_PRODUCT_DRAFT: ProductDraft = {
  batchNo: '',
  buyingPrice: '',
  widthAllowance: '',
  heightAllowance: '',
  gstInvoiceSqft: '',
  gstInvoiceRate: '',
  slabs: [],
  error: '',
}

export function CreatePurchaseReceiptPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/purchase/receipts/create' })
  const createReceipt = useCreatePurchaseReceipt()
  const { data: ordersRes } = usePurchaseOrders()
  const { data: categoriesRes } = useCategories('PURCHASE')
  const { data: settingsRes } = useAppSettings()
  const { data: paymentModeOptionsRes } = useLookupOptions(LOOKUP_GROUPS.PAYMENT_MODE)
  const expenseCategories = categoriesRes?.data ?? []
  const paymentModes = paymentModeOptionsRes?.data?.[LOOKUP_GROUPS.PAYMENT_MODE] ?? []
  const gstPct = Number(settingsRes?.data?.[SETTINGS_KEYS.INVOICE_GST_PERCENT]) || 18

  const orders = (ordersRes?.data ?? []).filter(
    (o: any) => o.status !== 'CANCELLED' && o.status !== 'COMPLETED',
  )

  const [purchaseOrderId, setPurchaseOrderId] = useState(search.purchaseOrderId ?? '')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [remarks, setRemarks] = useState('')
  const [productDrafts, setProductDrafts] = useState<Record<number, ProductDraft>>({})
  const [openProducts, setOpenProducts] = useState<Record<number, boolean>>({})
  const [crackDialogOpen, setCrackDialogOpen] = useState(false)
  const [activeCrackSlab, setActiveCrackSlab] = useState<{ orderItemId: number; slabId: string } | null>(null)
  const [crackWidth, setCrackWidth] = useState('')
  const [crackHeight, setCrackHeight] = useState('')
  const [crackError, setCrackError] = useState('')
  const [gstCalculationMode, setGstCalculationMode] = useState<GstCalculationMode>('OVERALL')
  const slabSequence = useRef(0)

  // Granite billing header fields
  const [adjustment, setAdjustment] = useState('')
  const [gstInvoiceSqft, setGstInvoiceSqft] = useState('')
  const [gstInvoiceRate, setGstInvoiceRate] = useState('')

  // Expenses
  const [expenses, setExpenses] = useState<{ categoryId: number; categoryName: string; amount: number; expenseDate: string; paymentMode: string; referenceNumber: string; remarks: string }[]>([])
  const [expCategoryId, setExpCategoryId] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0])
  const [expPaymentMode, setExpPaymentMode] = useState('')
  const [expRefNo, setExpRefNo] = useState('')
  const [expRemarks, setExpRemarks] = useState('')

  const selectedOrder = orders.find((o: any) => o.id === Number(purchaseOrderId))
  const orderItems = selectedOrder?.items ?? []

  useEffect(() => {
    if (!selectedOrder) return
    setProductDrafts((current) => {
      const next = { ...current }
      let changed = false
      for (const item of selectedOrder.items ?? []) {
        if (!next[item.id]) {
          next[item.id] = { ...EMPTY_PRODUCT_DRAFT }
          changed = true
        }
      }
      return changed ? next : current
    })
    setOpenProducts((current) => (
      Object.keys(current).length || !selectedOrder.items?.length
        ? current
        : { [selectedOrder.items[0].id]: true }
    ))
  }, [selectedOrder?.id])

  const handlePurchaseOrderChange = (value: string) => {
    setPurchaseOrderId(value)
    setProductDrafts({})
    setOpenProducts({})
  }

  const updateProductDraft = (
    orderItemId: number,
    update: (draft: ProductDraft) => ProductDraft,
  ) => {
    setProductDrafts((current) => ({
      ...current,
      [orderItemId]: update(current[orderItemId] ?? EMPTY_PRODUCT_DRAFT),
    }))
  }

  const addSlab = (orderItemId: number) => {
    const slab = emptySlab(slabSequence.current++)
    updateProductDraft(orderItemId, (draft) => ({
      ...draft,
      slabs: [slab, ...draft.slabs],
      error: '',
    }))
  }

  const duplicateSlab = (orderItemId: number, slabId: string) => {
    updateProductDraft(orderItemId, (draft) => {
      const source = draft.slabs.find((slab) => slab.id === slabId)
      if (!source) return draft
      const duplicate = emptySlab(slabSequence.current++)
      return {
        ...draft,
        slabs: [{ ...source, id: duplicate.id, serialNo: duplicate.serialNo }, ...draft.slabs],
        error: '',
      }
    })
  }

  const openCrackDialog = (orderItemId: number, slab: SlabEntry) => {
    setActiveCrackSlab({ orderItemId, slabId: slab.id })
    setCrackWidth(slab.crackWidth ? String(slab.crackWidth) : '')
    setCrackHeight(slab.crackHeight ? String(slab.crackHeight) : '')
    setCrackError('')
    setCrackDialogOpen(true)
  }

  const applyCrack = () => {
    if (!activeCrackSlab) return
    const width = Number(crackWidth)
    const height = Number(crackHeight)
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      setCrackError('Enter a crack width and height greater than zero.')
      return
    }

    const crackArea = calcMeasuredSqft(height, width)
    updateProductDraft(activeCrackSlab.orderItemId, (draft) => ({
      ...draft,
      slabs: draft.slabs.map((slab) => slab.id !== activeCrackSlab.slabId ? slab : {
        ...slab,
        isCrack: true,
        crackWidth: width,
        crackHeight: height,
        crackArea,
        sqft: calcActualSqft(
          slab.length,
          slab.width,
          Number(draft.widthAllowance) || 0,
          Number(draft.heightAllowance) || 0,
          crackArea,
        ),
      }),
      error: '',
    }))
    setCrackDialogOpen(false)
    setActiveCrackSlab(null)
  }

  const clearCrack = (orderItemId: number, slabId: string) => {
    updateProductDraft(orderItemId, (draft) => ({
      ...draft,
      slabs: draft.slabs.map((slab) => slab.id !== slabId ? slab : {
        ...slab,
        isCrack: false,
        crackWidth: 0,
        crackHeight: 0,
        crackArea: 0,
        sqft: calcActualSqft(
          slab.length,
          slab.width,
          Number(draft.widthAllowance) || 0,
          Number(draft.heightAllowance) || 0,
          0,
        ),
      }),
      error: '',
    }))
  }

  const handleCrackChange = (orderItemId: number, slab: SlabEntry, checked: boolean) => {
    if (checked || slab.isCrack) openCrackDialog(orderItemId, slab)
    else clearCrack(orderItemId, slab.id)
  }

  const removeActiveCrack = () => {
    if (!activeCrackSlab) return
    clearCrack(activeCrackSlab.orderItemId, activeCrackSlab.slabId)
    setCrackDialogOpen(false)
    setActiveCrackSlab(null)
  }

  const updateSlab = (
    orderItemId: number,
    slabId: string,
    field: keyof Omit<SlabEntry, 'id'>,
    value: any,
  ) => {
    updateProductDraft(orderItemId, (draft) => ({
      ...draft,
      slabs: draft.slabs.map((slab) => {
        if (slab.id !== slabId) return slab
        const next = { ...slab, [field]: value }
        if (field === 'length' || field === 'width') {
          next.sqft = calcActualSqft(
            next.length,
            next.width,
            Number(draft.widthAllowance) || 0,
            Number(draft.heightAllowance) || 0,
            next.crackArea,
          )
        }
        return next
      }),
      error: '',
    }))
  }

  const updateAllowance = (orderItemId: number, field: 'width' | 'height', value: string) => {
    updateProductDraft(orderItemId, (draft) => {
      const nextWidthAllowance = field === 'width' ? Number(value) || 0 : Number(draft.widthAllowance) || 0
      const nextHeightAllowance = field === 'height' ? Number(value) || 0 : Number(draft.heightAllowance) || 0
      return {
        ...draft,
        [field === 'width' ? 'widthAllowance' : 'heightAllowance']: value,
        slabs: draft.slabs.map((slab) => ({
          ...slab,
          sqft: calcActualSqft(slab.length, slab.width, nextWidthAllowance, nextHeightAllowance, slab.crackArea),
        })),
        error: '',
      }
    })
  }

  const items = useMemo<LineItem[]>(() => orderItems.flatMap((orderItem: any) => {
    const draft = productDrafts[orderItem.id] ?? EMPTY_PRODUCT_DRAFT
    if (draft.slabs.length === 0) return []
    const variant = orderItem.productVariant
    const measuredSqft = draft.slabs.reduce(
      (sum, slab) => sum + calcMeasuredSqft(slab.length, slab.width),
      0,
    )
    const totalSqft = draft.slabs.reduce((sum, slab) => sum + slab.sqft, 0)
    return [{
      purchaseOrderItemId: orderItem.id,
      productVariantId: orderItem.productVariantId,
      productName: variant ? `${variant.product?.name} - ${variant.skuCode}` : `Variant #${orderItem.productVariantId}`,
      batchNo: draft.batchNo.trim(),
      buyingPrice: Number(draft.buyingPrice) || 0,
      landingPrice: Number(draft.buyingPrice) || 0,
      sellingPriceFrom: 0,
      sellingPriceTo: 0,
      widthAllowance: Number(draft.widthAllowance) || 0,
      heightAllowance: Number(draft.heightAllowance) || 0,
      slabs: draft.slabs,
      measuredSqft,
      totalSqft,
      itemSubtotal: totalSqft > 0 ? round2(totalSqft * (Number(draft.buyingPrice) || 0)) : 0,
      gstInvoiceSqft: Number(draft.gstInvoiceSqft) || 0,
      gstInvoiceRate: Number(draft.gstInvoiceRate) || 0,
    }]
  }), [orderItems, productDrafts])

  const handleAddExpense = () => {
    if (!expCategoryId || !expAmount) return
    const cat = expenseCategories.find((c: any) => c.id === Number(expCategoryId))
    setExpenses([...expenses, {
      categoryId: Number(expCategoryId),
      categoryName: cat?.name ?? 'Unknown',
      amount: Number(expAmount),
      expenseDate: expDate,
      paymentMode: expPaymentMode,
      referenceNumber: expRefNo,
      remarks: expRemarks,
    }])
    setExpCategoryId('')
    setExpAmount('')
    setExpPaymentMode('')
    setExpRefNo('')
    setExpRemarks('')
  }

  const handleRemoveExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index))
  }

  // ---- Granite billing calculations ----
  const graniteCalc = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.itemSubtotal, 0)
    const adj = Number(adjustment) || 0
    const billing = calculateReceiptBilling({
      mode: gstCalculationMode,
      lines: items.map((item) => ({
        subtotal: item.itemSubtotal,
        gstInvoiceSqft: item.gstInvoiceSqft,
        gstInvoiceRate: item.gstInvoiceRate,
      })),
      adjustment: adj,
      gstPercentage: gstPct,
      overallGstInvoiceSqft: Number(gstInvoiceSqft) || 0,
      overallGstInvoiceRate: Number(gstInvoiceRate) || 0,
    })
    const totalSqfts = items.reduce((sum, i) => sum + i.totalSqft, 0)
    const measuredSqfts = items.reduce((sum, i) => sum + i.measuredSqft, 0)
    const totalSlabs = items.reduce((sum, i) => sum + i.slabs.length, 0)
    return { ...billing.summary, billingLines: billing.lines, subtotal, totalSqfts, measuredSqfts, totalSlabs }
  }, [items, adjustment, gstInvoiceSqft, gstInvoiceRate, gstCalculationMode, gstPct])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrder || items.length === 0) return

    const invalidItem = orderItems.find((orderItem: any) => {
      const draft = productDrafts[orderItem.id] ?? EMPTY_PRODUCT_DRAFT
      return draft.slabs.length > 0
        && (!(Number(draft.buyingPrice) > 0)
          || draft.slabs.some((slab) => slab.length <= 0 || slab.width <= 0))
    })
    if (invalidItem) {
      updateProductDraft(invalidItem.id, (draft) => ({
        ...draft,
        error: draft.slabs.some((slab) => slab.length <= 0 || slab.width <= 0)
          ? 'Enter a positive width and height for each slab.'
          : 'Enter a buying price for this product.',
      }))
      setOpenProducts((current) => ({ ...current, [invalidItem.id]: true }))
      return
    }

    createReceipt.mutate({
      purchaseOrderId: Number(purchaseOrderId),
      vehicleNumber: vehicleNumber || undefined,
      invoiceNumber: invoiceNumber || undefined,
      receivedDate: receivedDate || undefined,
      adjustment: Number(adjustment) || 0,
      gstCalculationMode,
      gstInvoiceSqft: gstCalculationMode === 'OVERALL' ? Number(gstInvoiceSqft) || undefined : undefined,
      gstInvoiceRate: gstCalculationMode === 'OVERALL' ? Number(gstInvoiceRate) || undefined : undefined,
      remarks: remarks || undefined,
      items: items.map((i) => ({
        purchaseOrderItemId: i.purchaseOrderItemId,
        productVariantId: i.productVariantId,
        batchNo: i.batchNo || undefined,
        buyingPrice: i.buyingPrice,
        landingPrice: i.landingPrice || undefined,
        sellingPriceFrom: i.sellingPriceFrom || undefined,
        sellingPriceTo: i.sellingPriceTo || undefined,
        widthAllowance: i.widthAllowance || undefined,
        heightAllowance: i.heightAllowance || undefined,
        gstInvoiceSqft: gstCalculationMode === 'PRODUCT' ? i.gstInvoiceSqft || undefined : undefined,
        gstInvoiceRate: gstCalculationMode === 'PRODUCT' ? i.gstInvoiceRate || undefined : undefined,
        slabs: i.slabs.map((s) => ({
          serialNo: s.serialNo || undefined,
          length: s.length,
          width: s.width,
          thickness: s.thickness || undefined,
          sqft: s.sqft || undefined,
          isCrack: s.isCrack || undefined,
          crackWidth: s.isCrack ? s.crackWidth : undefined,
          crackHeight: s.isCrack ? s.crackHeight : undefined,
          isBroken: s.isBroken || undefined,
        })),
      })),
      expenses: expenses.length > 0 ? expenses.map((e) => ({
        categoryId: e.categoryId,
        amount: e.amount,
        expenseDate: e.expenseDate || undefined,
        paymentMode: e.paymentMode || undefined,
        referenceNumber: e.referenceNumber || undefined,
        remarks: e.remarks || undefined,
      })) : undefined,
    } as any, {
      onSuccess: () => navigate({ to: '/purchase/receipts' }),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/purchase/receipts' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Purchase Receipt</h1>
          <p className="text-sm text-muted-foreground">Record goods received from supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Section */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-lg font-semibold">Receipt Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Purchase Order <span className="text-destructive">*</span></Label>
              <Select value={purchaseOrderId} onValueChange={handlePurchaseOrderChange} disabled={items.length > 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PO" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.poNumber} - {o.supplier?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Received Date</Label>
              <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Vehicle Number</Label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="Vehicle #" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Supplier Invoice #</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Invoice #" />
            </div>
          </div>
        </div>

        {/* Section 1: Granite Value Calculation */}
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">1. Granite Value Calculation</h3>
              <p className="text-sm text-muted-foreground">Products are loaded from the selected purchase order.</p>
            </div>
            <div className="w-full space-y-1 sm:w-72">
              <Label className="text-xs font-semibold">GST and Cash Calculation</Label>
              <Select value={gstCalculationMode} onValueChange={(value) => setGstCalculationMode(value as GstCalculationMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OVERALL">Overall receipt</SelectItem>
                  <SelectItem value="PRODUCT">Per product</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedOrder && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Select a purchase order to see its products.
            </p>
          )}
          {selectedOrder && orderItems.length === 0 && (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              This purchase order has no active products to receive.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {orderItems.map((orderItem: any) => {
              const draft = productDrafts[orderItem.id] ?? EMPTY_PRODUCT_DRAFT
              const variant = orderItem.productVariant
              const productName = variant?.product?.name ?? `Product variant #${orderItem.productVariantId}`
              const skuCode = variant?.skuCode ?? ''
              const productSummary = items.find((item) => item.purchaseOrderItemId === orderItem.id)
              const productIndex = items.findIndex((item) => item.purchaseOrderItemId === orderItem.id)
              const billingLine = productIndex >= 0 ? graniteCalc.billingLines[productIndex] : null
              const inputSqft = Number(draft.gstInvoiceSqft) || 0
              const inputRate = Number(draft.gstInvoiceRate) || 0
              const inputBaseValue = inputSqft > 0 && inputRate > 0 ? round2(inputSqft * inputRate) : 0
              const inputGst = round2(inputBaseValue * gstPct / 100)

              return (
                <Collapsible
                  key={orderItem.id}
                  open={!!openProducts[orderItem.id]}
                  onOpenChange={(open) => setOpenProducts((current) => ({ ...current, [orderItem.id]: open }))}
                >
                  <div className="overflow-hidden rounded-lg border">
                    <CollapsibleTrigger className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {skuCode && <span>{skuCode} · </span>}
                          {draft.slabs.length} slabs · {productSummary?.measuredSqft.toFixed(3) ?? '0.000'} measured sqft · {productSummary?.totalSqft.toFixed(3) ?? '0.000'} actual sqft
                        </p>
                      </div>
                      <ChevronDown className={`shrink-0 transition-transform ${openProducts[orderItem.id] ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>

                    <CollapsibleContent className="border-t p-4">
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Batch No</Label>
                            <Input
                              value={draft.batchNo}
                              onChange={(event) => updateProductDraft(orderItem.id, (current) => ({ ...current, batchNo: event.target.value, error: '' }))}
                              placeholder="Auto-generated"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Buying Price (₹/sqft) <span className="text-destructive">*</span></Label>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={draft.buyingPrice}
                              onChange={(event) => updateProductDraft(orderItem.id, (current) => ({ ...current, buyingPrice: event.target.value, error: '' }))}
                              placeholder="0"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Width Allowance (in)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={draft.widthAllowance}
                                onChange={(event) => updateAllowance(orderItem.id, 'width', event.target.value)}
                                placeholder="0"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Height Allowance (in)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={draft.heightAllowance}
                                onChange={(event) => updateAllowance(orderItem.id, 'height', event.target.value)}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>

                        {gstCalculationMode === 'PRODUCT' && (
                          <div className="rounded-lg border p-3">
                            <h4 className="mb-3 text-sm font-semibold">GST bill for {productName}</h4>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                              <div className="space-y-1">
                                <Label className="text-xs">GST Invoice Sqft</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={draft.gstInvoiceSqft}
                                  onChange={(event) => updateProductDraft(orderItem.id, (current) => ({ ...current, gstInvoiceSqft: event.target.value }))}
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">GST Invoice Rate (₹/sqft)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.gstInvoiceRate}
                                  onChange={(event) => updateProductDraft(orderItem.id, (current) => ({ ...current, gstInvoiceRate: event.target.value }))}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Base Value</Label>
                                <p className="py-2 font-semibold">₹{(billingLine?.gstInvoiceBaseValue ?? inputBaseValue).toLocaleString()}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">GST @ {gstPct}%</Label>
                                <p className="py-2 font-semibold">₹{(billingLine?.gstInvoiceGst ?? inputGst).toLocaleString()}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">GST Invoice Total</Label>
                                <p className="py-2 font-semibold text-primary">
                                  ₹{(billingLine?.gstInvoiceTotal ?? round2(inputBaseValue + inputGst)).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold">Slab Measurements</h4>
                            <p className="text-xs text-muted-foreground">
                              {draft.slabs.length} slabs · {draft.slabs.filter((slab) => slab.isBroken).length} damaged
                              {' · '}Measured {productSummary?.measuredSqft.toFixed(3) ?? '0.000'} sqft
                              {' · '}Actual {productSummary?.totalSqft.toFixed(3) ?? '0.000'} sqft
                            </p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={() => addSlab(orderItem.id)}>
                            <Plus data-icon="inline-start" /> Add Slab
                          </Button>
                        </div>

                        {draft.slabs.length === 0 ? (
                          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                            Add this product’s received slab measurements here.
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b bg-muted/50">
                                  <th className="px-3 py-2 text-left text-xs font-medium">Slab No</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium">Width (in)</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium">Height (in)</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium">Thickness (in)</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium">Measured Sq Ft</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium">Actual Sq Ft</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium">Crack</th>
                                  <th className="px-3 py-2 text-center text-xs font-medium">Damaged</th>
                                  <th className="px-3 py-2" />
                                </tr>
                              </thead>
                              <tbody>
                                {draft.slabs.map((slab) => (
                                  <tr key={slab.id} className="border-b last:border-0">
                                    <td className="px-3 py-1">
                                      <Input className="h-8 text-xs" value={slab.serialNo} onChange={(event) => updateSlab(orderItem.id, slab.id, 'serialNo', event.target.value)} />
                                    </td>
                                    <td className="px-3 py-1">
                                      <Input className="h-8 text-right text-xs" type="number" min="0.01" step="0.01" value={slab.width || ''} onChange={(event) => updateSlab(orderItem.id, slab.id, 'width', Number(event.target.value) || 0)} />
                                    </td>
                                    <td className="px-3 py-1">
                                      <Input className="h-8 text-right text-xs" type="number" min="0.01" step="0.01" value={slab.length || ''} onChange={(event) => updateSlab(orderItem.id, slab.id, 'length', Number(event.target.value) || 0)} />
                                    </td>
                                    <td className="px-3 py-1">
                                      <Input className="h-8 text-right text-xs" type="number" min="0" step="0.01" value={slab.thickness || ''} onChange={(event) => updateSlab(orderItem.id, slab.id, 'thickness', Number(event.target.value) || 0)} />
                                    </td>
                                    <td className="px-3 py-1 text-right font-mono text-xs">{calcMeasuredSqft(slab.length, slab.width).toFixed(3)}</td>
                                    <td className="px-3 py-1 text-right font-mono text-xs">{slab.sqft.toFixed(3)}</td>
                                    <td className="px-3 py-1 text-center">
                                      <Checkbox aria-label={`Cracked slab ${slab.serialNo}`} checked={slab.isCrack} onCheckedChange={(value) => handleCrackChange(orderItem.id, slab, !!value)} />
                                    </td>
                                    <td className="px-3 py-1 text-center">
                                      <Checkbox aria-label={`Damaged slab ${slab.serialNo}`} checked={slab.isBroken} onCheckedChange={(value) => updateSlab(orderItem.id, slab.id, 'isBroken', !!value)} />
                                    </td>
                                    <td className="px-3 py-1 text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Clone slab" onClick={() => duplicateSlab(orderItem.id, slab.id)}>
                                          <Copy />
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Remove slab" onClick={() => updateProductDraft(orderItem.id, (current) => ({ ...current, slabs: current.slabs.filter((entry) => entry.id !== slab.id), error: '' }))}>
                                          <Trash2 className="text-destructive" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {draft.error && <p className="text-sm text-destructive" role="alert">{draft.error}</p>}
                        {productSummary && (
                          <p className="text-right text-sm font-semibold">
                            Product value: ₹{productSummary.itemSubtotal.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}
          </div>

          {selectedOrder && items.length === 0 && (
            <p className="text-sm text-muted-foreground">Add at least one slab measurement to a product to create this receipt.</p>
          )}

          {items.length > 0 && (
            <>
              <div className="flex items-center justify-end gap-4 border-t pt-4">
                <Label className="text-sm font-semibold">Less Adjustment</Label>
                <Input
                  className="w-40 text-right"
                  type="number"
                  min="0"
                  step="0.01"
                  value={adjustment}
                  onChange={(event) => setAdjustment(event.target.value)}
                  placeholder="0"
                />
              </div>
              {gstCalculationMode === 'PRODUCT' && (
                <p className="text-right text-xs text-muted-foreground">
                  This receipt-wide adjustment is allocated across products by their granite value.
                </p>
              )}
              <div className="flex items-center justify-end gap-4">
                <Label className="text-base font-bold">Net Total Granite Value</Label>
                <p className="text-lg font-bold text-primary">₹{graniteCalc.netTotal.toLocaleString()}</p>
              </div>
            </>
          )}
        </div>

        {/* Section 2: GST Bill Calculation */}
        {items.length > 0 && (
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-lg font-semibold">2. GST Bill Calculation</h3>
            {gstCalculationMode === 'OVERALL' ? (
              <>
                <p className="text-sm text-muted-foreground">Enter one GST invoice value for all products.</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">GST Invoice Sqft</Label>
                    <Input type="number" min="0" step="0.001" value={gstInvoiceSqft} onChange={(event) => setGstInvoiceSqft(event.target.value)} placeholder="0" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">GST Invoice Rate (₹/sqft)</Label>
                    <Input type="number" min="0" step="0.01" value={gstInvoiceRate} onChange={(event) => setGstInvoiceRate(event.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Base Value</Label>
                    <p className="py-2 text-lg font-bold">₹{Number(graniteCalc.gstInvoiceBaseValue ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">GST @ {gstPct}%</Label>
                    <p className="py-2 text-lg font-bold">₹{Number(graniteCalc.gstInvoiceGst ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">GST Invoice Total</Label>
                    <p className="py-2 text-lg font-bold text-primary">₹{Number(graniteCalc.gstInvoiceTotal ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">GST is entered in each product section; this table shows the combined bill.</p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Product</th>
                        <th className="px-3 py-2 text-right font-medium">Invoice Sqft</th>
                        <th className="px-3 py-2 text-right font-medium">Rate</th>
                        <th className="px-3 py-2 text-right font-medium">Base</th>
                        <th className="px-3 py-2 text-right font-medium">GST</th>
                        <th className="px-3 py-2 text-right font-medium">Bill Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const line = graniteCalc.billingLines[index]
                        return (
                          <tr key={item.purchaseOrderItemId} className="border-b last:border-0">
                            <td className="px-3 py-2">{item.productName}</td>
                            <td className="px-3 py-2 text-right">{Number(line.gstInvoiceSqft ?? 0).toFixed(3)}</td>
                            <td className="px-3 py-2 text-right">₹{Number(line.gstInvoiceRate ?? 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">₹{Number(line.gstInvoiceBaseValue ?? 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">₹{Number(line.gstInvoiceGst ?? 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-semibold">₹{Number(line.gstInvoiceTotal ?? 0).toLocaleString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-semibold">
                        <td className="px-3 py-2">Total</td>
                        <td className="px-3 py-2 text-right">{Number(graniteCalc.gstInvoiceSqft ?? 0).toFixed(3)}</td>
                        <td />
                        <td className="px-3 py-2 text-right">₹{Number(graniteCalc.gstInvoiceBaseValue ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">₹{Number(graniteCalc.gstInvoiceGst ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-primary">₹{Number(graniteCalc.gstInvoiceTotal ?? 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Section 3: Cash Portion */}
        {items.length > 0 && (
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-lg font-semibold">3. Cash Portion</h3>
            {gstCalculationMode === 'PRODUCT' && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Product</th>
                      <th className="px-3 py-2 text-right font-medium">Granite Value</th>
                      <th className="px-3 py-2 text-right font-medium">Adjustment</th>
                      <th className="px-3 py-2 text-right font-medium">GST Bill</th>
                      <th className="px-3 py-2 text-right font-medium">Cash Portion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.purchaseOrderItemId} className="border-b last:border-0">
                        <td className="px-3 py-2">{item.productName}</td>
                        <td className="px-3 py-2 text-right">₹{item.itemSubtotal.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">
                          ₹{(item.itemSubtotal
                            - Number(graniteCalc.billingLines[index].gstInvoiceTotal ?? 0)
                            - Number(graniteCalc.billingLines[index].cashPortion ?? 0)).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right">₹{Number(graniteCalc.billingLines[index].gstInvoiceTotal ?? 0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-semibold">₹{Number(graniteCalc.billingLines[index].cashPortion ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t font-semibold">
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right">₹{graniteCalc.subtotal.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">₹{Number(adjustment || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">₹{Number(graniteCalc.gstInvoiceTotal ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-primary">₹{Number(graniteCalc.cashPortion ?? 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {gstCalculationMode === 'OVERALL' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Net Total Granite Value</Label>
                  <p className="text-lg font-bold">₹{graniteCalc.netTotal.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Less: GST Invoice Total</Label>
                  <p className="text-lg font-bold">₹{Number(graniteCalc.gstInvoiceTotal ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cash Portion</Label>
                  <p className="text-lg font-bold text-primary">₹{Number(graniteCalc.cashPortion ?? 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Expenses as Items */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-lg font-semibold">4. Expenses</h3>
          <p className="text-sm text-muted-foreground">Itemized expenses for this receipt</p>

          <div className="rounded-lg border p-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Category <span className="text-destructive">*</span></Label>
                <Select value={expCategoryId} onValueChange={setExpCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Amount <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Mode</Label>
                <Select value={expPaymentMode} onValueChange={setExpPaymentMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Remarks</Label>
                <Input value={expRemarks} onChange={(e) => setExpRemarks(e.target.value)} placeholder="Optional" />
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" size="sm" onClick={handleAddExpense} disabled={!expCategoryId || !expAmount}>
                  <Plus className="mr-1 h-3 w-3" /> Add
                </Button>
              </div>
            </div>
          </div>

          {expenses.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Category</th>
                    <th className="px-4 py-2 text-right font-medium">Amount (₹)</th>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Payment Mode</th>
                    <th className="px-4 py-2 text-left font-medium">Reference</th>
                    <th className="px-4 py-2 text-left font-medium">Remarks</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-4 py-2">{exp.categoryName}</td>
                      <td className="px-4 py-2 text-right font-medium">₹{exp.amount.toLocaleString()}</td>
                      <td className="px-4 py-2">{formatDateTime(exp.expenseDate)}</td>
                      <td className="px-4 py-2">{exp.paymentMode || '-'}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{exp.referenceNumber || '-'}</td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">{exp.remarks || '-'}</td>
                      <td className="px-4 py-2 text-right">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveExpense(index)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="px-4 py-2">Total Expenses</td>
                    <td className="px-4 py-2 text-right">₹{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</td>
                    <td colSpan={5}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Remarks</Label>
          <textarea className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={remarks} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)} placeholder="Optional remarks" />
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="rounded-lg border bg-muted/10 p-4">
            <h3 className="text-lg font-semibold mb-2">Summary</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <div>
                <Label className="text-xs text-muted-foreground">Net Total Granite Value</Label>
                <p className="text-lg font-bold">₹{graniteCalc.netTotal.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">GST Invoice Total (Bill Payment)</Label>
                <p className="text-lg font-bold">₹{Number(graniteCalc.gstInvoiceTotal ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cash Payment</Label>
                <p className="text-lg font-bold">₹{Number(graniteCalc.cashPortion ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total Sq Ft / Slabs</Label>
                <p className="text-lg font-bold">{graniteCalc.totalSqfts.toFixed(3)} / {graniteCalc.totalSlabs}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Measured Sq Ft</Label>
                <p className="text-lg font-bold">{graniteCalc.measuredSqfts.toFixed(3)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/purchase/receipts' })}>
            Cancel
          </Button>
          <Button type="submit" disabled={!purchaseOrderId || items.length === 0 || createReceipt.isPending} className="font-semibold">
            {createReceipt.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              'Create Receipt'
            )}
          </Button>
        </div>
      </form>
      <Dialog
        open={crackDialogOpen}
        onOpenChange={(open) => {
          setCrackDialogOpen(open)
          if (!open) {
            setActiveCrackSlab(null)
            setCrackError('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter crack dimensions</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Crack area is deducted from the slab’s actual sqft.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="receipt-crack-width">Crack Width (in)</Label>
                <Input
                  id="receipt-crack-width"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={crackWidth}
                  onChange={(event) => setCrackWidth(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="receipt-crack-height">Crack Height (in)</Label>
                <Input
                  id="receipt-crack-height"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={crackHeight}
                  onChange={(event) => setCrackHeight(event.target.value)}
                />
              </div>
            </div>
            {crackError && <p className="text-sm text-destructive" role="alert">{crackError}</p>}
            <div className="flex justify-end gap-2">
              {activeCrackSlab && productDrafts[activeCrackSlab.orderItemId]?.slabs
                .find((slab) => slab.id === activeCrackSlab.slabId)?.isCrack && (
                <Button type="button" variant="ghost" onClick={removeActiveCrack}>Remove crack</Button>
              )}
              <Button type="button" variant="outline" onClick={() => setCrackDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={applyCrack}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
