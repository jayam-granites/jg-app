import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { safeParse } from 'valibot'
import {
  CreateCustomerEnquirySchema,
  UpdateCustomerEnquirySchema,
} from '@jg-app/validators'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import {
  useArchiveEnquiry,
  useCreateEnquiry,
  useEnquiries,
  useLogFollowUp,
  useUpdateEnquiry,
  type EnquiryRow,
  type EnquiryStatus,
} from '../hooks/use-enquiries'

const statuses: EnquiryStatus[] = [
  'OPEN',
  'FOLLOW_UP_1',
  'FOLLOW_UP_2',
  'CLOSED_WON',
  'CLOSED_LOST',
]

function toLocalInputValue(value: string): string {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export function EnquiriesPage() {
  const { data: response, isLoading } = useEnquiries()
  const createEnquiry = useCreateEnquiry()
  const updateEnquiry = useUpdateEnquiry()
  const archiveEnquiry = useArchiveEnquiry()
  const logFollowUp = useLogFollowUp()
  const enquiries: EnquiryRow[] = response?.data ?? []

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EnquiryRow | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [mobile, setMobile] = useState('')
  const [requirementsNotes, setRequirementsNotes] = useState('')
  const [status, setStatus] = useState<EnquiryStatus>('OPEN')
  const [closeReason, setCloseReason] = useState('')
  const [followUpDueDate, setFollowUpDueDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')

  const isClosed = status === 'CLOSED_WON' || status === 'CLOSED_LOST'

  const reset = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setEditing(null)
      setCustomerName('')
      setMobile('')
      setRequirementsNotes('')
      setStatus('OPEN')
      setCloseReason('')
      setFollowUpDueDate('')
      setIsActive(true)
      setError('')
    }
  }

  const edit = (enquiry: EnquiryRow) => {
    setEditing(enquiry)
    setCustomerName(enquiry.customerName)
    setMobile(enquiry.mobile)
    setRequirementsNotes(enquiry.requirementsNotes ?? '')
    setStatus(enquiry.status)
    setCloseReason(enquiry.closeReason ?? '')
    setFollowUpDueDate(enquiry.followUpDueDate ? toLocalInputValue(enquiry.followUpDueDate) : '')
    setIsActive(enquiry.isActive)
    setError('')
    setOpen(true)
  }

  const rowActions: DataTableRowAction<EnquiryRow>[] = useMemo(
    () => [
      { label: 'Edit', onClick: edit },
      {
        label: 'Log follow-up',
        disabled: (enquiry) => !enquiry.isActive,
        onClick: (enquiry) => logFollowUp.mutate({ id: enquiry.id }),
      },
      {
        label: (enquiry) => (enquiry.isActive ? 'Archive' : 'Restore'),
        onClick: (enquiry) => {
          if (enquiry.isActive) archiveEnquiry.mutate(enquiry.id)
          else updateEnquiry.mutate({ id: enquiry.id, data: { isActive: true } })
        },
      },
    ],
    [archiveEnquiry, logFollowUp, updateEnquiry],
  )

  const columns: ColumnDef<EnquiryRow>[] = [
    { accessorKey: 'customerName', header: 'Customer' },
    { accessorKey: 'mobile', header: 'Mobile' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const value = getValue<EnquiryStatus>()
        return (
          <Badge
            variant={
              value === 'CLOSED_WON'
                ? 'default'
                : value === 'CLOSED_LOST'
                  ? 'destructive'
                  : value.startsWith('FOLLOW_UP')
                    ? 'secondary'
                    : 'outline'
            }
          >
            {value.replaceAll('_', ' ')}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'followUpCount',
      header: 'Follow-ups',
      cell: ({ getValue }) => <Badge variant="outline">{getValue<number>()}</Badge>,
    },
    {
      accessorKey: 'closeReason',
      header: 'Close reason',
      cell: ({ getValue }) => getValue<string | null | undefined>() || '—',
    },
    {
      accessorKey: 'isActive',
      header: 'Record',
      cell: ({ getValue }) => {
        const active = getValue<boolean>()
        return (
          <Badge variant={active ? 'outline' : 'secondary'}>
            {active ? 'Active' : 'Archived'}
          </Badge>
        )
      },
    },
  ]

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (isClosed && !closeReason.trim()) {
      setError('Close reason is required when closing an enquiry')
      return
    }

    const data = {
      customerName: customerName.trim(),
      mobile: mobile.trim(),
      requirementsNotes: requirementsNotes.trim(),
      status,
      closeReason: closeReason.trim() || undefined,
      isActive,
      ...(editing && followUpDueDate
        ? { followUpDueDate: new Date(followUpDueDate).toISOString() }
        : {}),
    }

    const onError = (reason: Error) => setError(reason.message)
    if (editing) {
      const parsed = safeParse(UpdateCustomerEnquirySchema, data)
      if (!parsed.success) {
        setError(parsed.issues[0]?.message ?? 'Check the enquiry details')
        return
      }
      updateEnquiry.mutate(
        { id: editing.id, data: parsed.output },
        { onSuccess: () => reset(false), onError },
      )
    } else {
      const parsed = safeParse(CreateCustomerEnquirySchema, data)
      if (!parsed.success) {
        setError(parsed.issues[0]?.message ?? 'Check the enquiry details')
        return
      }
      createEnquiry.mutate(parsed.output, { onSuccess: () => reset(false), onError })
    }
  }

  const saving = createEnquiry.isPending || updateEnquiry.isPending || logFollowUp.isPending

  return (
    <PageLayout
      title="Customer Enquiries"
      description="Track requirements, follow-ups and close reasons"
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
          description: 'Capture a customer requirement to start the follow-up pipeline.',
        }}
      />
      {(archiveEnquiry.error || updateEnquiry.error || logFollowUp.error) && (
        <p role="alert" className="text-sm text-destructive">
          {(archiveEnquiry.error ?? updateEnquiry.error ?? logFollowUp.error)?.message}
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
              <Label htmlFor="enquiry-requirements">Requirements, quotes &amp; follow-up history</Label>
              <Textarea id="enquiry-requirements" value={requirementsNotes} onChange={(event) => setRequirementsNotes(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="enquiry-status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as EnquiryStatus)}>
                <SelectTrigger id="enquiry-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statuses.map((value) => (
                      <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="enquiry-close-reason">Close reason</Label>
              <Input
                id="enquiry-close-reason"
                value={closeReason}
                onChange={(event) => setCloseReason(event.target.value)}
                required={isClosed}
                placeholder={isClosed ? 'Required when closing' : 'Optional'}
              />
            </div>
            {editing && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="enquiry-follow-up-date">Next follow-up date</Label>
                <Input
                  id="enquiry-follow-up-date"
                  type="datetime-local"
                  value={followUpDueDate}
                  onChange={(event) => setFollowUpDueDate(event.target.value)}
                />
              </div>
            )}
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
