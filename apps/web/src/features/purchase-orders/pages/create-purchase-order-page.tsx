import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePurchaseOrder } from '../hooks/use-purchase-orders'
import { useSuppliers } from '@/features/suppliers/hooks/use-suppliers'
import { useProducts } from '@/features/products/hooks/use-products'

export function CreatePurchaseOrderPage() {
  const navigate = useNavigate()
  const createPO = useCreatePurchaseOrder()
  const { data: suppliersRes } = useSuppliers()
  const { data: productsRes } = useProducts()

  const suppliers = suppliersRes?.data ?? []
  const products = productsRes?.data ?? []

  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [remarks, setRemarks] = useState('')
  const [items, setItems] = useState<{
    productVariantId: number
    productName: string
    orderedQty: number
    unitPrice: number
    amount: number
  }[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedVariant, setSelectedVariant] = useState('')
  const [qty, setQty] = useState('')
  const [unitPrice, setUnitPrice] = useState('')

  const allVariants = products.flatMap((p: any) =>
    (p.variants ?? []).map((v: any) => ({
      ...v,
      productName: p.name,
      categoryId: p.categoryId,
    })),
  )

  const handleAddItem = () => {
    if (!selectedVariant || !qty || !unitPrice) return
    const variant = allVariants.find((v: any) => v.id === Number(selectedVariant))
    if (!variant) return
    const orderedQty = Number(qty)
    const price = Number(unitPrice)
    setItems([...items, {
      productVariantId: variant.id,
      productName: `${variant.productName} - ${variant.skuCode}`,
      orderedQty,
      unitPrice: price,
      amount: orderedQty * price,
    }])
    setSelectedProduct('')
    setSelectedVariant('')
    setQty('')
    setUnitPrice('')
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createPO.mutate({
      supplierId: Number(supplierId),
      expectedDate: expectedDate || undefined,
      remarks: remarks || undefined,
      subtotal,
      grandTotal: subtotal,
      items: items.map((i) => ({
        productVariantId: i.productVariantId,
        orderedQty: i.orderedQty,
        unitPrice: i.unitPrice,
        amount: i.amount,
      })),
    } as any, {
      onSuccess: () => navigate({ to: '/purchase/orders' }),
    })
  }

  const filteredVariants = selectedProduct
    ? allVariants.filter((v: any) => v.productId === Number(selectedProduct))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/purchase/orders' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Purchase Order</h1>
          <p className="text-sm text-muted-foreground">Create a new purchase order to a supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Supplier <span className="text-destructive">*</span></Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Expected Date</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold">Remarks</Label>
          <textarea className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={remarks} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRemarks(e.target.value)} placeholder="Optional remarks" />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Items</h3>

          <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-6">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Product</Label>
              <Select value={selectedProduct} onValueChange={(v) => { setSelectedProduct(v); setSelectedVariant('') }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Variant</Label>
              <Select value={selectedVariant} onValueChange={setSelectedVariant} disabled={!selectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  {filteredVariants.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.skuCode} {v.unit ? `(${v.unit.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Qty</Label>
              <Input type="number" min="0" step="0.001" value={qty} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQty(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unit Price</Label>
              <Input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0" />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={!selectedVariant || !qty || !unitPrice}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2 text-left font-medium">Item</th>
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="px-4 py-2">{item.productName}</td>
                      <td className="px-4 py-2 text-right">{item.orderedQty}</td>
                      <td className="px-4 py-2 text-right">₹{item.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-medium">₹{item.amount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="px-4 py-2" colSpan={3}>Total</td>
                    <td className="px-4 py-2 text-right">₹{subtotal.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/purchase/orders' })}>
            Cancel
          </Button>
          <Button type="submit" disabled={!supplierId || items.length === 0 || createPO.isPending} className="font-semibold">
            {createPO.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              'Create Purchase Order'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
