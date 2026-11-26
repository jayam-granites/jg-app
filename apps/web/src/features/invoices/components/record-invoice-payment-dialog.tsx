import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useRecordInvoicePayment } from '../hooks/use-invoices'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Account', label: 'Account' },
]

type PaymentInvoice = {
  id: number
  invoiceNumber?: string
  grandTotal?: number | string
  receivedAmount?: number | string
  balanceAmount?: number | string | null
  paymentMethod?: string | null
  invoiceDate?: string
  accountId?: number | null
  payments?: Array<{
    accountId?: number | null
    paymentMethod?: string | null
  }>
}

type RecordInvoicePaymentDialogProps = {
  invoice: PaymentInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function RecordInvoicePaymentDialog({
  invoice,
  open,
  onOpenChange,
}: RecordInvoicePaymentDialogProps) {
  const recordPayment = useRecordInvoicePayment()
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    enabled: open,
    queryFn: async () => {
      const res = await api.accounts.$get()
      return res.json()
    },
  })

  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [accountId, setAccountId] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentRemarks, setPaymentRemarks] = useState('')

  const grandTotal = Number(invoice?.grandTotal ?? 0)
  const received = Number(invoice?.receivedAmount ?? 0)
  const balance = Number(invoice?.balanceAmount ?? round2(grandTotal - received))

  useEffect(() => {
    if (!open || !invoice) return
    const lastPayment = invoice.payments?.at(-1)
    const defaultAccountId = lastPayment?.accountId ?? invoice.accountId
    setPaymentAmount('')
    setPaymentMethod(lastPayment?.paymentMethod || invoice.paymentMethod || 'Cash')
    setAccountId(defaultAccountId != null ? String(defaultAccountId) : '')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentRemarks('')
  }, [open, invoice])

  function savePayment() {
    if (!invoice) return
    const amount = round2(Number(paymentAmount) || 0)
    if (amount <= 0) {
      alert('Enter a payment amount greater than 0')
      return
    }
    if (amount > balance + 0.01) {
      alert(`Payment cannot exceed the outstanding balance of ₹${balance.toFixed(2)}`)
      return
    }

    recordPayment.mutate(
      {
        invoiceId: invoice.id,
        data: {
          amount,
          paymentMethod,
          accountId: accountId ? Number(accountId) : undefined,
          paymentDate: paymentDate || undefined,
          remarks: paymentRemarks.trim() || undefined,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error: Error) => alert(error.message || 'Failed to record payment'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Record Payment{invoice?.invoiceNumber ? ` — ${invoice.invoiceNumber}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-muted/30 px-3 py-2">
              <div className="text-xs text-muted-foreground">Grand Total</div>
              <div className="font-mono font-semibold">₹{grandTotal.toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-muted/30 px-3 py-2">
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="font-mono font-semibold text-destructive">₹{balance.toFixed(2)}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Amount (₹)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                max={balance}
                step="0.01"
                placeholder={`Max ${balance.toFixed(2)}`}
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setPaymentAmount(String(balance))}>
                Full
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
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
              <Label className="text-xs">Payment Date</Label>
              <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Receive Into Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {(accounts || []).map((account: any) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.name} ({account.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Remarks</Label>
            <Input
              value={paymentRemarks}
              onChange={(event) => setPaymentRemarks(event.target.value)}
              placeholder="Optional note"
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Balance After Payment</span>
            <span className="font-mono font-semibold">
              ₹{Math.max(round2(balance - (Number(paymentAmount) || 0)), 0).toFixed(2)}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={savePayment} disabled={recordPayment.isPending || !invoice || balance <= 0.001}>
            {recordPayment.isPending
              ? <><Loader2 className="mr-2 size-4 animate-spin" /> Saving...</>
              : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
