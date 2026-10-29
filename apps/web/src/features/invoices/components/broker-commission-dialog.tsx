import { useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBrokers, useCreateBroker } from '@/features/brokers/hooks/use-brokers'
import { useCreateInvoiceCommission } from '../hooks/use-invoices'

type Broker = {
  id: number
  name: string
  mobile: string | null
  commissionPercent: number | null
  isActive: boolean
}

type BrokerCommissionDialogProps = {
  invoiceId: number | null
  grandTotal: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function BrokerCommissionDialog({
  invoiceId,
  grandTotal,
  open,
  onOpenChange,
}: BrokerCommissionDialogProps) {
  const { data: brokersRes } = useBrokers()
  const createBroker = useCreateBroker()
  const createCommission = useCreateInvoiceCommission()

  const brokers = (brokersRes?.data ?? []) as Broker[]

  const [brokerId, setBrokerId] = useState('')
  const [commissionPercent, setCommissionPercent] = useState('')
  const [commissionAmount, setCommissionAmount] = useState('')
  const [isAddingBroker, setIsAddingBroker] = useState(false)
  const [newBrokerName, setNewBrokerName] = useState('')
  const [newBrokerMobile, setNewBrokerMobile] = useState('')
  const [newBrokerPercent, setNewBrokerPercent] = useState('')

  useEffect(() => {
    if (!open) return
    setBrokerId('')
    setCommissionPercent('')
    setCommissionAmount('')
    setIsAddingBroker(false)
    setNewBrokerName('')
    setNewBrokerMobile('')
    setNewBrokerPercent('')
  }, [open])

  function selectBroker(id: string) {
    if (id === '__add__') {
      setIsAddingBroker(true)
      return
    }
    setBrokerId(id)
    const broker = brokers.find((item) => String(item.id) === id)
    const percent = broker?.commissionPercent
    if (percent != null) {
      setCommissionPercent(String(percent))
      setCommissionAmount(round2((grandTotal * percent) / 100).toFixed(2))
    }
  }

  function handlePercentChange(value: string) {
    setCommissionPercent(value)
    const percent = Number(value)
    if (Number.isFinite(percent)) {
      setCommissionAmount(round2((grandTotal * percent) / 100).toFixed(2))
    }
  }

  async function saveNewBroker() {
    const name = newBrokerName.trim()
    if (!name) {
      alert('Broker name is required')
      return
    }

    try {
      const percent = Number(newBrokerPercent)
      const res: any = await createBroker.mutateAsync({
        name,
        mobile: newBrokerMobile.trim() || undefined,
        commissionPercent: newBrokerPercent.trim() && Number.isFinite(percent) ? percent : undefined,
      })
      const newId = res?.data?.id
      if (newId) {
        setBrokerId(String(newId))
        if (newBrokerPercent.trim()) {
          setCommissionPercent(String(percent))
          setCommissionAmount(round2((grandTotal * percent) / 100).toFixed(2))
        }
      }
      setIsAddingBroker(false)
      setNewBrokerName('')
      setNewBrokerMobile('')
      setNewBrokerPercent('')
    } catch (error: any) {
      alert(error?.message || 'Failed to add broker')
    }
  }

  function saveCommission() {
    if (!invoiceId) return
    if (!brokerId) {
      alert('Please select a broker')
      return
    }
    const amount = Number(commissionAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid commission amount')
      return
    }

    const percent = Number(commissionPercent)
    createCommission.mutate(
      {
        invoiceId,
        data: {
          brokerId: Number(brokerId),
          commissionPercent: commissionPercent.trim() && Number.isFinite(percent) ? percent : undefined,
          commissionAmount: round2(amount),
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error: any) => alert(error?.message || 'Failed to add commission'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Broker Commission</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Invoice Total</span>
            <span className="font-mono font-semibold">₹{grandTotal.toFixed(2)}</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Broker</Label>
            <Select value={brokerId} onValueChange={selectBroker}>
              <SelectTrigger>
                <SelectValue placeholder="Select broker" />
              </SelectTrigger>
              <SelectContent>
                {brokers.map((broker) => (
                  <SelectItem key={broker.id} value={String(broker.id)}>
                    {broker.name}{broker.isActive ? '' : ' (inactive)'}
                  </SelectItem>
                ))}
                <SelectItem value="__add__">
                  <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add new broker</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isAddingBroker && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <div className="text-xs font-medium">New Broker</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px]">Name</Label>
                  <Input value={newBrokerName} onChange={(e) => setNewBrokerName(e.target.value)} placeholder="Broker name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Mobile</Label>
                  <Input value={newBrokerMobile} onChange={(e) => setNewBrokerMobile(e.target.value)} placeholder="Mobile" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Commission %</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newBrokerPercent}
                  onChange={(e) => setNewBrokerPercent(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingBroker(false)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={saveNewBroker} disabled={createBroker.isPending}>
                  {createBroker.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Broker'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Commission %</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={commissionPercent}
                onChange={(e) => handlePercentChange(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Commission Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={saveCommission} disabled={createCommission.isPending}>
            {createCommission.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Commission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
