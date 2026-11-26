import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ExternalLink, ListTodo } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { DataTable, type DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useCrmContacts, type CrmContact, type CrmEntityType, type TierGroup } from '../hooks/use-crm'

const entityTypeOptions: CrmEntityType[] = [
  'enquiry',
  'resource',
  'customer',
  'supplier',
  'broker',
  'transport',
]
const tierGroupOptions: TierGroup[] = ['GOLD', 'SILVER', 'BRONZE']

const entityTypeBadgeClass: Record<CrmEntityType, string> = {
  enquiry: 'border-transparent bg-violet-500/12 text-violet-700 dark:text-violet-300',
  resource: 'border-transparent bg-sky-500/12 text-sky-700 dark:text-sky-300',
  customer: 'border-transparent bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  supplier: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300',
  broker: 'border-transparent bg-rose-500/12 text-rose-700 dark:text-rose-300',
  transport: 'border-transparent bg-indigo-500/12 text-indigo-700 dark:text-indigo-300',
}

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function tasksHref(contact: CrmContact): string {
  return `/tasks?contact=${encodeURIComponent(`${contact.entityType}:${contact.id}`)}`
}

export function CrmPage() {
  const [search, setSearch] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState<'all' | CrmEntityType>('all')
  const [tierGroupFilter, setTierGroupFilter] = useState<'all' | TierGroup>('all')
  const { data: response, isLoading } = useCrmContacts({
    search: search || undefined,
    entityType: entityTypeFilter === 'all' ? undefined : entityTypeFilter,
    tierGroup: tierGroupFilter === 'all' ? undefined : tierGroupFilter,
  })
  const contacts: CrmContact[] = response?.data ?? []

  const columns: ColumnDef<CrmContact>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <a href={row.original.sourceRoute} className="font-medium hover:underline">
          {row.original.name}
        </a>
      ),
    },
    {
      accessorKey: 'entityType',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue<CrmEntityType>()
        return (
          <Badge variant="outline" className={entityTypeBadgeClass[type]}>
            {formatLabel(type)}
          </Badge>
        )
      },
    },
    { accessorKey: 'categoryLabel', header: 'Category' },
    {
      accessorKey: 'tierGroup',
      header: 'Tier',
      cell: ({ getValue }) => {
        const tier = getValue<TierGroup | null | undefined>()
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
      accessorKey: 'openTasksCount',
      header: 'Open tasks',
      cell: ({ row }) => {
        const count = row.original.openTasksCount
        if (count <= 0) return <span className="text-muted-foreground">N/A</span>
        return (
          <a
            href={tasksHref(row.original)}
            aria-label={`View ${count} open task${count === 1 ? '' : 's'} for ${row.original.name}`}
            className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Badge variant="default" className="hover:bg-primary/85">{count}</Badge>
          </a>
        )
      },
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ getValue }) => (
        <span className="block max-w-[240px] truncate text-muted-foreground">
          {getValue<string | null | undefined>() || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.isActive !== false
        return (
          <Badge
            variant={active ? 'success' : 'secondary'}
            className={cn(!active && 'text-muted-foreground')}
          >
            {active ? 'Active' : 'Archived'}
          </Badge>
        )
      },
    },
  ]

  const rowActions: DataTableRowAction<CrmContact>[] = useMemo(
    () => [
      {
        label: 'View record',
        icon: ExternalLink,
        onClick: (contact) => window.location.assign(contact.sourceRoute),
      },
      {
        label: 'View tasks',
        icon: ListTodo,
        onClick: (contact) => window.location.assign(tasksHref(contact)),
      },
    ],
    [],
  )

  return (
    <PageLayout
      title="CRM Directory"
      description="One directory for enquiries, trade contacts, customers, suppliers, brokers and transport."
    >
      <DataTable
        columns={columns}
        data={contacts}
        rowActions={rowActions}
        toolbarChildren={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts..."
              aria-label="Search CRM contacts"
              className="w-[200px]"
            />
            <Select
              value={entityTypeFilter}
              onValueChange={(value) => setEntityTypeFilter(value as 'all' | CrmEntityType)}
            >
              <SelectTrigger className="w-[150px] text-xs" aria-label="Filter by entity type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All types</SelectItem>
                  {entityTypeOptions.map((type) => (
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
        isLoading={isLoading}
        emptyState={{
          title: 'No contacts found',
          description: 'Try a different search or clear the filters.',
        }}
      />
    </PageLayout>
  )
}
