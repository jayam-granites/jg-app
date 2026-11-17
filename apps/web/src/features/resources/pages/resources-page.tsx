import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { safeParse } from 'valibot'
import {
  CreateResourceContactSchema,
  type CreateResourceContactFormData,
} from '@jg-app/validators'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useArchiveResource, useCreateResource, useResources, useUpdateResource } from '../hooks/use-resources'

type ResourceRow = {
  id: number
  name: string
  category: CreateResourceContactFormData['category']
  mobile: string | null
  address: string | null
  stdWageRate: number | string | null
  isAvailable: boolean
  notes: string | null
  isActive: boolean
}

const categories: CreateResourceContactFormData['category'][] = [
  'ENGINEER',
  'BUILDER',
  'MASTRI',
  'PLUMBER',
  'ELECTRICIAN',
  'LABOR_LOADING',
  'OTHER_UTILITY',
]

export function ResourcesPage() {
  const { data: response, isLoading } = useResources()
  const createResource = useCreateResource()
  const updateResource = useUpdateResource()
  const archiveResource = useArchiveResource()
  const resources: ResourceRow[] = response?.data ?? []

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ResourceRow | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ResourceRow['category']>('ENGINEER')
  const [mobile, setMobile] = useState('')
  const [address, setAddress] = useState('')
  const [stdWageRate, setStdWageRate] = useState('')
  const [notes, setNotes] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')

  const reset = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setEditing(null)
      setName('')
      setCategory('ENGINEER')
      setMobile('')
      setAddress('')
      setStdWageRate('')
      setNotes('')
      setIsAvailable(true)
      setIsActive(true)
      setError('')
    }
  }

  const edit = (resource: ResourceRow) => {
    setEditing(resource)
    setName(resource.name)
    setCategory(resource.category)
    setMobile(resource.mobile ?? '')
    setAddress(resource.address ?? '')
    setStdWageRate(resource.stdWageRate == null ? '' : String(resource.stdWageRate))
    setNotes(resource.notes ?? '')
    setIsAvailable(resource.isAvailable)
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
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'mobile', header: 'Mobile' },
    {
      accessorKey: 'stdWageRate',
      header: 'Standard wage',
      cell: ({ getValue }) => {
        const value = getValue<number | string | null>()
        return value == null ? '-' : `₹${Number(value).toLocaleString('en-IN')}`
      },
    },
    {
      accessorKey: 'isAvailable',
      header: 'Availability',
      cell: ({ getValue }) => (
        <Badge variant={getValue<boolean>() ? 'default' : 'secondary'}>
          {getValue<boolean>() ? 'Available' : 'Unavailable'}
        </Badge>
      ),
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
      name: name.trim(),
      category,
      mobile: mobile.trim() || undefined,
      address: address.trim() || undefined,
      stdWageRate: stdWageRate ? Number(stdWageRate) : undefined,
      notes: notes.trim() || undefined,
      isAvailable,
      isActive,
    }
    const parsed = safeParse(CreateResourceContactSchema, data)
    if (!parsed.success) {
      setError(parsed.issues[0]?.message ?? 'Check the resource details')
      return
    }

    const onError = (reason: Error) => setError(reason.message)
    if (editing) {
      updateResource.mutate(
        { id: editing.id, data: parsed.output },
        { onSuccess: () => reset(false), onError },
      )
    } else {
      createResource.mutate(parsed.output, { onSuccess: () => reset(false), onError })
    }
  }

  const saving = createResource.isPending || updateResource.isPending

  return (
    <PageLayout
      title="Workforce & Resources"
      description="Manage tradespeople and site resources"
      action={
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" /> Add resource
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={resources}
        searchKey={{ id: 'name', placeholder: 'Search resources...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No resources found',
          description: 'Add an engineer, builder, or tradesperson to the directory.',
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
            <SheetTitle>{editing ? 'Edit resource' : 'Add resource'}</SheetTitle>
          </SheetHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <form id="resource-form" onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-name">Name</Label>
              <Input id="resource-name" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-category">Category</Label>
              <select
                id="resource-category"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={category}
                onChange={(event) => setCategory(event.target.value as ResourceRow['category'])}
              >
                {categories.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-mobile">Mobile</Label>
              <Input id="resource-mobile" value={mobile} onChange={(event) => setMobile(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-address">Address</Label>
              <Input id="resource-address" value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-wage">Standard wage rate</Label>
              <Input
                id="resource-wage"
                type="number"
                min="0"
                step="0.01"
                value={stdWageRate}
                onChange={(event) => setStdWageRate(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource-notes">Notes</Label>
              <Textarea id="resource-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isAvailable} onCheckedChange={(checked) => setIsAvailable(checked === true)} />
              Available for work
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
              Active record
            </label>
          </form>
          <div className="mt-auto flex gap-2 border-t pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => reset(false)}>
              Cancel
            </Button>
            <Button type="submit" form="resource-form" className="flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save resource'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
