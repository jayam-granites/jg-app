import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useInventoryBatch, useCreateInventorySlab, useUpdateInventoryBatch, useUpdateInventorySlab } from '../hooks/use-inventory'
import { formatDateTime } from '@/lib/date'

function calcSqft(l: number, w: number) {
  if (l > 0 && w > 0) return (l * w) / 144
  return 0
}

export function InventoryBatchPage() {
  const { id } = useParams({ from: '/inventory/$id' })
  const navigate = useNavigate()
  const { data: batchRes, isLoading } = useInventoryBatch(Number(id))
  const updateSlab = useUpdateInventorySlab()
  const createSlab = useCreateInventorySlab()
  const updateBatch = useUpdateInventoryBatch()
  const batch = batchRes?.data

  const [crackDialogOpen, setCrackDialogOpen] = useState(false)
  const [activeSlab, setActiveSlab] = useState<any>(null)
  const [crackW, setCrackW] = useState('')
  const [crackH, setCrackH] = useState('')

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newSlab, setNewSlab] = useState({ serialNo: '', length: '', width: '', thickness: '' })

  const openCrackDialog = (slab: any) => {
    setActiveSlab(slab)
    setCrackW(slab?.isCrack && slab.crackWidth ? String(slab.crackWidth) : '')
    setCrackH(slab?.isCrack && slab.crackHeight ? String(slab.crackHeight) : '')
    setCrackDialogOpen(true)
  }

  const applyCrack = async () => {
    if (!activeSlab) return
    const cw = Number(crackW) || 0
    const ch = Number(crackH) || 0
    const crackArea = cw > 0 && ch > 0 ? calcSqft(cw, ch) : 0
    const baseSqft = calcSqft(Number(activeSlab.length) || 0, Number(activeSlab.width) || 0)
    const newSqft = Math.max(baseSqft - crackArea, 0)
    try {
      await updateSlab.mutateAsync({
        id: activeSlab.id,
        data: {
          isCrack: true,
          crackWidth: cw || undefined,
          crackHeight: ch || undefined,
          crackArea: crackArea || undefined,
          sqft: newSqft || undefined,
        },
      })
      setCrackDialogOpen(false)
    } catch (err: any) {
      alert(err?.message || 'Failed to update slab')
    }
  }

  const openAddDialog = () => {
    setNewSlab({
      serialNo: `${batch?.batchNo ?? 'SLAB'}-S${(batch?.slabs?.length ?? 0) + 1}`,
      length: '',
      width: '',
      thickness: '',
    })
    setAddDialogOpen(true)
  }

  const applyAddSlab = async () => {
    if (!batch) return
    const length = Number(newSlab.length) || 0
    const width = Number(newSlab.width) || 0
    const thickness = Number(newSlab.thickness) || 0
    const sqft = calcSqft(length, width)
    try {
      await createSlab.mutateAsync({
        inventoryBatchId: batch.id,
        serialNo: newSlab.serialNo.trim() || undefined,
        length: length || undefined,
        width: width || undefined,
        thickness: thickness || undefined,
        sqft: sqft || undefined,
      })
      const nextCount = (batch.slabs?.length ?? 0) + 1
      await updateBatch.mutateAsync({
        id: batch.id,
        data: { slabCount: nextCount, totalQty: nextCount, availableQty: nextCount },
      })
      setAddDialogOpen(false)
    } catch (err: any) {
      alert(err?.message || 'Failed to add slab')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/inventory' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-muted-foreground">Inventory batch not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/inventory' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{batch.productVariant?.product?.name}</h1>
            <Badge variant="outline" className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
              {batch.batchNo}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">SKU: {batch.productVariant?.skuCode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Qty</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{Number(batch.totalQty)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{Number(batch.availableQty)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Damaged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{Number(batch.damagedQty ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Slab Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{batch.slabCount ?? '-'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Buying Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">₹{Number(batch.buyingPrice).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Landing Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">₹{Number(batch.landingPrice).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">{batch.purchaseReceiptItem?.purchaseReceipt?.receiptNumber ?? '-'}</p>
            <p className="text-xs text-muted-foreground">
              {batch.purchaseReceiptItem?.purchaseReceipt?.receivedDate
                ? formatDateTime(batch.purchaseReceiptItem.purchaseReceipt.receivedDate)
                : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold">Slabs ({batch.slabs?.length ?? 0})</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={openAddDialog}>
            <Plus className="mr-1 h-4 w-4" /> Add Slab
          </Button>
        </CardHeader>
        <CardContent>
          {batch.slabs && batch.slabs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium">#</th>
                    <th className="px-4 py-2 text-left font-medium">Serial No</th>
                    <th className="px-4 py-2 text-right font-medium">Length</th>
                    <th className="px-4 py-2 text-right font-medium">Width</th>
                    <th className="px-4 py-2 text-right font-medium">Thickness</th>
                    <th className="px-4 py-2 text-right font-medium">Sqft</th>
                    <th className="px-4 py-2 text-center font-medium">Crack</th>
                    <th className="px-4 py-2 text-center font-medium">Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.slabs.map((slab: any, index: number) => (
                    <tr key={slab.id} className="border-b last:border-0">
                      <td className="px-4 py-2 text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-2 font-mono text-sm">{slab.serialNo ?? '-'}</td>
                      <td className="px-4 py-2 text-right">{slab.length ? Number(slab.length) : '-'}</td>
                      <td className="px-4 py-2 text-right">{slab.width ? Number(slab.width) : '-'}</td>
                      <td className="px-4 py-2 text-right">{slab.thickness ? Number(slab.thickness) : '-'}</td>
                      <td className="px-4 py-2 text-right">{slab.sqft ? Number(slab.sqft).toFixed(3) : '-'}</td>
                      <td className="px-4 py-2 text-center">
                        {slab.isCrack ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 rounded-full text-[10px] px-2">Cracks</Badge>
                        ) : (
                          <Button type="button" size="sm" variant="outline" onClick={() => openCrackDialog(slab)}>Mark as cracks</Button>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {slab.isSold ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 rounded-full text-[10px] px-2">Sold</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 rounded-full text-[10px] px-2">Available</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No slabs</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Slab</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Serial No</Label>
              <Input value={newSlab.serialNo} onChange={(e) => setNewSlab({ ...newSlab, serialNo: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Width (in)</Label>
                <Input type="number" step="0.01" value={newSlab.width} onChange={(e) => setNewSlab({ ...newSlab, width: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Height (in)</Label>
                <Input type="number" step="0.01" value={newSlab.length} onChange={(e) => setNewSlab({ ...newSlab, length: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Thickness (in)</Label>
                <Input type="number" step="0.01" value={newSlab.thickness} onChange={(e) => setNewSlab({ ...newSlab, thickness: e.target.value })} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Area: {calcSqft(Number(newSlab.length) || 0, Number(newSlab.width) || 0).toFixed(3)} sq.ft
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button type="button" onClick={applyAddSlab} disabled={createSlab.isPending || updateBatch.isPending}>
                {createSlab.isPending ? 'Adding...' : 'Add Slab'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <Button type="button" onClick={applyCrack} disabled={updateSlab.isPending}>
                {updateSlab.isPending ? 'Applying...' : 'Apply'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
