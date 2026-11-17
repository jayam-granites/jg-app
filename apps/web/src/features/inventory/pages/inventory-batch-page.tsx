import { useRef, useState, type KeyboardEvent } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, MoreHorizontal, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useInventoryBatch, useCreateInventorySlabs, useDeleteInventorySlab, useUpdateInventorySlab } from '../hooks/use-inventory'
import { formatDateTime } from '@/lib/date'

function calcSqft(l: number, w: number) {
  if (l > 0 && w > 0) return (l * w) / 144
  return 0
}

type InventorySlabDraft = {
  id: number
  serialNo: string
  length: string
  width: string
  thickness: string
}

type InventorySlabEditDraft = Omit<InventorySlabDraft, 'id'>

export function InventoryBatchPage() {
  const { id } = useParams({ from: '/inventory/$id' })
  const navigate = useNavigate()
  const { data: batchRes, isLoading } = useInventoryBatch(Number(id))
  const updateSlab = useUpdateInventorySlab()
  const createSlabs = useCreateInventorySlabs()
  const deleteSlabMutation = useDeleteInventorySlab()
  const batch = batchRes?.data

  const [crackDialogOpen, setCrackDialogOpen] = useState(false)
  const [activeSlab, setActiveSlab] = useState<any>(null)
  const [crackW, setCrackW] = useState('')
  const [crackH, setCrackH] = useState('')

  const [newSlabs, setNewSlabs] = useState<InventorySlabDraft[]>([])
  const [draftError, setDraftError] = useState('')
  const [editingSlabId, setEditingSlabId] = useState<number | null>(null)
  const [slabEditDraft, setSlabEditDraft] = useState<InventorySlabEditDraft | null>(null)
  const widthInputRefs = useRef(new Map<number, HTMLInputElement>())
  const saveAllButtonRef = useRef<HTMLButtonElement>(null)
  const nextDraftId = useRef(0)
  const nextSerialNumber = useRef<number | null>(null)

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

  const startAddSlab = () => {
    if (!batch || createSlabs.isPending) return
    setDraftError('')
    const serialNumber = nextSerialNumber.current ?? (batch.slabs?.length ?? 0) + 1
    nextSerialNumber.current = serialNumber + 1
    const draft: InventorySlabDraft = {
      id: nextDraftId.current++,
      serialNo: `${batch.batchNo ?? 'SLAB'}-S${serialNumber}`,
      length: '',
      width: '',
      thickness: '',
    }
    setNewSlabs((current) => [draft, ...current])
    requestAnimationFrame(() => widthInputRefs.current.get(draft.id)?.focus())
  }

  const updateNewSlab = (id: number, field: keyof Omit<InventorySlabDraft, 'id'>, value: string) => {
    setDraftError('')
    setNewSlabs((current) =>
      current.map((draft) => draft.id === id ? { ...draft, [field]: value } : draft),
    )
  }

  const saveAllSlabs = async () => {
    if (!batch || newSlabs.length === 0 || createSlabs.isPending) return
    const invalidDraft = newSlabs.find(
      (draft) => Number(draft.width) <= 0 || Number(draft.length) <= 0,
    )
    if (invalidDraft) {
      setDraftError('Width and height are required and must be greater than zero for every slab.')
      widthInputRefs.current.get(invalidDraft.id)?.focus()
      return
    }

    try {
      await createSlabs.mutateAsync([...newSlabs].reverse().map((draft) => {
        const length = Number(draft.length)
        const width = Number(draft.width)
        const thickness = Number(draft.thickness) || 0
        return {
          inventoryBatchId: batch.id,
          serialNo: draft.serialNo.trim() || undefined,
          length,
          width,
          thickness: thickness || undefined,
          sqft: calcSqft(length, width),
        }
      }))
      setNewSlabs([])
      setDraftError('')
    } catch (err: any) {
      setDraftError(err?.message || 'Failed to save slabs')
    }
  }

  const handleDraftEnter = (event: KeyboardEvent<HTMLInputElement>, nextInput?: HTMLElement | null) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (nextInput) {
      nextInput.focus()
      return
    }
    saveAllButtonRef.current?.focus()
  }

  const handleDeleteSlab = async (slab: any) => {
    if (slab.isSold) return
    if (!window.confirm(`Delete slab ${slab.serialNo ?? `#${slab.id}`}?`)) return

    try {
      await deleteSlabMutation.mutateAsync(slab.id)
    } catch (err: any) {
      alert(err?.message || 'Failed to delete slab')
    }
  }

  const startEditSlab = (slab: any) => {
    setEditingSlabId(slab.id)
    setSlabEditDraft({
      serialNo: slab.serialNo ?? '',
      length: slab.length == null ? '' : String(slab.length),
      width: slab.width == null ? '' : String(slab.width),
      thickness: slab.thickness == null ? '' : String(slab.thickness),
    })
  }

  const updateSlabEditDraft = (field: keyof InventorySlabEditDraft, value: string) => {
    setSlabEditDraft((current) => current ? { ...current, [field]: value } : current)
  }

  const saveSlabEdit = async (slab: any) => {
    if (!slabEditDraft) return
    const length = Number(slabEditDraft.length)
    const width = Number(slabEditDraft.width)
    if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(width) || width <= 0) {
      alert('Width and height are required and must be greater than zero.')
      return
    }

    try {
      await updateSlab.mutateAsync({
        id: slab.id,
        data: {
          serialNo: slabEditDraft.serialNo.trim(),
          length,
          width,
          ...(slabEditDraft.thickness === '' ? {} : { thickness: Number(slabEditDraft.thickness) }),
          sqft: Math.max(calcSqft(length, width) - (Number(slab.crackArea) || 0), 0),
        },
      })
      setEditingSlabId(null)
      setSlabEditDraft(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to update slab')
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
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={startAddSlab} disabled={createSlabs.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Add Slab
            </Button>
            {newSlabs.length > 0 && (
              <Button
                ref={saveAllButtonRef}
                type="button"
                size="sm"
                onClick={() => void saveAllSlabs()}
                disabled={createSlabs.isPending}
              >
                {createSlabs.isPending ? 'Saving...' : `Save All (${newSlabs.length})`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(batch.slabs?.length ?? 0) > 0 || newSlabs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left font-medium">#</th>
                    <th className="px-4 py-2 text-left font-medium">Serial No</th>
                    <th className="px-4 py-2 text-right font-medium">Width (in)</th>
                    <th className="px-4 py-2 text-right font-medium">Height (in)</th>
                    <th className="px-4 py-2 text-right font-medium">Thickness</th>
                    <th className="px-4 py-2 text-right font-medium">Sqft</th>
                    <th className="px-4 py-2 text-center font-medium">Crack</th>
                    <th className="px-4 py-2 text-center font-medium">Sold</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {newSlabs.map((newSlab, draftIndex) => {
                    const widthRef = (input: HTMLInputElement | null) => {
                      if (input) widthInputRefs.current.set(newSlab.id, input)
                      else widthInputRefs.current.delete(newSlab.id)
                    }
                    return (
                      <tr key={newSlab.id} className="border-b bg-muted/10">
                        <td className="px-4 py-2 text-muted-foreground">New {draftIndex + 1}</td>
                        <td className="px-2 py-2">
                          <Input
                            aria-label="Serial No"
                            value={newSlab.serialNo}
                            onChange={(event) => updateNewSlab(newSlab.id, 'serialNo', event.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            ref={widthRef}
                            aria-label="Width (in)"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={newSlab.width}
                            onChange={(event) => updateNewSlab(newSlab.id, 'width', event.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            aria-label="Height (in)"
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={newSlab.length}
                            onChange={(event) => updateNewSlab(newSlab.id, 'length', event.target.value)}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            aria-label="Thickness (in)"
                            type="number"
                            step="0.01"
                            value={newSlab.thickness}
                            onChange={(event) => updateNewSlab(newSlab.id, 'thickness', event.target.value)}
                            onKeyDown={(event) => handleDraftEnter(event, saveAllButtonRef.current)}
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          {calcSqft(Number(newSlab.length) || 0, Number(newSlab.width) || 0).toFixed(3)}
                        </td>
                        <td />
                        <td />
                        <td className="px-2 py-2">
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Discard new slab"
                              title="Discard new slab"
                              onClick={() => {
                                setNewSlabs((current) => current.filter((draft) => draft.id !== newSlab.id))
                                setDraftError('')
                              }}
                              disabled={createSlabs.isPending}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {draftError && (
                    <tr>
                      <td colSpan={9} className="px-4 py-2 text-sm text-destructive" role="alert">
                        {draftError}
                      </td>
                    </tr>
                  )}
                  {(batch.slabs ?? []).map((slab: any, index: number) => (
                    <tr key={slab.id} className="border-b last:border-0">
                      <td className="px-4 py-2 text-muted-foreground">{index + 1 + newSlabs.length}</td>
                      <td className="px-2 py-2 font-mono text-sm">
                        {editingSlabId === slab.id && slabEditDraft ? (
                          <Input
                            aria-label="Serial No"
                            value={slabEditDraft.serialNo}
                            onChange={(event) => updateSlabEditDraft('serialNo', event.target.value)}
                          />
                        ) : slab.serialNo ?? '-'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {editingSlabId === slab.id && slabEditDraft ? (
                          <Input
                            aria-label="Width (in)"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={slabEditDraft.width}
                            onChange={(event) => updateSlabEditDraft('width', event.target.value)}
                          />
                        ) : slab.width ? Number(slab.width) : '-'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {editingSlabId === slab.id && slabEditDraft ? (
                          <Input
                            aria-label="Height (in)"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={slabEditDraft.length}
                            onChange={(event) => updateSlabEditDraft('length', event.target.value)}
                          />
                        ) : slab.length ? Number(slab.length) : '-'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {editingSlabId === slab.id && slabEditDraft ? (
                          <Input
                            aria-label="Thickness (in)"
                            type="number"
                            step="0.01"
                            value={slabEditDraft.thickness}
                            onChange={(event) => updateSlabEditDraft('thickness', event.target.value)}
                          />
                        ) : slab.thickness ? Number(slab.thickness) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editingSlabId === slab.id && slabEditDraft
                          ? Math.max(
                              calcSqft(Number(slabEditDraft.length) || 0, Number(slabEditDraft.width) || 0)
                                - (Number(slab.crackArea) || 0),
                              0,
                            ).toFixed(3)
                          : slab.sqft ? Number(slab.sqft).toFixed(3) : '-'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {slab.isCrack && (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 rounded-full text-[10px] px-2">Cracks</Badge>
                          )}
                          <Button type="button" size="sm" variant="outline" onClick={() => openCrackDialog(slab)}>
                            {slab.isCrack ? 'Edit cracks' : 'Mark as cracks'}
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {slab.isBroken ? (
                          <Badge variant="outline" className="rounded-full text-[10px] px-2">Damaged</Badge>
                        ) : slab.isSold ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 rounded-full text-[10px] px-2">Sold</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 rounded-full text-[10px] px-2">Available</Badge>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {editingSlabId === slab.id && slabEditDraft ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Save slab changes"
                              title="Save changes"
                              onClick={() => void saveSlabEdit(slab)}
                              disabled={updateSlab.isPending}
                            >
                              <Save />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label="Cancel slab edit"
                              title="Cancel"
                              onClick={() => {
                                setEditingSlabId(null)
                                setSlabEditDraft(null)
                              }}
                              disabled={updateSlab.isPending}
                            >
                              <X />
                            </Button>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label={`Slab actions ${slab.serialNo ?? slab.id}`}
                                disabled={editingSlabId !== null}
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => startEditSlab(slab)}>
                                <Pencil />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={slab.isSold || deleteSlabMutation.isPending}
                                onSelect={() => void handleDeleteSlab(slab)}
                              >
                                <Trash2 />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
