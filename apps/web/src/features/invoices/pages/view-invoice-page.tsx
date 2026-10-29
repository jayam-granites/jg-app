import { useMemo, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, FileText, Loader2, MoreHorizontal, Pencil, ReceiptText, Trash2, Truck, Users, Wallet } from 'lucide-react'
import { useInvoice, useRecordInvoicePayment, useDeleteInvoicePayment, useDeleteInvoiceCommission } from '../hooks/use-invoices'
import { useUpdateCustomer } from '@/features/customers/hooks/use-customers'
import { useLookupOptions, lookupOptionMap, optionColorClasses } from '@/features/masters/hooks/use-lookups'
import { LOOKUP_GROUPS } from '@jg-app/shared'
import { previewPdf } from '@/lib/pdf'
import { formatDate, formatDateTime } from '@/lib/date'
import { buildInvoicePdf, buildOriginalBillPdf, buildTransportBillPdf } from '../lib/invoice-pdf'
import { CloseSaleDialog } from '../components/close-sale-dialog'
import { BrokerCommissionDialog } from '../components/broker-commission-dialog'
import { PageLayout } from '@/shared/components/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Account', label: 'Account' },
]

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function ViewInvoicePage() {
  const { id } = useParams({ from: '/invoices/$id' })
  const navigate = useNavigate()
  const { data: res, isLoading } = useInvoice(Number(id))
  const { data: statusOptionsRes } = useLookupOptions(LOOKUP_GROUPS.INVOICE_STATUS)
  const recordPayment = useRecordInvoicePayment()
  const deletePayment = useDeleteInvoicePayment()
  const updateCustomer = useUpdateCustomer()
  const deleteCommission = useDeleteInvoiceCommission()

  const inv = useMemo(() => (res as any)?.data ?? null, [res])
  const statusMap = useMemo(
    () => lookupOptionMap(statusOptionsRes?.data?.[LOOKUP_GROUPS.INVOICE_STATUS] ?? []),
    [statusOptionsRes],
  )

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.accounts.$get()
      return res.json()
    },
  })
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [accountId, setAccountId] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentRemarks, setPaymentRemarks] = useState('')
  const [contactOpen, setContactOpen] = useState(false)
  const [editMobile, setEditMobile] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [closeSaleOpen, setCloseSaleOpen] = useState(false)
  const [commissionOpen, setCommissionOpen] = useState(false)

  const items = inv?.items ?? []
  const transport = inv?.invoiceTransports?.[0]
  const subtotal = Number(inv?.subtotal ?? items.reduce((s: number, i: any) => s + Number(i.amount), 0))
  const loadingAmount = Number(inv?.loadingAmount ?? 0)
  const transportAmount = Number(transport?.amount ?? 0)
  const totalTaxAmount = Number(inv?.totalTaxAmount ?? 0)
  const roundOffAmount = Number(inv?.roundOffAmount ?? 0)
  const grandTotal = Number(inv?.grandTotal ?? 0)
  const received = Number(inv?.receivedAmount ?? 0)
  const discount = Number(inv?.discountAmount ?? 0)
  const balance = Number(inv?.balanceAmount ?? round2(grandTotal - received))
  const totalSlabs = items.reduce((sum: number, item: any) => sum + Number(item.slabCount ?? 0), 0)
  const totalSqft = items.reduce((sum: number, item: any) => sum + Number(item.qty ?? 0), 0)

  const payments = useMemo(() => {
    const list = (inv?.payments ?? []) as any[]
    if (list.length > 0) return list
    if (received > 0) {
      return [
        {
          id: null,
          amount: received,
          paymentMethod: inv?.paymentMethod,
          paymentDate: inv?.invoiceDate,
          remarks: 'Opening payment',
          account: null,
        },
      ]
    }
    return []
  }, [inv, received])

  function openPaymentDialog() {
    const lastPayment = inv?.payments?.at(-1)
    const defaultAccountId = lastPayment?.accountId ?? inv?.accountId
    setPaymentAmount('')
    setPaymentMethod(lastPayment?.paymentMethod || inv?.paymentMethod || 'Cash')
    setAccountId(defaultAccountId != null ? String(defaultAccountId) : '')
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentRemarks('')
    setPaymentOpen(true)
  }

  function savePayment() {
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
        invoiceId: Number(id),
        data: {
          amount,
          paymentMethod,
          accountId: accountId ? Number(accountId) : undefined,
          paymentDate: paymentDate || undefined,
          remarks: paymentRemarks.trim() || undefined,
        },
      },
      {
        onSuccess: () => setPaymentOpen(false),
        onError: (err: any) => alert(err?.message || 'Failed to record payment'),
      },
    )
  }

  function removePayment(paymentId: number) {
    if (!window.confirm('Delete this payment? The balance will be recalculated.')) return
    deletePayment.mutate(
      { invoiceId: Number(id), paymentId },
      { onError: (error: any) => alert(error?.message || 'Failed to delete payment') },
    )
  }

  function previewInvoicePdf() {
    previewPdf(buildInvoicePdf(inv))
  }

  function previewTransportBill() {
    previewPdf(buildTransportBillPdf(inv))
  }

  function previewOriginalBill() {
    previewPdf(buildOriginalBillPdf(inv))
  }

  function openContactDialog() {
    setEditMobile(inv?.customer?.mobile ?? '')
    setEditAddress(inv?.customer?.address ?? '')
    setContactOpen(true)
  }

  function saveContactDetails() {
    if (!inv?.customer?.id) return
    updateCustomer.mutate(
      {
        id: Number(inv.customer.id),
        data: {
          mobile: editMobile.trim(),
          address: editAddress.trim(),
        },
      },
      {
        onSuccess: () => setContactOpen(false),
        onError: (error: any) => alert(error?.message || 'Failed to update customer'),
      },
    )
  }

  function removeCommission(commissionId: number) {
    if (!window.confirm('Remove this broker commission?')) return
    deleteCommission.mutate(
      { invoiceId: Number(id), commissionId },
      { onError: (error: any) => alert(error?.message || 'Failed to delete commission') },
    )
  }

  if (isLoading) {
    return (
      <PageLayout title="Loading..." description="Loading invoice details">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </PageLayout>
    )
  }

  if (!inv) {
    return (
      <PageLayout title="Not Found" description="Invoice not found">
        <div className="text-sm text-muted-foreground">This invoice does not exist.</div>
      </PageLayout>
    )
  }

  const statusOpt = statusMap.get(inv.status)
  const statusLabel =
    inv.status === 'PAID'
      ? 'Fully Paid'
      : inv.status === 'PARTIAL_PAID'
        ? 'Partially Paid'
        : inv.status === 'PENDING'
          ? 'Yet to Pay'
          : statusOpt?.label ?? inv.status

  return (
    <PageLayout title={`Invoice ${inv.invoiceNumber}`} description={`Customer: ${inv.customer?.name ?? '—'}`}>
      <div className="space-y-6 print:space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/invoices' })} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openPaymentDialog}
              className="gap-1.5"
              disabled={balance <= 0.001}
            >
              <Wallet className="h-4 w-4" /> Record Payment
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={previewInvoicePdf}>
                  <FileText className="mr-2 h-4 w-4" /> Print Bill
                </DropdownMenuItem>
                <DropdownMenuItem onClick={previewTransportBill}>
                  <Truck className="mr-2 h-4 w-4" /> Print Transport Bill
                </DropdownMenuItem>
                <DropdownMenuItem onClick={previewOriginalBill}>
                  <ReceiptText className="mr-2 h-4 w-4" /> Print Original Bill
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setCloseSaleOpen(true)}
                  disabled={inv.status === 'PAID'}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Close Sale
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCommissionOpen(true)}>
                  <Users className="mr-2 h-4 w-4" /> Add Broker Commission
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Card className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Invoice No</div>
              <div className="font-mono text-lg font-semibold tracking-wide">{inv.invoiceNumber}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium ${optionColorClasses(statusOpt)}`}>
                {statusLabel}
              </Badge>
              {inv.paymentMethod && (
                <Badge variant="secondary" className="rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium">
                  {inv.paymentMethod}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <div className="text-muted-foreground">Customer</div>
              <div className="font-medium">{inv.customer?.name ?? '—'}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-muted-foreground">
                Phone
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-foreground"
                  onClick={openContactDialog}
                  title="Edit phone and address"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
              <div className="font-medium">{inv.customer?.mobile ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Address</div>
              <div className="font-medium">{inv.customer?.address ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Date</div>
              <div className="font-medium">{formatDateTime(inv.invoiceDate)}</div>
            </div>
          </div>

          {transport && (
            <div className="grid grid-cols-2 gap-4 border-t pt-3 text-sm md:grid-cols-4">
              <div>
                <div className="text-muted-foreground">Transport Mode</div>
                <div className="font-medium">By Road</div>
              </div>
              <div>
                <div className="text-muted-foreground">Vehicle No</div>
                <div className="font-mono font-medium">{transport.vehicleNumber || transport.transportProvider?.vehicleNumber || '—'}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t pt-3 text-sm md:grid-cols-4">
            <div>
              <div className="text-muted-foreground">Total Units</div>
              <div className="font-mono font-semibold">{totalSqft.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Secondary</div>
              <div className="font-mono font-semibold">{totalSlabs}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Received</div>
              <div className="font-mono font-semibold text-green-700">₹{received.toFixed(2)}</div>
            </div>
            {balance > 0.001 && (
              <div>
                <div className="text-muted-foreground">Balance</div>
                <div className="font-mono font-semibold text-destructive">
                  ₹{balance.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs font-medium">#</TableHead>
                <TableHead className="text-xs font-medium">Product / Granite</TableHead>
                <TableHead className="w-24 text-xs font-medium">HSN Code</TableHead>
                <TableHead className="w-24 text-xs font-medium text-right">Unit</TableHead>
                <TableHead className="w-28 text-xs font-medium text-right">Secondary Unit</TableHead>
                <TableHead className="w-24 text-xs font-medium text-right">Price</TableHead>
                <TableHead className="w-28 text-xs font-medium text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-12 text-center text-sm text-muted-foreground">No items</TableCell>
                </TableRow>
              ) : (
                items.map((item: any, i: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-sm">
                      {item.description}
                      {item.isLoadingApplicable === false && (
                        <span className="ml-2 text-[10px] uppercase text-muted-foreground">no loading</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.productVariant?.product?.hsnCode || item.hsnCode || '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number(item.qty).toFixed(2)}
                      {item.unit?.code ? ` ${item.unit.code}` : ''}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.slabCount && (item.secondaryUnitId || !item.unitId)
                        ? `${item.slabCount}${item.secondaryUnit?.code ? ` ${item.secondaryUnit.code}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{Number(item.rate).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium">
                      {Number(item.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="flex justify-end">
          <div className="w-80 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Products Subtotal</span>
              <span className="font-mono">{subtotal.toFixed(2)}</span>
            </div>
            {loadingAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Loading / Unloading{Number(inv.loadingRate) > 0 ? ` @ ₹${Number(inv.loadingRate)}/unit` : ''}</span>
                <span className="font-mono">{loadingAmount.toFixed(2)}</span>
              </div>
            )}
            {transportAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Transport{transport?.transportProvider?.name ? ` (${transport.transportProvider.name})` : ''}</span>
                <span className="font-mono">{transportAmount.toFixed(2)}</span>
              </div>
            )}
            {inv.isGst && totalTaxAmount > 0 && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>CGST @ 9%{inv.isHalfGst ? ' (half GST)' : ''}</span>
                  <span className="font-mono">{Number(inv.cgstAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>SGST @ 9%{inv.isHalfGst ? ' (half GST)' : ''}</span>
                  <span className="font-mono">{Number(inv.sgstAmount).toFixed(2)}</span>
                </div>
              </>
            )}
            {roundOffAmount > 0.001 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Round Off</span>
                <span className="font-mono">+ {roundOffAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
              <span>Grand Total</span>
              <span className="font-mono">{grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>Received</span>
              <span className="font-mono">{received.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Discount</span>
                <span className="font-mono">{discount.toFixed(2)}</span>
              </div>
            )}
            {balance > 0.001 && (
              <div className="flex justify-between font-semibold text-destructive">
                <span>Balance</span>
                <span className="font-mono">{balance.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Payment History</div>
              <div className="text-xs text-muted-foreground">
                {payments.length === 0 ? 'No payments recorded yet' : `${payments.length} payment${payments.length === 1 ? '' : 's'}`}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={openPaymentDialog}
              className="gap-1.5"
              disabled={balance <= 0.001}
            >
              <Wallet className="h-3.5 w-3.5" /> Add Payment
            </Button>
          </div>
          {payments.length > 0 && (
            <div className="space-y-2">
              {payments.map((payment: any) => (
                <div
                  key={payment.id ?? 'opening'}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      <span className="font-mono">₹{Number(payment.amount).toFixed(2)}</span>
                      {payment.paymentMethod && (
                        <Badge variant="secondary" className="rounded-full border-0 px-2 py-0 text-[10px] font-medium">
                          {payment.paymentMethod}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(payment.paymentDate)}
                      {payment.account?.name ? ` · ${payment.account.name}` : ''}
                      {payment.remarks ? ` · ${payment.remarks}` : ''}
                    </div>
                  </div>
                  {payment.id != null && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removePayment(Number(payment.id))}
                      title="Delete payment"
                      disabled={deletePayment.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex justify-between border-t px-3 pt-2 text-sm">
                <span className="text-muted-foreground">Total Received</span>
                <span className="font-mono font-semibold text-green-700">₹{received.toFixed(2)}</span>
              </div>
              <div className="flex justify-between px-3 text-sm">
                <span className="text-muted-foreground">Balance Due</span>
                <span className={`font-mono font-semibold ${balance > 0.001 ? 'text-destructive' : 'text-green-700'}`}>
                  ₹{Math.max(balance, 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </Card>

        {(inv.commissions?.length ?? 0) > 0 && (
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Broker Commissions</div>
              <Button variant="outline" size="sm" onClick={() => setCommissionOpen(true)} className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {inv.commissions.map((commission: any) => (
                <div key={commission.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{commission.broker?.name ?? 'Broker'}</div>
                    <div className="text-xs text-muted-foreground">
                      {commission.commissionPercent != null ? `${Number(commission.commissionPercent)}%` : 'Commission'}
                      {commission.isPaid ? ' · Paid' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">₹{Number(commission.commissionAmount).toFixed(2)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCommission(Number(commission.id))}
                      title="Remove commission"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {inv.remarks && (
          <Card className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Remarks</div>
            <div className="text-sm whitespace-pre-wrap">{inv.remarks}</div>
          </Card>
        )}
      </div>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
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
                  onChange={(e) => setPaymentAmount(e.target.value)}
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
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Receive Into Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts || []).map((acc: any) => (
                    <SelectItem key={acc.id} value={String(acc.id)}>
                      {acc.name} ({acc.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remarks</Label>
              <Input
                value={paymentRemarks}
                onChange={(e) => setPaymentRemarks(e.target.value)}
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
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button onClick={savePayment} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Phone & Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={editMobile} onChange={(e) => setEditMobile(e.target.value)} placeholder="Phone number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Address</Label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Address" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactOpen(false)}>Cancel</Button>
            <Button onClick={saveContactDetails} disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CloseSaleDialog invoice={inv} open={closeSaleOpen} onOpenChange={setCloseSaleOpen} />
      <BrokerCommissionDialog
        invoiceId={Number(id)}
        grandTotal={grandTotal}
        open={commissionOpen}
        onOpenChange={setCommissionOpen}
      />
    </PageLayout>
  )
}
