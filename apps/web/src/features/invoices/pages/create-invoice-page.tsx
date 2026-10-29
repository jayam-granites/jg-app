import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Plus, Save, Trash2, Truck } from 'lucide-react'
import { api } from '@/lib/api'
import { PageLayout } from '@/shared/components/page-layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCustomers, useCustomer, useCreateCustomer, useUpdateCustomer } from '@/features/customers/hooks/use-customers'
import { useMeasurement } from '@/features/measurements/hooks/use-measurements'
import { useProducts } from '@/features/products/hooks/use-products'
import { useTransportProviders, useCreateTransport } from '@/features/transport/hooks/use-transport'
import { useCreateInvoice } from '../hooks/use-invoices'

type InvoiceLine = {
  key: string
  productId?: number
  productVariantId?: number
  name: string
  unitId?: number
  unitCode?: string
  secondaryUnitId?: number
  secondaryUnitCode?: string
  slabCount: number
  sqft: number
  rate: number
  isLoadingApplicable: boolean
}

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Account', label: 'Account' },
]

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function makeKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function productVariant(product: any) {
  return product?.variants?.find((v: any) => v.isActive !== false) ?? product?.variants?.[0]
}

function productRate(product: any) {
  return Number(productVariant(product)?.sellingPrice ?? 0) || 0
}

function variantUnits(product: any) {
  const variant = productVariant(product)
  return {
    productVariantId: variant?.id as number | undefined,
    unitId: variant?.unitId as number | undefined,
    unitCode: (variant?.unit?.code ?? '') as string,
    secondaryUnitId: (variant?.secondaryUnitId ?? undefined) as number | undefined,
    secondaryUnitCode: (variant?.secondaryUnit?.code ?? '') as string,
  }
}

