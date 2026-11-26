import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { safeParse } from 'valibot'
import {
  CreateResourceContactSchema,
  UpdateResourceContactSchema,
} from '@jg-app/validators'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import {
  useArchiveResource,
  useCreateResource,
  useResources,
  useUpdateResource,
  type ResourceRow,
  type TierGroup,
  type TradeContactType,
} from '../hooks/use-resources'

const contactTypeOptions: TradeContactType[] = [
  'ENGINEER',
  'BUILDER',
  'MASTRI',
  'PLUMBER',
  'ELECTRICIAN',
  'LABOR_LOADING',
  'OTHER_UTILITY',
]
const tierGroupOptions: TierGroup[] = ['GOLD', 'SILVER', 'BRONZE']

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

export function ResourcesPage() {
  const [contactTypeFilter, setContactTypeFilter] = useState<'all' | TradeContactType>('all')
  const [tierGroupFilter, setTierGroupFilter] = useState<'all' | TierGroup>('all')
  const { data: response, isLoading } = useResources({
    contactType: contactTypeFilter === 'all' ? undefined : contactTypeFilter,
    tierGroup: tierGroupFilter === 'all' ? undefined : tierGroupFilter,
  })
  const createResource = useCreateResource()
  const updateResource = useUpdateResource()
  const archiveResource = useArchiveResource()
  const resources: ResourceRow[] = response?.data ?? []

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ResourceRow | null>(null)
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [contactType, setContactType] = useState<TradeContactType>(contactTypeOptions[0])
  const [tierGroup, setTierGroup] = useState<'none' | TierGroup>('none')
  const [productNotes, setProductNotes] = useState('')
  const [address, setAddress] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')

  const reset = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setEditing(null)
      setName('')
      setMobile('')
      setContactType(contactTypeOptions[0])
      setTierGroup('none')
      setProductNotes('')
      setAddress('')
      setIsActive(true)
      setError('')
    }
  }

  const edit = (resource: ResourceRow) => {
    setEditing(resource)
    setName(resource.name)
    setMobile(resource.mobile ?? '')
    setContactType(resource.contactType)
    setTierGroup(resource.tierGroup ?? 'none')
    setProductNotes(resource.productNotes ?? '')
    setAddress(resource.address ?? '')
    setIsActive(resource.isActive)
    setError('')
    setOpen(true)
  }

  const rowActions: DataTableRowAction<ResourceRow>[] = useMemo(
    () => [
      { label: 'Edit', onClick: edit },
      {
        label: (resource) => (resource.isActive ? 'Archive' : 'Restore'),
        onClick: (resource) => {
          if (resource.isActive) archiveResource.mutate(resource.id)
          else updateResource.mutate({ id: resource.id, data: { isActive: true } })
        },
      },
    ],
    [archiveResource, updateResource],
  )

  const columns: ColumnDef<ResourceRow>[] = [
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'contactType',
      header: 'Contact type',
      cell: ({ getValue }) => <Badge variant="outline">{formatLabel(getValue<TradeContactType>())}</Badge>,
    },
    {
      accessorKey: 'tierGroup',
      header: 'Tier',
      cell: ({ getValue }) => {
        const tier = getValue<TierGroup | null>()
        if (!tier) return '—'
        return (
          <Badge
            variant={tier === 'GOLD' ? 'default' : tier === 'SILVER' ? 'secondary' : 'outline'}
            className={cn('rounded-full px-2.5 py-0.5 text-xs', tier === 'BRONZE' && 'text-muted-foreground')}
          >
            {tier}
          </Badge>
        )
      },
    },
    { accessorKey: 'mobile', header: 'Mobile' },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: ({ getValue }) => (
        <span className="block max-w-[200px] truncate text-muted-foreground">
          {getValue<string | null>() || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'productNotes',
      header: 'Product notes',
      cell: ({ getValue }) => (
        <span className="block max-w-[240px] truncate text-muted-foreground">
          {getValue<string | null>() || '—'}
        </span>
      ),
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
    const data = {
      name: name.trim(),
      mobile: mobile.trim() || undefined,
      contactType,
      tierGroup: tierGroup === 'none' ? undefined : tierGroup,
      productNotes: productNotes.trim() || undefined,
      address: address.trim() || undefined,
      isActive,
    }

    const onError = (reason: Error) => setError(reason.message)
    if (editing) {
      const parsed = safeParse(UpdateResourceContactSchema, data)
      if (!parsed.success) {
        setError(parsed.issues[0]?.message ?? 'Check the contact details')
        return
      }
      updateResource.mutate(
        { id: editing.id, data: parsed.output },
        { onSuccess: () => reset(false), onError },
      )
    } else {
      const parsed = safeParse(CreateResourceContactSchema, data)
      if (!parsed.success) {
        setError(parsed.issues[0]?.message ?? 'Check the contact details')
        return
      }
      createResource.mutate(parsed.output, { onSuccess: () => reset(false), onError })
    }
  }

  const saving = createResource.isPending || updateResource.isPending

  return (
    <PageLayout
      title="Trade Contacts"
      description="Engineers, Builders and Mastris you work with repeatedly."
      action={
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" /> Add contact
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={resources}
        searchKey={{ id: 'name', placeholder: 'Search trade contacts...' }}
        toolbarChildren={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={contactTypeFilter}
              onValueChange={(value) => setContactTypeFilter(value as 'all' | TradeContactType)}
            >
              <SelectTrigger className="w-[150px] text-xs" aria-label="Filter by contact type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All types</SelectItem>
                  {contactTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>{formatLabel(type)}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={tierGroupFilter}
              onValueChange={(value) => setTierGroupFilter(value as 'all' | TierGroup)}
            >
              <SelectTrigger className="w-[130px] text-xs" aria-label="Filter by tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All tiers</SelectItem>
                  {tierGroupOptions.map((tier) => (
                    <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No trade contacts found',
          description: 'Add an engineer, builder, or mastri to the directory.',
        }}
      />
      {(archiveResource.error || updateResource.error) && (
        <p role="alert" className="text-sm text-destructive">
          {(archiveResource.error ?? updateResource.error)?.message}
        </p>
      )}

      <Sheet open={open} onOpenChange={reset}>
        <SheetContent className="flex h-full flex-col gap-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit contact' : 'Add contact'}</SheetTitle>
          </SheetHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <form id="resource-form" onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-name">Name</Label>
              <Input id="resource-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-mobile">Mobile</Label>
              <Input id="resource-mobile" value={mobile} onChange={(event) => setMobile(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-contact-type">Contact type</Label>
              <Select value={contactType} onValueChange={(value) => setContactType(value as TradeContactType)}>
                <SelectTrigger id="resource-contact-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {contactTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>{formatLabel(type)}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-tier">Tier</Label>
              <Select value={tierGroup} onValueChange={(value) => setTierGroup(value as 'none' | TierGroup)}>
                <SelectTrigger id="resource-tier" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">No tier</SelectItem>
                    {tierGroupOptions.map((tier) => (
                      <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-product-notes">Product notes</Label>
              <Textarea id="resource-product-notes" value={productNotes} onChange={(event) => setProductNotes(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-address">Address</Label>
              <Input id="resource-address" value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
              Active contact
            </label>
          </form>
          <div className="mt-auto flex gap-2 border-t pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => reset(false)}>
              Cancel
            </Button>
            <Button type="submit" form="resource-form" className="flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save contact'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
