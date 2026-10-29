import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePurchaseReceipt, useUpdatePurchaseReceipt } from '../hooks/use-purchase-receipts'

export function EditPurchaseReceiptPage() {
  const { id } = useParams({ from: '/purchase/receipts/$id/edit' })
  const navigate = useNavigate()
  const { data: receiptRes, isLoading } = usePurchaseReceipt(Number(id))
  const updateReceipt = useUpdatePurchaseReceipt()

  const receipt = receiptRes?.data

  const [vehicleNumber, setVehicleNumber] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [receivedDate, setReceivedDate] = useState('')
  const [adjustment, setAdjustment] = useState('')
  const [gstInvoiceSqft, setGstInvoiceSqft] = useState('')
  const [gstInvoiceRate, setGstInvoiceRate] = useState('')
  const [billPayment, setBillPayment] = useState('')
  const [cashPayment, setCashPayment] = useState('')
  const [remarks, setRemarks] = useState('')

  useEffect(() => {
    if (receipt) {
      setVehicleNumber(receipt.vehicleNumber ?? '')
      setInvoiceNumber(receipt.invoiceNumber ?? '')
      setReceivedDate(receipt.receivedDate ? receipt.receivedDate.split('T')[0] : '')
      setAdjustment(receipt.adjustment != null ? String(receipt.adjustment) : '')
      setGstInvoiceSqft(receipt.gstInvoiceSqft != null ? String(receipt.gstInvoiceSqft) : '')
      setGstInvoiceRate(receipt.gstInvoiceRate != null ? String(receipt.gstInvoiceRate) : '')
      setBillPayment(receipt.billPayment != null ? String(receipt.billPayment) : '')
      setCashPayment(receipt.cashPayment != null ? String(receipt.cashPayment) : '')
      setRemarks(receipt.remarks ?? '')
    }
  }, [receipt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    updateReceipt.mutate({
      id: Number(id),
      data: {
        vehicleNumber: vehicleNumber || undefined,
        invoiceNumber: invoiceNumber || undefined,
        receivedDate: receivedDate || undefined,
        adjustment: adjustment ? Number(adjustment) : undefined,
        gstInvoiceSqft: gstInvoiceSqft ? Number(gstInvoiceSqft) : undefined,
        gstInvoiceRate: gstInvoiceRate ? Number(gstInvoiceRate) : undefined,
        billPayment: billPayment ? Number(billPayment) : undefined,
        cashPayment: cashPayment ? Number(cashPayment) : undefined,
        remarks: remarks || undefined,
      },
    } as any, {
      onSuccess: () => navigate({ to: `/purchase/receipts/${id}` }),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/purchase/receipts' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-muted-foreground">Purchase receipt not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/purchase/receipts/${id}` })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit {receipt.receiptNumber}</h1>
          <p className="text-sm text-muted-foreground">Update receipt header and billing information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Fields */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-lg font-semibold">Receipt Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Purchase Order</Label>
              <p className="text-sm font-medium text-muted-foreground py-2">
                {receipt.purchaseOrder?.poNumber} - {receipt.purchaseOrder?.supplier?.name}
              </p>
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

        {/* Granite Billing Fields */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-lg font-semibold">Billing & Payment</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Adjustment (₹)</Label>
              <Input type="number" min="0" step="0.01" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">GST Invoice Sqft</Label>
              <Input type="number" min="0" step="0.001" value={gstInvoiceSqft} onChange={(e) => setGstInvoiceSqft(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">GST Invoice Rate (₹/sqft)</Label>
              <Input type="number" min="0" step="0.01" value={gstInvoiceRate} onChange={(e) => setGstInvoiceRate(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subtotal (read-only)</Label>
              <p className="text-lg font-bold py-1">₹{Number(receipt.subtotal ?? 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Bill Payment (GST Invoice)</Label>
              <Input type="number" min="0" step="0.01" value={billPayment} onChange={(e) => setBillPayment(e.target.value)} placeholder="Auto-calculated" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Cash Payment</Label>
              <Input type="number" min="0" step="0.01" value={cashPayment} onChange={(e) => setCashPayment(e.target.value)} placeholder="Auto-calculated" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Net Total</Label>
              <p className="text-lg font-bold py-1 text-primary">₹{Number(receipt.netTotal ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Items (read-only) */}
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-lg font-semibold">Items ({receipt.items?.length ?? 0})</h3>
          <p className="text-sm text-muted-foreground">Items cannot be edited after creation. Create a new receipt to change items.</p>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Item</th>
                  <th className="px-4 py-2 text-left font-medium">Batch</th>
                  <th className="px-4 py-2 text-right font-medium">Received</th>
                  <th className="px-4 py-2 text-right font-medium">Rate</th>
                  <th className="px-4 py-2 text-right font-medium">Buying Price</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items?.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{item.productVariant?.product?.name} ({item.productVariant?.skuCode})</td>
                    <td className="px-4 py-2 font-mono text-xs">{item.batchNo}</td>
                    <td className="px-4 py-2 text-right">{Number(item.receivedQty)}</td>
                    <td className="px-4 py-2 text-right">{item.rate ? `₹${Number(item.rate)}` : '-'}</td>
                    <td className="px-4 py-2 text-right">₹{Number(item.buyingPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Remarks</Label>
          <textarea className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={remarks} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)} placeholder="Optional remarks" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate({ to: `/purchase/receipts/${id}` })}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateReceipt.isPending} className="font-semibold">
            {updateReceipt.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