export function CreateInvoicePage() {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { customerId?: number; measurementId?: number }

  const createInvoice = useCreateInvoice()
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const createTransport = useCreateTransport()

  const { data: customersRes } = useCustomers()
  const [customerId, setCustomerId] = useState<number | null>(search.customerId ?? null)
  const { data: customerRes } = useCustomer(customerId)
  const { data: measurementRes } = useMeasurement(search.measurementId ?? null)
  const { data: productsRes } = useProducts()
  const { data: transportRes } = useTransportProviders()
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.accounts.$get()
      return res.json()
    },
  })

  const customers = customersRes?.data ?? []
  const products = productsRes?.data ?? []
  const transportProviders = transportRes?.data ?? []
  const measurement = measurementRes?.data
  const customer = customerRes?.data

  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [loadingRate, setLoadingRate] = useState('6')
  const [isGst, setIsGst] = useState(false)
  const [isHalfGst, setIsHalfGst] = useState(false)
  const [transportEnabled, setTransportEnabled] = useState(false)
  const [transportProviderId, setTransportProviderId] = useState('')
  const [transportAmount, setTransportAmount] = useState('')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [accountId, setAccountId] = useState('')
  const [remarks, setRemarks] = useState('')

  const [addItemOpen, setAddItemOpen] = useState(false)
  const [manualProductId, setManualProductId] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualSlabs, setManualSlabs] = useState('')
  const [manualSqft, setManualSqft] = useState('')
  const [manualRate, setManualRate] = useState('')

  const manualProduct = manualProductId
    ? products.find((p: any) => p.id === Number(manualProductId))
    : undefined
  const manualUnits = variantUnits(manualProduct)

  const [customerOpen, setCustomerOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerMobile, setNewCustomerMobile] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [editAddress, setEditAddress] = useState('')

  const [transportOpen, setTransportOpen] = useState(false)
  const [newTransportName, setNewTransportName] = useState('')
  const [newTransportMobile, setNewTransportMobile] = useState('')
  const [newTransportVehicle, setNewTransportVehicle] = useState('')

  const prefilledMeasurement = useRef<string | null>(null)
  const contactSeed = useRef('')

  useEffect(() => {
    const key = `${customerId ?? ''}-${measurement?.id ?? ''}`
    if (contactSeed.current === key) return
    if (customerId && !customer) return
    contactSeed.current = key
    setEditMobile(customer?.mobile || measurement?.phone || '')
    setEditAddress(customer?.address || measurement?.address || '')
  }, [customerId, customer, measurement])

  useEffect(() => {
    if (!measurement || !productsRes) return
    if (prefilledMeasurement.current === String(measurement.id)) return
    prefilledMeasurement.current = String(measurement.id)

    const productMap = new Map<number, any>(products.map((p: any) => [p.id, p]))
    const groups = new Map<number, { name: string; slabCount: number; sqft: number }>()

    for (const slab of measurement.slabs ?? []) {
      const productId = Number(slab.productId)
      const existing = groups.get(productId) ?? {
        name: slab.product?.name ?? productMap.get(productId)?.name ?? `Product #${productId}`,
        slabCount: 0,
        sqft: 0,
      }
      existing.slabCount += 1
      existing.sqft += Number(slab.area ?? 0)
      groups.set(productId, existing)
    }

    setLines(
      Array.from(groups.entries()).map(([productId, group]) => {
        const product = productMap.get(productId)
        return {
          key: makeKey(),
          productId,
          ...variantUnits(product),
          name: group.name,
          slabCount: group.slabCount,
          sqft: round2(group.sqft),
          rate: productRate(product),
          isLoadingApplicable: true,
        }
      }),
    )
  }, [measurement, productsRes, products])

  const totals = useMemo(() => {
    const subtotal = round2(lines.reduce((sum, line) => sum + line.sqft * line.rate, 0))
    const loadingSqft = lines
      .filter((line) => line.isLoadingApplicable)
      .reduce((sum, line) => sum + line.sqft, 0)
    const loadingAmount = round2((Number(loadingRate) || 0) * loadingSqft)
    const transportCharge = transportEnabled ? Number(transportAmount) || 0 : 0
    const totalBeforeTax = round2(subtotal + loadingAmount + transportCharge)
    const gstPercent = 18
    const taxableAmount = isGst ? round2(isHalfGst ? totalBeforeTax / 2 : totalBeforeTax) : 0
    const cgstAmount = round2(taxableAmount * 0.09)
    const sgstAmount = round2(taxableAmount * 0.09)
    const totalTaxAmount = round2(cgstAmount + sgstAmount)
    const totalBeforeRound = round2(totalBeforeTax + totalTaxAmount)
    const roundOffAmount = round2(Math.ceil(totalBeforeRound) - totalBeforeRound)
    const grandTotal = round2(totalBeforeRound + roundOffAmount)
    const received = round2(Number(receivedAmount) || 0)
    const balanceAmount = round2(grandTotal - received)
    const paymentStatus = received <= 0 ? 'PENDING' : balanceAmount <= 0.01 ? 'PAID' : 'PARTIAL_PAID'
    const totalSlabs = lines.reduce((sum, line) => sum + line.slabCount, 0)
    const totalSqft = round2(lines.reduce((sum, line) => sum + line.sqft, 0))

    return {
      subtotal,
      loadingSqft: round2(loadingSqft),
      loadingAmount,
      transportCharge,
      totalBeforeTax,
      gstPercent,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      totalTaxAmount,
      roundOffAmount,
      grandTotal,
      received,
      balanceAmount,
      paymentStatus,
      totalSlabs,
      totalSqft,
    }
  }, [lines, loadingRate, transportEnabled, transportAmount, isGst, isHalfGst, receivedAmount])

  function updateLine(key: string, patch: Partial<InvoiceLine>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((line) => line.key !== key))
  }

  function resetManualForm() {
    setManualProductId('')
    setManualName('')
    setManualSlabs('')
    setManualSqft('')
    setManualRate('')
  }

  function handleManualProductChange(value: string) {
    setManualProductId(value)
    const product = products.find((p: any) => p.id === Number(value))
    if (product) {
      setManualName(product.name)
      setManualRate(productRate(product) ? String(productRate(product)) : '')
    }
  }

  function addManualItem() {
    const name = manualName.trim()
    const sqft = Number(manualSqft) || 0
    if (!name || sqft <= 0) return

    const product = manualProductId
      ? products.find((p: any) => p.id === Number(manualProductId))
      : undefined
    setLines((prev) => [
      ...prev,
      {
        key: makeKey(),
        productId: manualProductId ? Number(manualProductId) : undefined,
        ...variantUnits(product),
        name,
        slabCount: Number(manualSlabs) || 0,
        sqft,
        rate: Number(manualRate) || 0,
        isLoadingApplicable: true,
      },
    ])
    setAddItemOpen(false)
    resetManualForm()
  }

  async function saveCustomer() {
    const name = newCustomerName.trim()
    if (!name) return
    const res: any = await createCustomer.mutateAsync({
      name,
      mobile: newCustomerMobile.trim() || undefined,
      address: newCustomerAddress.trim() || undefined,
    })
    if (res?.data?.id) setCustomerId(Number(res.data.id))
    setCustomerOpen(false)
    setNewCustomerName('')
    setNewCustomerMobile('')
    setNewCustomerAddress('')
  }

  async function saveTransportProvider() {
    const name = newTransportName.trim()
    if (!name) return
    const res: any = await createTransport.mutateAsync({
      name,
      mobile: newTransportMobile.trim() || undefined,
      vehicleNumber: newTransportVehicle.trim() || undefined,
    })
    if (res?.data?.id) setTransportProviderId(String(res.data.id))
    setTransportOpen(false)
    setNewTransportName('')
    setNewTransportMobile('')
    setNewTransportVehicle('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId) {
      alert('Please select or add a customer')
      return
    }
    if (lines.length === 0) {
      alert('Please add at least one product')
      return
    }
    if (transportEnabled && !transportProviderId) {
      alert('Please select a transport provider')
      return
    }

    if (customer) {
      const data: { mobile?: string; address?: string } = {}
      if (editMobile.trim() !== (customer.mobile || '')) data.mobile = editMobile.trim()
      if (editAddress.trim() !== (customer.address || '')) data.address = editAddress.trim()
      if (Object.keys(data).length > 0) {
        try {
          await updateCustomer.mutateAsync({ id: Number(customer.id), data })
        } catch (error: any) {
          alert(error?.message || 'Failed to update customer details')
          return
        }
      }
    }

    createInvoice.mutate(
      {
        customerId,
        invoiceDate: new Date().toISOString(),
        isGst,
        isHalfGst,
        gstPercent: 18,
        loadingRate: Number(loadingRate) || 0,
        receivedAmount: totals.received,
        paymentMethod,
        accountId: accountId ? Number(accountId) : undefined,
        remarks: remarks || undefined,
        transport:
          transportEnabled && transportProviderId
            ? {
                transportProviderId: Number(transportProviderId),
                vehicleNumber:
                  transportProviders.find((provider: any) => provider.id === Number(transportProviderId))
                    ?.vehicleNumber || undefined,
                amount: Number(transportAmount) || 0,
              }
            : undefined,
        items: lines.map((line) => ({
          itemType: 'PRODUCT',
          productVariantId: line.productVariantId,
          unitId: line.unitId,
          secondaryUnitId: line.secondaryUnitId,
          description: line.name,
          qty: line.sqft,
          slabCount: line.slabCount,
          isLoadingApplicable: line.isLoadingApplicable,
          rate: line.rate,
          amount: round2(line.sqft * line.rate),
        })),
      } as any,
      {
        onSuccess: (res: any) => {
          navigate({ to: '/invoices/$id', params: { id: String(res.data.id) } })
        },
        onError: (err: any) => alert(err?.message || 'Failed to create invoice'),
      },
    )
  }

  const statusLabel =
    totals.paymentStatus === 'PAID'
      ? 'Fully Paid'
      : totals.paymentStatus === 'PARTIAL_PAID'
        ? 'Partially Paid'
        : 'Yet to Pay'

  return (
    <PageLayout
      title="Create Invoice"
      description={
        measurement
          ? `Converted from measurement ${measurement.measurementNumber}`
          : 'Create a sales invoice'
      }
      action={
        <Button variant="outline" size="sm" onClick={() => navigate({ to: '/invoices' })} className="rounded-lg">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Customer</Label>
              <div className="flex gap-2">
                <Select
                  value={customerId ? String(customerId) : ''}
                  onValueChange={(value) => setCustomerId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                        {c.mobile ? ` · ${c.mobile}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setCustomerOpen(true)} title="Add customer">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-phone" className="text-sm font-semibold">Phone</Label>
              <Input
                id="invoice-phone"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                placeholder="Enter phone number"
                disabled={!customerId}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-address" className="text-sm font-semibold">Address</Label>
              <Input
                id="invoice-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Enter address"
                disabled={!customerId}
              />
            </div>
          </div>
          {measurement && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-muted/30 px-3 py-2 text-sm">
              <span>Measurement: <strong className="font-mono">{measurement.measurementNumber}</strong></span>
              <span>Total units: <strong>{totals.totalSqft.toFixed(2)}</strong></span>
              <span>Total secondary: <strong>{totals.totalSlabs}</strong></span>
            </div>
          )}
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="text-base font-semibold">Products</h3>
              <p className="text-xs text-muted-foreground">Price is editable per product. Loading applies only to checked products.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setAddItemOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Product
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs font-medium">Product / Granite</TableHead>
                <TableHead className="w-28 text-xs font-medium text-right">Unit</TableHead>
                <TableHead className="w-28 text-xs font-medium text-right">Secondary Unit</TableHead>
                <TableHead className="w-32 text-xs font-medium text-right">Rate (₹)</TableHead>
                <TableHead className="w-32 text-xs font-medium text-right">Total Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                    Add a product or convert a measurement to start.
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.key}>
                    <TableCell>
                      <div className="font-medium">{line.name}</div>
                      <label className="mt-1 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                        <Checkbox
                          checked={line.isLoadingApplicable}
                          onCheckedChange={(checked) =>
                            updateLine(line.key, { isLoadingApplicable: checked === true })
                          }
                        />
                        Add loading/unloading
                      </label>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {line.sqft.toFixed(2)}
                      {line.unitCode ? ` ${line.unitCode}` : ''}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {line.slabCount && (line.secondaryUnitId || !line.unitId)
                        ? `${line.slabCount}${line.secondaryUnitCode ? ` ${line.secondaryUnitCode}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.rate || ''}
                        onChange={(e) => updateLine(line.key, { rate: Number(e.target.value) || 0 })}
                        className="h-8 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {round2(line.sqft * line.rate).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground/60 hover:text-destructive"
                        onClick={() => removeLine(line.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-4 space-y-4">
            <h3 className="text-base font-semibold">Charges</h3>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Loading / Unloading (₹ per unit)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={loadingRate}
                onChange={(e) => setLoadingRate(e.target.value)}
                className="max-w-40"
              />
              <p className="text-xs text-muted-foreground">
                {totals.loadingSqft.toFixed(2)} units selected · ₹{totals.loadingAmount.toFixed(2)} loading charge
              </p>
            </div>

            <div className="space-y-3 border-t pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <Checkbox checked={transportEnabled} onCheckedChange={(checked) => setTransportEnabled(checked === true)} />
                <Truck className="h-4 w-4" /> Add transport charge
              </label>
              {transportEnabled && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Transport Provider</Label>
                    <Select
                      value={transportProviderId}
                      onValueChange={(value) => {
                        if (value === '__add__') {
                          setTransportOpen(true)
                          return
                        }
                        setTransportProviderId(value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {transportProviders.map((provider: any) => (
                          <SelectItem key={provider.id} value={String(provider.id)}>
                            {provider.name}
                            {provider.vehicleNumber ? ` · ${provider.vehicleNumber}` : ''}
                          </SelectItem>
                        ))}
                        <SelectItem value="__add__">+ Add new provider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Transport Charge (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={transportAmount}
                      onChange={(e) => setTransportAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">GST</h3>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox checked={isGst} onCheckedChange={(checked) => setIsGst(checked === true)} />
                Enable GST
              </label>
            </div>
            {isGst && (
              <>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={isHalfGst}
                    onCheckedChange={(checked) => setIsHalfGst(checked === true)}
                  />
                  Half GST (apply 18% on 50% of bill)
                </label>
                <div className="space-y-1.5 rounded-lg bg-muted/30 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST taxable amount</span>
                    <span className="font-mono">₹{totals.taxableAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CGST @ 9%</span>
                    <span className="font-mono">₹{totals.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SGST @ 9%</span>
                    <span className="font-mono">₹{totals.sgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total GST</span>
                    <span className="font-mono">₹{totals.totalTaxAmount.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Payment</h3>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{statusLabel}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Received Amount (₹)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    placeholder="0"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReceivedAmount(String(totals.grandTotal))}
                  >
                    Full
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Receive Into Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
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
            </div>
            <div className="flex justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-mono font-semibold">₹{totals.balanceAmount.toFixed(2)}</span>
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Products subtotal</span>
              <span className="font-mono">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Loading / unloading</span>
              <span className="font-mono">₹{totals.loadingAmount.toFixed(2)}</span>
            </div>
            {transportEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transport</span>
                <span className="font-mono">₹{totals.transportCharge.toFixed(2)}</span>
              </div>
            )}
            {isGst && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST {isHalfGst ? '(half GST)' : ''}</span>
                <span className="font-mono">₹{totals.totalTaxAmount.toFixed(2)}</span>
              </div>
            )}
            {totals.roundOffAmount > 0.001 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Round Off</span>
                <span className="font-mono">+ ₹{totals.roundOffAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Grand Total</span>
              <span className="font-mono">₹{totals.grandTotal.toFixed(2)}</span>
            </div>
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">Remarks</Label>
              <textarea
                className="flex min-h-[54px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks"
              />
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/invoices' })}>
            Cancel
          </Button>
          <Button type="submit" disabled={createInvoice.isPending} className="font-semibold">
            {createInvoice.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Create Invoice</>
            )}
          </Button>
        </div>
      </form>

      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Pick an existing product or enter a custom product.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Existing Product</Label>
              <Select value={manualProductId} onValueChange={handleManualProductChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product: any) => (
                    <SelectItem key={product.id} value={String(product.id)}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Product Name</Label>
              <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Product / granite name" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Unit Qty{manualUnits.unitCode ? ` (${manualUnits.unitCode})` : ''}
                </Label>
                <Input type="number" min="0" step="0.01" value={manualSqft} onChange={(e) => setManualSqft(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Secondary Qty
                  {manualUnits.secondaryUnitCode ? ` (${manualUnits.secondaryUnitCode})` : ''}
                </Label>
                <Input type="number" min="0" value={manualSlabs} onChange={(e) => setManualSlabs(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Rate{manualUnits.unitCode ? ` / ${manualUnits.unitCode}` : ''}
                </Label>
                <Input type="number" min="0" step="0.01" value={manualRate} onChange={(e) => setManualRate(e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
            <Button type="button" onClick={addManualItem} disabled={!manualName.trim() || Number(manualSqft) <= 0}>
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={newCustomerMobile} onChange={(e) => setNewCustomerMobile(e.target.value)} placeholder="Phone" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} placeholder="Address" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCustomerOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveCustomer} disabled={!newCustomerName.trim() || createCustomer.isPending}>
              {createCustomer.isPending ? 'Saving...' : 'Save Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transportOpen} onOpenChange={setTransportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Transport Provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input value={newTransportName} onChange={(e) => setNewTransportName(e.target.value)} placeholder="Provider name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mobile</Label>
              <Input value={newTransportMobile} onChange={(e) => setNewTransportMobile(e.target.value)} placeholder="Mobile" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vehicle Number</Label>
              <Input value={newTransportVehicle} onChange={(e) => setNewTransportVehicle(e.target.value.toUpperCase())} placeholder="Vehicle number" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTransportOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveTransportProvider} disabled={!newTransportName.trim() || createTransport.isPending}>
              {createTransport.isPending ? 'Saving...' : 'Save Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
