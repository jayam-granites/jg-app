import { useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePurchaseOrder } from '../hooks/use-purchase-orders'
import { useLookupOptions, lookupOptionMap, optionColorClasses } from '@/features/masters/hooks/use-lookups'
import { LOOKUP_GROUPS } from '@jg-app/shared'
import { formatDate, formatDateTime } from '@/lib/date'

export function ViewPurchaseOrderPage() {
  const { id } = useParams({ from: '/purchase/orders/$id' })
  const navigate = useNavigate()
  const { data: poRes, isLoading } = usePurchaseOrder(Number(id))
  const { data: statusOptionsRes } = useLookupOptions(LOOKUP_GROUPS.PURCHASE_ORDER_STATUS)
  const po = poRes?.data
  const statusMap = useMemo(
    () => lookupOptionMap(statusOptionsRes?.data?.[LOOKUP_GROUPS.PURCHASE_ORDER_STATUS] ?? []),
    [statusOptionsRes],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!po) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/purchase/orders' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-muted-foreground">Purchase order not found.</p>
      </div>
    )
  }

  const totalQty = po.items?.reduce((sum: number, i: any) => sum + Number(i.orderedQty), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/purchase/orders' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{po.poNumber}</h1>
              <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${optionColorClasses(statusMap.get(po.status))}`}>
                {statusMap.get(po.status)?.label ?? po.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Created {formatDateTime(po.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{po.supplier?.name ?? '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Expected Date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {po.expectedDate ? formatDate(po.expectedDate) : 'Not set'}
            </p>
          </CardContent>
        </Card>
      </div>

      {po.remarks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{po.remarks}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Items ({totalQty} total)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">Product</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {po.items?.map((item: any) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <span className="font-medium">{item.productVariant?.product?.name}</span>
                    <span className="ml-2 text-muted-foreground">({item.productVariant?.skuCode})</span>
                  </td>
                  <td className="px-4 py-2 text-right">{Number(item.orderedQty)}</td>
                  <td className="px-4 py-2 text-right">₹{Number(item.unitPrice).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">₹{Number(item.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td className="px-4 py-2" colSpan={3}>Total</td>
                <td className="px-4 py-2 text-right">
                  ₹{(po.grandTotal ? Number(po.grandTotal) : 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {po.receipts?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {po.receipts.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-mono text-sm font-medium">{r.receiptNumber}</span>
                  <Button variant="outline" size="sm" onClick={() => navigate({ to: `/purchase/receipts/${r.id}` })}>
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
