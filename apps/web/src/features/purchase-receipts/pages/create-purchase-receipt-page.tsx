import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePurchaseReceipt } from '../hooks/use-purchase-receipts'
import { usePurchaseOrders } from '@/features/purchase-orders/hooks/use-purchase-orders'
import { useCategories } from '@/features/masters/hooks/use-masters'
import { useAppSettings, useLookupOptions } from '@/features/masters/hooks/use-lookups'
import { LOOKUP_GROUPS, SETTINGS_KEYS } from '@jg-app/shared'
import { formatDateTime } from '@/lib/date'

type SlabEntry = {
  serialNo: string
  length: number
  width: number
  thickness: number
  sqft: number
  isCrack: boolean
  isBroken: boolean
}

type LineItem = {
  productVariantId: number
  productName: string
  batchNo: string
  receivedQty: number
  slabCount: number
  damagedQty: number
  acceptedQty: number
  rejectedQty: number
  rate: number
  buyingPrice: number
  landingPrice: number
  sellingPriceFrom: number
  sellingPriceTo: number
  widthAllowance: number
  heightAllowance: number
  slabs: SlabEntry[]
  totalSqft: number
  itemSubtotal: number
}

function calcSqft(length: number, width: number): number {
  return Math.round((length * width) / 144 * 1000) / 1000
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function generateBatchNo(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `BAT-${dateStr}-${seq}`
}

const emptySlab = (index: number): SlabEntry => ({
  serialNo: `SLAB-${String(index + 1).padStart(3, '0')}`,
  length: 0,
  width: 0,
  thickness: 0,
  sqft: 0,
  isCrack: false,
  isBroken: false,
})

export function CreatePurchaseReceiptPage() {
  const navigate = useNavigate()
  const createReceipt = useCreatePurchaseReceipt()
  const { data: ordersRes } = usePurchaseOrders()
  const { data: categoriesRes } = useCategories('PURCHASE')
  const { data: settingsRes } = useAppSettings()
  const { data: paymentModeOptionsRes } = useLookupOptions(LOOKUP_GROUPS.PAYMENT_MODE)
  const expenseCategories = categoriesRes?.data ?? []
  const paymentModes = paymentModeOptionsRes?.data?.[LOOKUP_GROUPS.PAYMENT_MODE] ?? []
  const gstPct = Number(settingsRes?.data?.[SETTINGS_KEYS.INVOICE_GST_PERCENT]) || 18
  const gstDecimal = gstPct / 100

  const orders = (ordersRes?.data ?? []).filter(
    (o: any) => o.status !== 'CANCELLED' && o.status !== 'COMPLETED',
  )

  const [purchaseOrderId, setPurchaseOrderId] = useState('')
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0])
  const [remarks, setRemarks] = useState('')
  const [items, setItems] = useState<LineItem[]>([])

  const [selectedPOId, setSelectedPOId] = useState('')
  const [selectedVariant, setSelectedVariant] = useState('')
  const [batchNo, setBatchNo] = useState(generateBatchNo())
  const [receivedQty, setReceivedQty] = useState('')
  const [slabCount, setSlabCount] = useState('')
  const [damagedQty, setDamagedQty] = useState('')
  const [ratePerSqft, setRatePerSqft] = useState('')
  const [buyingPrice, setBuyingPrice] = useState('')
  const [widthAllowance, setWidthAllowance] = useState('')
  const [heightAllowance, setHeightAllowance] = useState('')

  const [slabs, setSlabs] = useState<SlabEntry[]>([])

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

  const selectedOrder = orders.find((o: any) => o.id === Number(selectedPOId))

  const getDefaultBatchNo = () => {
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
    return `BAT-${dateStr}-${seq}`
  }

  const handleSlabCountChange = (val: string) => {
    const count = Number(val) || 0
    setSlabCount(val)
    setSlabs(Array.from({ length: count }, (_, i) => slabs[i] ?? emptySlab(i)))
  }

  const updateSlab = (index: number, field: keyof SlabEntry, value: any) => {
    const updated = slabs.map((s, i) => {
      if (i !== index) return s
      const next = { ...s, [field]: value }
      if ((field === 'length' || field === 'width') && next.length > 0 && next.width > 0) {
        next.sqft = calcSqft(next.length, next.width)
      }
      return next
    })
    setSlabs(updated)
  }

  const removeSlab = (index: number) => {
    const updated = slabs.filter((_, i) => i !== index)
    setSlabs(updated)
    setSlabCount(String(updated.length))
  }

  const calcItemSummary = (slabsList: SlabEntry[], rate: number) => {
    const totalSqft = slabsList.reduce((sum, s) => sum + s.sqft, 0)
    const itemSubtotal = totalSqft > 0 ? round2(totalSqft * rate) : 0
    return { totalSqft, itemSubtotal }
  }

  const handleAddItem = () => {
    if (!selectedVariant || !batchNo || !receivedQty || !buyingPrice) return
    const item = selectedOrder?.items?.find((i: any) => i.productVariantId === Number(selectedVariant))
    const variant = item?.productVariant
    const qty = Number(receivedQty)
    const rate = Number(ratePerSqft) || Number(buyingPrice)
    const { totalSqft, itemSubtotal } = calcItemSummary(slabs, rate)

    setItems([...items, {
      productVariantId: Number(selectedVariant),
      productName: variant ? `${variant.product?.name} - ${variant.skuCode}` : `Variant #${selectedVariant}`,
      batchNo,
      receivedQty: qty,
      slabCount: slabs.length || Number(slabCount) || 0,
      damagedQty: Number(damagedQty) || 0,
      acceptedQty: qty - (Number(damagedQty) || 0),
      rejectedQty: Number(damagedQty) || 0,
      rate,
      buyingPrice: Number(buyingPrice),
      landingPrice: Number(buyingPrice),
      sellingPriceFrom: 0,
      sellingPriceTo: 0,
      widthAllowance: Number(widthAllowance) || 0,
      heightAllowance: Number(heightAllowance) || 0,
      slabs: slabs.length > 0 ? slabs : [],
      totalSqft,
      itemSubtotal,
    }])

    setSelectedVariant('')
    setBatchNo(getDefaultBatchNo())
    setReceivedQty('')
    setSlabCount('')
    setSlabs([])
    setDamagedQty('')
    setRatePerSqft('')
    setBuyingPrice('')
    setWidthAllowance('')
    setHeightAllowance('')
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

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
    const gstSqft = Number(gstInvoiceSqft) || 0
    const gstRate = Number(gstInvoiceRate) || 0
    const gstBaseValue = gstSqft > 0 && gstRate > 0 ? round2(gstSqft * gstRate) : 0
    const gstGst = gstBaseValue > 0 ? round2(gstBaseValue * gstDecimal) : 0
    const netTotal = round2((subtotal - adj) + gstGst)
    const gstTotal = round2(gstBaseValue + gstGst)
    const cashPortion = round2(netTotal - gstTotal)
    const totalSqfts = items.reduce((sum, i) => sum + i.totalSqft, 0)
    const totalSlabs = items.reduce((sum, i) => sum + i.slabs.length, 0)
    return { subtotal, netTotal, gstBaseValue, gstGst, gstTotal, cashPortion, totalSqfts, totalSlabs }
  }, [items, adjustment, gstInvoiceSqft, gstInvoiceRate, gstDecimal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const adj = Number(adjustment) || 0
    const gstSqft = Number(gstInvoiceSqft) || 0
    const gstRate = Number(gstInvoiceRate) || 0
    const gstBaseValue = gstSqft > 0 && gstRate > 0 ? round2(gstSqft * gstRate) : 0
    const gstGst = gstBaseValue > 0 ? round2(gstBaseValue * gstDecimal) : 0
    const gstTotal = round2(gstBaseValue + gstGst)

    createReceipt.mutate({
      purchaseOrderId: Number(purchaseOrderId),
      vehicleNumber: vehicleNumber || undefined,
      invoiceNumber: invoiceNumber || undefined,
      receivedDate: receivedDate || undefined,
      adjustment: adj || undefined,
      gstInvoiceSqft: gstSqft || undefined,
      gstInvoiceRate: gstRate || undefined,
      billPayment: gstTotal || undefined,
      cashPayment: round2(graniteCalc.netTotal - gstTotal) || undefined,
      remarks: remarks || undefined,
      items: items.map((i) => ({
        productVariantId: i.productVariantId,
        batchNo: i.batchNo,
        receivedQty: i.receivedQty,
        slabCount: i.slabCount || undefined,
        damagedQty: i.damagedQty || undefined,
        acceptedQty: i.acceptedQty || undefined,
        rejectedQty: i.rejectedQty || undefined,
        rate: i.rate || undefined,
        buyingPrice: i.buyingPrice,
        landingPrice: i.landingPrice || undefined,
        sellingPriceFrom: i.sellingPriceFrom || undefined,
        sellingPriceTo: i.sellingPriceTo || undefined,
        widthAllowance: i.widthAllowance || undefined,
        heightAllowance: i.heightAllowance || undefined,
        slabs: i.slabs.length > 0 ? i.slabs.map((s) => ({
          serialNo: s.serialNo || undefined,
          length: s.length || undefined,
          width: s.width || undefined,
          thickness: s.thickness || undefined,
          sqft: s.sqft || undefined,
          isCrack: s.isCrack || undefined,
          isBroken: s.isBroken || undefined,
        })) : undefined,
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
              <Select value={purchaseOrderId} onValueChange={(v) => { setPurchaseOrderId(v); setSelectedPOId(v) }}>
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
          <h3 className="text-lg font-semibold">1. Granite Value Calculation</h3>

          {selectedOrder && (
            <div className="rounded-lg border p-3 space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs">Item / Product <span className="text-destructive">*</span></Label>
                  <Select value={selectedVariant} onValueChange={setSelectedVariant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedOrder.items?.map((item: any) => (
                        <SelectItem key={item.id} value={String(item.productVariantId)}>
                          {item.productVariant?.product?.name} - {item.productVariant?.skuCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Batch No</Label>
                  <Input className="h-9" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="Auto" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty <span className="text-destructive">*</span></Label>
                  <Input className="h-9" type="number" min="0" step="0.001" value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Rate (₹/sqft)</Label>
                  <Input className="h-9" type="number" min="0" step="0.01" value={ratePerSqft} onChange={(e) => setRatePerSqft(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Buying Price <span className="text-destructive">*</span></Label>
                  <Input className="h-9" type="number" min="0" step="0.01" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Damaged Qty</Label>
                  <Input className="h-9" type="number" min="0" step="0.001" value={damagedQty} onChange={(e) => setDamagedQty(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Slab Count</Label>
                  <Input className="h-9" type="number" min="0" step="1" value={slabCount} onChange={(e) => handleSlabCountChange(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Width Allowance</Label>
                  <Input className="h-9" type="number" min="0" step="0.01" value={widthAllowance} onChange={(e) => setWidthAllowance(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height Allowance</Label>
                  <Input className="h-9" type="number" min="0" step="0.01" value={heightAllowance} onChange={(e) => setHeightAllowance(e.target.value)} placeholder="0" />
                </div>
              </div>

              {/* Slab Measurements */}
              {slabs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Slab Measurements</Label>
                  <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-3 py-2 text-left font-medium text-xs">Slab No</th>
                          <th className="px-3 py-2 text-right font-medium text-xs">Width (in)</th>
                          <th className="px-3 py-2 text-right font-medium text-xs">Height (in)</th>
                          <th className="px-3 py-2 text-right font-medium text-xs">Thickness (in)</th>
                          <th className="px-3 py-2 text-right font-medium text-xs">Sq Ft</th>
                          <th className="px-3 py-2 text-center font-medium text-xs">Crack</th>
                          <th className="px-3 py-2 text-center font-medium text-xs">Broken</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {slabs.map((slab, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="px-3 py-1">
                              <Input className="h-8 text-xs" value={slab.serialNo} onChange={(e) => updateSlab(idx, 'serialNo', e.target.value)} />
                            </td>
                            <td className="px-3 py-1">
                              <Input className="h-8 text-xs text-right" type="number" min="0" step="0.01" value={slab.width || ''} onChange={(e) => updateSlab(idx, 'width', Number(e.target.value) || 0)} />
                            </td>
                            <td className="px-3 py-1">
                              <Input className="h-8 text-xs text-right" type="number" min="0" step="0.01" value={slab.length || ''} onChange={(e) => updateSlab(idx, 'length', Number(e.target.value) || 0)} />
                            </td>
                            <td className="px-3 py-1">
                              <Input className="h-8 text-xs text-right" type="number" min="0" step="0.01" value={slab.thickness || ''} onChange={(e) => updateSlab(idx, 'thickness', Number(e.target.value) || 0)} />
                            </td>
                            <td className="px-3 py-1">
                              <Input className="h-8 text-xs text-right" type="number" min="0" step="0.001" value={slab.sqft || ''} onChange={(e) => updateSlab(idx, 'sqft', Number(e.target.value) || 0)} />
                            </td>
                            <td className="px-3 py-1 text-center">
                              <Checkbox checked={slab.isCrack} onCheckedChange={(v) => updateSlab(idx, 'isCrack', !!v)} />
                            </td>
                            <td className="px-3 py-1 text-center">
                              <Checkbox checked={slab.isBroken} onCheckedChange={(v) => updateSlab(idx, 'isBroken', !!v)} />
                            </td>
                            <td className="px-3 py-1 text-right">
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSlab(idx)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => { const idx = slabs.length; setSlabs([...slabs, emptySlab(idx)]); setSlabCount(String(slabs.length + 1)) }}>
                  <Plus className="mr-1 h-3 w-3" /> Add Slab
                </Button>
                <Button type="button" variant="default" size="sm" onClick={handleAddItem} disabled={!selectedVariant || !batchNo || !receivedQty || !buyingPrice}>
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </div>
            </div>
          )}

          {/* Items Table */}
          {items.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Part</th>
                    <th className="px-4 py-2 text-left font-medium">Batch</th>
                    <th className="px-4 py-2 text-right font-medium">Sqft</th>
                    <th className="px-4 py-2 text-right font-medium">Rate (₹/sqft)</th>
                    <th className="px-4 py-2 text-right font-medium">Amount (₹)</th>
                    <th className="px-4 py-2 text-right font-medium">Slabs</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{item.productName}</td>
                      <td className="px-4 py-2 font-mono text-xs">{item.batchNo}</td>
                      <td className="px-4 py-2 text-right">{item.totalSqft.toFixed(3)}</td>
                      <td className="px-4 py-2 text-right">{item.rate}</td>
                      <td className="px-4 py-2 text-right font-medium">₹{item.itemSubtotal.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{item.slabs.length || item.slabCount}</td>
                      <td className="px-4 py-2 text-right">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="px-4 py-2" colSpan={2}>Total</td>
                    <td className="px-4 py-2 text-right">{graniteCalc.totalSqfts.toFixed(3)}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2 text-right">₹{graniteCalc.subtotal.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{graniteCalc.totalSlabs}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Adjustment */}
          {items.length > 0 && (
            <div className="flex items-center justify-end gap-4">
              <Label className="text-sm font-semibold">Less Adjustment</Label>
              <Input
                className="w-40 text-right"
                type="number"
                min="0"
                step="0.01"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          {/* Net Total */}
          {items.length > 0 && (
            <div className="flex items-center justify-end gap-4 border-t pt-2">
              <Label className="text-base font-bold">Net Total Granite Value</Label>
              <p className="text-lg font-bold text-primary">₹{graniteCalc.netTotal.toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Section 2: GST Bill Calculation */}
        {items.length > 0 && (
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-lg font-semibold">2. GST Bill Calculation</h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">GST Invoice Sqft</Label>
                <Input type="number" min="0" step="0.001" value={gstInvoiceSqft} onChange={(e) => setGstInvoiceSqft(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">GST Invoice Rate (₹/sqft)</Label>
                <Input type="number" min="0" step="0.01" value={gstInvoiceRate} onChange={(e) => setGstInvoiceRate(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Base Value</Label>
                <p className="text-lg font-bold py-1">₹{graniteCalc.gstBaseValue.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">GST @ {gstPct}%</Label>
                <p className="text-lg font-bold py-1">₹{graniteCalc.gstGst.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t pt-2">
              <Label className="text-base font-bold">GST Invoice Total</Label>
              <p className="text-lg font-bold text-primary">₹{graniteCalc.gstTotal.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Section 3: Cash Portion */}
        {items.length > 0 && (
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-lg font-semibold">3. Cash Portion</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label className="text-xs text-muted-foreground">Net Total Granite Value</Label>
                <p className="text-lg font-bold">₹{graniteCalc.netTotal.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Less: GST Invoice Value</Label>
                <p className="text-lg font-bold">₹{graniteCalc.gstTotal.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cash Portion</Label>
                <p className="text-lg font-bold text-primary">₹{graniteCalc.cashPortion.toLocaleString()}</p>
              </div>
            </div>
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <Label className="text-xs text-muted-foreground">Net Total Granite Value</Label>
                <p className="text-lg font-bold">₹{graniteCalc.netTotal.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">GST Invoice Value (Bill Payment)</Label>
                <p className="text-lg font-bold">₹{graniteCalc.gstTotal.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cash Payment</Label>
                <p className="text-lg font-bold">₹{graniteCalc.cashPortion.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total Sq Ft / Slabs</Label>
                <p className="text-lg font-bold">{graniteCalc.totalSqfts.toFixed(3)} / {graniteCalc.totalSlabs}</p>
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
    </div>
  )
}
