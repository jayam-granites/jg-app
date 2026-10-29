import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Package, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePurchaseReceipt, useDeletePurchaseReceipt } from '../hooks/use-purchase-receipts'
import { useAppSettings } from '@/features/masters/hooks/use-lookups'
import { SETTINGS_KEYS } from '@jg-app/shared'
import { formatDateTime } from '@/lib/date'

export function ViewPurchaseReceiptPage() {
  const { id } = useParams({ from: '/purchase/receipts/$id' })
  const navigate = useNavigate()
  const { data: receiptRes, isLoading } = usePurchaseReceipt(Number(id))
  const { data: settingsRes } = useAppSettings()
  const deleteReceipt = useDeletePurchaseReceipt()
  const receipt = receiptRes?.data
  const gstPct = Number(settingsRes?.data?.[SETTINGS_KEYS.INVOICE_GST_PERCENT]) || 18

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this purchase receipt?')) {
      deleteReceipt.mutate(Number(id), {
        onSuccess: () => navigate({ to: '/purchase/receipts' }),
      })
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/purchase/receipts' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{receipt.receiptNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Received {formatDateTime(receipt.receivedDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate({ to: `/purchase/receipts/${id}/edit` })}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteReceipt.isPending}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Receipt Header */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground">Purchase Order</CardTitle></CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{receipt.purchaseOrder?.poNumber ?? '-'}</p>
            <p className="text-sm text-muted-foreground">{receipt.purchaseOrder?.supplier?.name ?? ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground">Vehicle Number</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-medium">{receipt.vehicleNumber ?? '-'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground">Supplier Invoice</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-medium">{receipt.invoiceNumber ?? '-'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground">Total Sq Ft / Slabs</CardTitle></CardHeader>
          <CardContent><p className="text-lg font-medium">{Number(receipt.totalSqfts ?? 0).toFixed(3)} / {receipt.totalSlabs ?? 0}</p></CardContent>
        </Card>
      </div>

      {receipt.remarks && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-muted-foreground">Remarks</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{receipt.remarks}</p></CardContent>
        </Card>
      )}

      {/* Section 1: Granite Value Calculation */}
      <Card>
        <CardHeader><CardTitle className="text-lg font-semibold">1. Granite Value Calculation</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">Part</th>
                <th className="px-4 py-2 text-left font-medium">Batch</th>
                <th className="px-4 py-2 text-right font-medium">Sqft</th>
                <th className="px-4 py-2 text-right font-medium">Rate (₹/sqft)</th>
                <th className="px-4 py-2 text-right font-medium">Amount (₹)</th>
                <th className="px-4 py-2 text-right font-medium">Slabs</th>
                <th className="px-4 py-2 text-right font-medium">Inventory</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items?.map((item: any) => {
                const itemSqft = item.slabs?.reduce((s: number, sl: any) => s + Number(sl.sqft ?? 0), 0) || 0
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">
                      {item.productVariant?.product?.name}
                      <span className="ml-1 text-muted-foreground text-xs">({item.productVariant?.skuCode})</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{item.batchNo}</td>
                    <td className="px-4 py-2 text-right">{itemSqft > 0 ? itemSqft.toFixed(3) : Number(item.receivedQty)}</td>
                    <td className="px-4 py-2 text-right">{item.rate ? `₹${Number(item.rate)}` : '-'}</td>
                    <td className="px-4 py-2 text-right font-medium">₹{Number(item.receivedQty).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{item.slabCount ?? item.slabs?.length ?? 0}</td>
                    <td className="px-4 py-2 text-right">
                      {item.inventoryBatch ? (
                        <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => navigate({ to: `/inventory/${item.inventoryBatch.id}` })}>
                          <Package className="h-3 w-3" /> View
                        </Button>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="px-4 py-2" colSpan={2}>Total</td>
                <td className="px-4 py-2 text-right">{Number(receipt.totalSqfts ?? 0).toFixed(3)}</td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2 text-right">₹{Number(receipt.subtotal ?? 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{receipt.totalSlabs ?? 0}</td>
                <td></td>
              </tr>
              {Number(receipt.adjustment ?? 0) > 0 && (
                <tr className="text-muted-foreground">
                  <td className="px-4 py-2" colSpan={4}>Less Adjustment</td>
                  <td className="px-4 py-2 text-right">- ₹{Number(receipt.adjustment).toLocaleString()}</td>
                  <td colSpan={2}></td>
                </tr>
              )}
              <tr className="border-t-2 font-bold text-primary">
                <td className="px-4 py-2" colSpan={4}>Net Total Granite Value</td>
                <td className="px-4 py-2 text-right">₹{Number(receipt.netTotal ?? 0).toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Slab Measurements */}
      {receipt.items?.some((item: any) => item.slabs?.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">Slab Measurements</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-medium">Part</th>
                  <th className="px-4 py-2 text-left font-medium">Slab No</th>
                  <th className="px-4 py-2 text-right font-medium">Width (in)</th>
                  <th className="px-4 py-2 text-right font-medium">Height (in)</th>
                  <th className="px-4 py-2 text-right font-medium">Thickness (in)</th>
                  <th className="px-4 py-2 text-right font-medium">Sq Ft</th>
                  <th className="px-4 py-2 text-center font-medium">Crack</th>
                  <th className="px-4 py-2 text-center font-medium">Broken</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items?.map((item: any) =>
                  item.slabs?.map((slab: any) => (
                    <tr key={slab.id} className="border-b last:border-0">
                      <td className="px-4 py-2 text-xs text-muted-foreground">{item.productVariant?.product?.name}</td>
                      <td className="px-4 py-2 font-mono text-sm">{slab.serialNo ?? '-'}</td>
                      <td className="px-4 py-2 text-right">{slab.width ?? '-'}</td>
                      <td className="px-4 py-2 text-right">{slab.length ?? '-'}</td>
                      <td className="px-4 py-2 text-right">{slab.thickness ?? '-'}</td>
                      <td className="px-4 py-2 text-right">{slab.sqft ?? '-'}</td>
                      <td className="px-4 py-2 text-center">{slab.isCrack ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2 text-center">{slab.isBroken ? 'Yes' : 'No'}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Section 2: GST Bill Calculation */}
      {Number(receipt.gstInvoiceTotal ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">2. GST Bill Calculation</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label className="text-xs text-muted-foreground">GST Invoice Sqft</Label>
                <p className="text-lg font-bold">{Number(receipt.gstInvoiceSqft ?? 0).toFixed(3)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Rate (₹/sqft)</Label>
                <p className="text-lg font-bold">₹{Number(receipt.gstInvoiceRate ?? 0)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Base Value</Label>
                <p className="text-lg font-bold">₹{Number(receipt.gstInvoiceBaseValue ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">GST @ {gstPct}%</Label>
                <p className="text-lg font-bold">₹{Number(receipt.gstInvoiceGst ?? 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex justify-end border-t pt-3">
              <div className="text-right">
                <Label className="text-xs text-muted-foreground">GST Invoice Total</Label>
                <p className="text-2xl font-bold text-primary">₹{Number(receipt.gstInvoiceTotal ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Cash Portion */}
      {Number(receipt.cashPortion ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">3. Cash Portion</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Net Total Granite Value</Label>
                <p className="text-lg font-bold">₹{Number(receipt.netTotal ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Less: GST Invoice Value</Label>
                <p className="text-lg font-bold">₹{Number(receipt.gstInvoiceTotal ?? 0).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cash Portion</Label>
                <p className="text-lg font-bold text-primary">₹{Number(receipt.cashPortion ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Expenses */}
      {receipt.expenses?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">4. Expenses</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-medium">Expense #</th>
                  <th className="px-4 py-2 text-left font-medium">Category</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-right font-medium">Amount (₹)</th>
                  <th className="px-4 py-2 text-left font-medium">Payment Mode</th>
                  <th className="px-4 py-2 text-left font-medium">Reference</th>
                  <th className="px-4 py-2 text-left font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {receipt.expenses?.map((exp: any) => (
                  <tr key={exp.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{exp.expenseNumber}</td>
                    <td className="px-4 py-2">{exp.category?.name ?? '-'}</td>
                    <td className="px-4 py-2">{formatDateTime(exp.expenseDate)}</td>
                    <td className="px-4 py-2 text-right font-medium">₹{Number(exp.amount).toLocaleString()}</td>
                    <td className="px-4 py-2">{exp.paymentMode ?? '-'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{exp.referenceNumber ?? '-'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{exp.remarks ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="px-4 py-2" colSpan={3}>Total Expenses</td>
                  <td className="px-4 py-2 text-right">₹{receipt.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0).toLocaleString()}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      <Card>
        <CardHeader><CardTitle className="text-lg font-semibold">Payment Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Bill Payment (GST Invoice)</Label>
              <p className="text-lg font-bold">₹{Number(receipt.billPayment ?? receipt.gstInvoiceTotal ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cash Payment</Label>
              <p className="text-lg font-bold">₹{Number(receipt.cashPayment ?? receipt.cashPortion ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Paid</Label>
              <p className="text-lg font-bold text-primary">
                ₹{((Number(receipt.billPayment ?? receipt.gstInvoiceTotal ?? 0)) + (Number(receipt.cashPayment ?? receipt.cashPortion ?? 0))).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {receipt.expenses?.length > 0 && (
        <div className="text-xs text-muted-foreground text-right">
          Note: Expenses are distributed across items for landing price calculation.
        </div>
      )}
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm font-medium ${className ?? ''}`}>{children}</p>
}
