import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUpdateInvoice } from '../hooks/use-invoices'

type CloseSaleInvoice = {
  id: number
  invoiceNumber: string
  grandTotal: number | string | null
  receivedAmount: number | string | null
  discountAmount: number | string | null
  status: string
}

type CloseSaleDialogProps = {
  invoice: CloseSaleInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function CloseSaleDialog({ invoice, open, onOpenChange }: CloseSaleDialogProps) {
  const updateInvoice = useUpdateInvoice()

  const totals = useMemo(() => {
    const grandTotal = round2(Number(invoice?.grandTotal ?? 0))
    const received = round2(Number(invoice?.receivedAmount ?? 0))
    const existingDiscount = round2(Number(invoice?.discountAmount ?? 0))
    const mismatch = round2(grandTotal - received)
    return {
      grandTotal,
      received,
      existingDiscount,
      mismatch,
      discountToAdd: mismatch > 0.005 ? mismatch : 0,
      newDiscount: round2(existingDiscount + (mismatch > 0.005 ? mismatch : 0)),
    }
  }, [invoice])

  const alreadyClosed = invoice?.status === 'PAID'

  function handleCloseSale() {
    if (!invoice) return
    updateInvoice.mutate(
      {
        id: invoice.id,
        data: {
          discountAmount: totals.newDiscount,
          balanceAmount: 0,
          status: 'PAID',
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error: any) => alert(error?.message || 'Failed to close sale'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close Sale</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice</span>
            <span className="font-mono font-medium">{invoice?.invoiceNumber ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Bill</span>
            <span className="font-mono font-semibold">₹{totals.grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Received Amount</span>
            <span className="font-mono text-green-700">₹{totals.received.toFixed(2)}</span>
          </div>
          {totals.discountToAdd > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Received amount differs from the total bill by ₹{totals.discountToAdd.toFixed(2)}. This amount will be added to the discount and the balance will be cleared.
            </div>
          )}
          {totals.mismatch < -0.005 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Received amount is higher than the total bill by ₹{Math.abs(totals.mismatch).toFixed(2)}. The sale will be closed without adding a discount.
            </div>
          )}
          {alreadyClosed ? (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              This sale is already closed.
            </div>
          ) : (
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">Discount After Closing</span>
              <span className="font-mono font-semibold">₹{totals.newDiscount.toFixed(2)}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCloseSale} disabled={alreadyClosed || updateInvoice.isPending}>
            {updateInvoice.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Closing...</> : 'Confirm Close Sale'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
