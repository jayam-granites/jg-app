import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { safeParse } from 'valibot'
import {
  CreateCustomerEnquirySchema,
  type CreateCustomerEnquiryFormData,
} from '@jg-app/validators'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useArchiveEnquiry, useCreateEnquiry, useEnquiries, useUpdateEnquiry } from '../hooks/use-enquiries'

type EnquiryRow = {
  id: number
  customerName: string
  mobile: string
  siteLocation: string | null
  materialInterest: string
  sizeOrUnit: string | null
  quantity: number | string | null
  quotedPrice: number | string | null
  notes: string | null
  status: 'NEW' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST'
  isActive: boolean
}

const statuses: NonNullable<CreateCustomerEnquiryFormData['status']>[] = [
  'NEW',
  'QUOTED',
  'NEGOTIATING',
  'WON',
  'LOST',
]

export function EnquiriesPage() {
  const { data: response, isLoading } = useEnquiries()
  const createEnquiry = useCreateEnquiry()
  const updateEnquiry = useUpdateEnquiry()
  const archiveEnquiry = useArchiveEnquiry()
  const enquiries: EnquiryRow[] = response?.data ?? []

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EnquiryRow | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [mobile, setMobile] = useState('')
  const [siteLocation, setSiteLocation] = useState('')
  const [materialInterest, setMaterialInterest] = useState('')
  const [sizeOrUnit, setSizeOrUnit] = useState('')
  const [quantity, setQuantity] = useState('')
  const [quotedPrice, setQuotedPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<EnquiryRow['status']>('NEW')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')

  const reset = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setEditing(null)
      setCustomerName('')
      setMobile('')
      setSiteLocation('')
      setMaterialInterest('')
      setSizeOrUnit('')
      setQuantity('')
      setQuotedPrice('')
      setNotes('')
      setStatus('NEW')
      setIsActive(true)
      setError('')
    }
  }

  const edit = (enquiry: EnquiryRow) => {
    setEditing(enquiry)
    setCustomerName(enquiry.customerName)
    setMobile(enquiry.mobile)
    setSiteLocation(enquiry.siteLocation ?? '')
    setMaterialInterest(enquiry.materialInterest)
    setSizeOrUnit(enquiry.sizeOrUnit ?? '')
    setQuantity(enquiry.quantity == null ? '' : String(enquiry.quantity))
    setQuotedPrice(enquiry.quotedPrice == null ? '' : String(enquiry.quotedPrice))
    setNotes(enquiry.notes ?? '')
    setStatus(enquiry.status)
    setIsActive(enquiry.isActive)
    setError('')
    setOpen(true)
  }

  const rowActions: DataTableRowAction<EnquiryRow>[] = useMemo(
    () => [
      { label: 'Edit', onClick: edit },
      {
        label: (enquiry) => (enquiry.isActive ? 'Archive' : 'Restore'),
        onClick: (enquiry) => {
          if (enquiry.isActive) archiveEnquiry.mutate(enquiry.id)
          else updateEnquiry.mutate({ id: enquiry.id, data: { isActive: true } })
        },
      },
    ],
    [archiveEnquiry, updateEnquiry],
  )

  const columns: ColumnDef<EnquiryRow>[] = [
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'mobile', header: 'Mobile' },
    { accessorKey: 'materialInterest', header: 'Material' },
    {
      id: 'quantity',
      header: 'Requirement',
      cell: ({ row }) => [row.original.quantity, row.original.sizeOrUnit].filter(Boolean).join(' ') || '-',
    },
    {
      accessorKey: 'quotedPrice',
      header: 'Quoted price',
      cell: ({ getValue }) => {
        const value = getValue<number | string | null>()
        return value == null ? '-' : `₹${Number(value).toLocaleString('en-IN')}`
      },
    },
    {
      accessorKey: 'status',
      header: 'Pipeline',
      cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>().replaceAll('_', ' ')}</Badge>,
    },
    {
      accessorKey: 'isActive',
      header: 'Record',
      cell: ({ getValue }) => (
        <Badge variant={getValue<boolean>() ? 'outline' : 'secondary'}>
          {getValue<boolean>() ? 'Active' : 'Archived'}
        </Badge>
      ),
    },
  ]

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = {
      customerName: customerName.trim(),
      mobile: mobile.trim(),
      siteLocation: siteLocation.trim() || undefined,
      materialInterest: materialInterest.trim(),
      sizeOrUnit: sizeOrUnit.trim() || undefined,
      quantity: quantity ? Number(quantity) : undefined,
      quotedPrice: quotedPrice ? Number(quotedPrice) : undefined,
      notes: notes.trim() || undefined,
      status,
      isActive,
    }
    const parsed = safeParse(CreateCustomerEnquirySchema, data)
    if (!parsed.success) {
      setError(parsed.issues[0]?.message ?? 'Check the enquiry details')
      return
    }

    const onError = (reason: Error) => setError(reason.message)
    if (editing) {
      updateEnquiry.mutate(
        { id: editing.id, data: parsed.output },
        { onSuccess: () => reset(false), onError },
      )
    } else {
      createEnquiry.mutate(parsed.output, { onSuccess: () => reset(false), onError })
    }
  }

  const saving = createEnquiry.isPending || updateEnquiry.isPending

  return (
    <PageLayout
      title="Customer Enquiries"
      description="Track requirements, pricing, and follow-up history"
      action={
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" /> Add enquiry
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={enquiries}
        searchKey={{ id: 'customerName', placeholder: 'Search enquiries...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No enquiries found',
          description: 'Capture a customer requirement to start the sales pipeline.',
        }}
      />
      {(archiveEnquiry.error || updateEnquiry.error) && (
        <p role="alert" className="text-sm text-destructive">
          {(archiveEnquiry.error ?? updateEnquiry.error)?.message}
        </p>
      )}

      <Sheet open={open} onOpenChange={reset}>
        <SheetContent className="flex h-full flex-col gap-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit enquiry' : 'Add enquiry'}</SheetTitle>
          </SheetHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <form id="enquiry-form" onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label htmlFor="enquiry-customer">Customer name</Label>
              <Input id="enquiry-customer" value={customerName} onChange={(event) => setCustomerName(event.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="enquiry-mobile">Mobile</Label>
              <Input id="enquiry-mobile" value={mobile} onChange={(event) => setMobile(event.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="enquiry-location">Site location</Label>
              <Input id="enquiry-location" value={siteLocation} onChange={(event) => setSiteLocation(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="enquiry-material">Material interest</Label>
              <Input id="enquiry-material" value={materialInterest} onChange={(event) => setMaterialInterest(event.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="enquiry-quantity">Quantity</Label>
                <Input id="enquiry-quantity" type="number" min="0" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="enquiry-unit">Size / unit</Label>
                <Input id="enquiry-unit" value={sizeOrUnit} onChange={(event) => setSizeOrUnit(event.target.value)} placeholder="e.g. sqft" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="enquiry-price">Quoted price</Label>
              <Input id="enquiry-price" type="number" min="0" step="0.01" value={quotedPrice} onChange={(event) => setQuotedPrice(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="enquiry-status">Status</Label>
              <select
                id="enquiry-status"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as EnquiryRow['status'])}
              >
                {statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="enquiry-notes">Follow-up notes & requirements history</Label>
              <Textarea id="enquiry-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
              Active enquiry
            </label>
          </form>
          <div className="mt-auto flex gap-2 border-t pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => reset(false)}>
              Cancel
            </Button>
            <Button type="submit" form="enquiry-form" className="flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save enquiry'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
