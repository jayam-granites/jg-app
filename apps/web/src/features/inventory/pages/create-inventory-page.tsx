import { useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Copy, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useProducts } from '@/features/products/hooks/use-products'
import { useCreateInventoryBatch } from '../hooks/use-inventory'

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
}

function calcSqft(l: number, w: number) {
  if (l > 0 && w > 0) return (l * w) / 144
  return 0
}

function emptySlab(): SlabEntry {
  return {
    id: `new-${Date.now()}-${Math.random()}`,
    serialNo: '',
    length: 0,
    width: 0,
    thickness: 0,
    sqft: 0,
    isCrack: false,
    crackWidth: 0,
    crackHeight: 0,
    crackArea: 0,
  }
}

function generateBatchNo() {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `BAT-${dateStr}-${seq}`
}

export function CreateInventoryPage() {
  const navigate = useNavigate()
  const { data: productsRes } = useProducts()
  const createBatch = useCreateInventoryBatch()

  const variants = useMemo(() => {
    const products = (productsRes as any)?.data ?? []
    return products.flatMap((p: any) =>
      (p.variants ?? []).map((v: any) => ({ ...v, product: p })),
    )
  }, [productsRes])

  const [productVariantId, setProductVariantId] = useState('')
  const [batchNo, setBatchNo] = useState(generateBatchNo())
  const [buyingPrice, setBuyingPrice] = useState('')
  const [landingPrice, setLandingPrice] = useState('')
  const [sellingPriceFrom, setSellingPriceFrom] = useState('')
  const [sellingPriceTo, setSellingPriceTo] = useState('')
  const [remarks, setRemarks] = useState('')

  const [slabs, setSlabs] = useState<SlabEntry[]>([emptySlab()])
  const [crackDialogOpen, setCrackDialogOpen] = useState(false)
  const [activeSlabId, setActiveSlabId] = useState<string | null>(null)
  const [crackW, setCrackW] = useState('')
  const [crackH, setCrackH] = useState('')

  const addSlab = () => {
    setSlabs((prev) => [...prev, emptySlab()])
  }

  const updateSlab = (id: string, field: keyof SlabEntry, value: any) => {
    setSlabs((prev) => {
      const index = prev.findIndex((s) => s.id === id)
      if (index === -1) return prev
      const updated = prev.map((s) => {
        if (s.id !== id) return s
        const next = { ...s, [field]: value }
        if (field === 'length' || field === 'width') {
          const base = calcSqft(next.length, next.width)
          next.sqft = next.isCrack && next.crackArea > 0 ? Math.max(base - next.crackArea, 0) : base
        }
        return next
      })
      const current = updated[index]
      if (
        (field === 'length' || field === 'width') &&
        index === updated.length - 1 &&
        current.length > 0 &&
        current.width > 0
      ) {
        return [...updated, emptySlab()]
      }
      return updated
    })
  }

  const duplicateSlab = (id: string) => {
    setSlabs((prev) => {
      const index = prev.findIndex((s) => s.id === id)
      if (index === -1) return prev
      const duplicated: SlabEntry = { ...prev[index], id: `new-${Date.now()}-${Math.random()}`, serialNo: '' }
      return [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)]
    })
  }

  const removeSlab = (id: string) => {
    setSlabs((prev) => prev.filter((s) => s.id !== id))
  }

  const openCrackDialog = (slabId: string) => {
    const slab = slabs.find((s) => s.id === slabId)
    setActiveSlabId(slabId)
    setCrackW(slab?.isCrack && slab.crackWidth ? String(slab.crackWidth) : '')
    setCrackH(slab?.isCrack && slab.crackHeight ? String(slab.crackHeight) : '')
    setCrackDialogOpen(true)
  }

  const applyCrack = () => {
    if (!activeSlabId) return
    const cw = Number(crackW) || 0
    const ch = Number(crackH) || 0
    const crackArea = cw > 0 && ch > 0 ? calcSqft(cw, ch) : 0
    setSlabs((prev) =>
      prev.map((s) => {
        if (s.id !== activeSlabId) return s
        const base = calcSqft(s.length, s.width)
        return {
          ...s,
          isCrack: true,
          crackWidth: cw,
          crackHeight: ch,
          crackArea,
          sqft: Math.max(base - crackArea, 0),
        }
      }),
    )
    setCrackDialogOpen(false)
  }

  const totalSqft = useMemo(() => slabs.reduce((sum, s) => sum + (s.sqft || 0), 0), [slabs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productVariantId || !buyingPrice || !landingPrice || !sellingPriceFrom || !sellingPriceTo) {
      alert('Buying price, Landing price, Min price and Max price are required')
      return
    }

    const payload = {
      productVariantId: Number(productVariantId),
      batchNo: batchNo.trim() || undefined,
      buyingPrice: Number(buyingPrice),
      landingPrice: Number(landingPrice),
      sellingPriceFrom: Number(sellingPriceFrom),
      sellingPriceTo: Number(sellingPriceTo),
      remarks: remarks.trim() || undefined,
      slabs: slabs
        .filter((s) => s.length > 0 || s.width > 0 || s.thickness > 0 || s.serialNo.trim() !== '')
        .map((s, i) => ({
          serialNo: s.serialNo.trim() || `${batchNo}-S${i + 1}`,
          length: s.length || undefined,
          width: s.width || undefined,
          thickness: s.thickness || undefined,
          sqft: s.sqft || undefined,
          isCrack: s.isCrack || undefined,
          crackWidth: s.isCrack && s.crackWidth ? s.crackWidth : undefined,
          crackHeight: s.isCrack && s.crackHeight ? s.crackHeight : undefined,
          crackArea: s.isCrack && s.crackArea ? s.crackArea : undefined,
        })),
    }

    try {
      await createBatch.mutateAsync(payload as any)
      navigate({ to: '/inventory' })
    } catch (err: any) {
      alert(err?.message || 'Failed to create inventory')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/inventory' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Inventory</h1>
          <p className="text-sm text-muted-foreground">Create inventory batch with slabs</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border p-4 space-y-4">
          <h3 className="text-lg font-semibold">Batch Details</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1 md:col-span-2">
              <Label>Product Variant *</Label>
              <Select value={productVariantId} onValueChange={setProductVariantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  {variants.map((v: any) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.product?.name} - {v.skuCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Batch No</Label>
              <Input value={batchNo} onChange={(e) => setBatchNo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Remarks</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label>Buying Price *</Label>
              <Input type="number" step="0.01" value={buyingPrice} onChange={(e) => setBuyingPrice(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Landing Price *</Label>
              <Input type="number" step="0.01" value={landingPrice} onChange={(e) => setLandingPrice(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Min Selling Price *</Label>
              <Input type="number" step="0.01" value={sellingPriceFrom} onChange={(e) => setSellingPriceFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Max Selling Price *</Label>
              <Input type="number" step="0.01" value={sellingPriceTo} onChange={(e) => setSellingPriceTo(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Slabs</h3>
            <Button type="button" size="sm" variant="outline" onClick={addSlab}>
              <Plus className="mr-1 h-4 w-4" /> Add Slab
            </Button>
          </div>
          {slabs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slabs added. Click "Add Slab" to add.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-xs">Slab No</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Width (in)</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Height (in)</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Thickness (in)</th>
                    <th className="px-3 py-2 text-right font-medium text-xs">Area (sq.ft)</th>
                      <th className="px-3 py-2 text-center font-medium text-xs">Cracks</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {slabs.map((slab) => (
                    <tr key={slab.id} className="border-b last:border-0">
                      <td className="px-3 py-1">
                        <Input className="h-8 text-xs" placeholder={`${batchNo}-S${slabs.indexOf(slab) + 1}`} value={slab.serialNo} onChange={(e) => updateSlab(slab.id, 'serialNo', e.target.value)} />
                      </td>
                      <td className="px-3 py-1">
                        <Input className="h-8 text-xs text-right" type="number" step="0.01" value={slab.width || ''} onChange={(e) => updateSlab(slab.id, 'width', Number(e.target.value) || 0)} />
                      </td>
                      <td className="px-3 py-1">
                        <Input className="h-8 text-xs text-right" type="number" step="0.01" value={slab.length || ''} onChange={(e) => updateSlab(slab.id, 'length', Number(e.target.value) || 0)} />
                      </td>
                      <td className="px-3 py-1">
                        <Input className="h-8 text-xs text-right" type="number" step="0.01" value={slab.thickness || ''} onChange={(e) => updateSlab(slab.id, 'thickness', Number(e.target.value) || 0)} />
                      </td>
                      <td className="px-3 py-1 text-right font-mono text-xs">{slab.sqft > 0 ? slab.sqft.toFixed(3) : '-'}</td>
                      <td className="px-3 py-1 text-center">
                        <Button type="button" size="sm" variant={slab.isCrack ? 'default' : 'outline'} onClick={() => openCrackDialog(slab.id)}>
                          {slab.isCrack ? 'Cracks' : 'Mark as cracks'}
                        </Button>
                      </td>
                      <td className="px-3 py-1">
                        <div className="flex items-center justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" title="Duplicate slab" onClick={() => duplicateSlab(slab.id)}>
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" title="Remove slab" onClick={() => removeSlab(slab.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="px-3 py-2" colSpan={4}>Total</td>
                    <td className="px-3 py-2 text-right font-mono">{totalSqft.toFixed(3)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/inventory' })}>Cancel</Button>
          <Button type="submit" disabled={createBatch.isPending}>
            {createBatch.isPending ? 'Creating...' : 'Create Inventory'}
          </Button>
        </div>
      </form>

      <Dialog open={crackDialogOpen} onOpenChange={setCrackDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as cracks - Add crack area</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Crack Width (in)</Label>
                <Input type="number" step="0.01" value={crackW} onChange={(e) => setCrackW(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Crack Height (in)</Label>
                <Input type="number" step="0.01" value={crackH} onChange={(e) => setCrackH(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCrackDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={applyCrack}>Apply</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
