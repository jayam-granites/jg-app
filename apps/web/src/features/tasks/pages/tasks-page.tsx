import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { safeParse } from 'valibot'
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  type CreateTaskFormData,
} from '@jg-app/validators'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useEnquiries } from '@/features/enquiries/hooks/use-enquiries'
import { useResources } from '@/features/resources/hooks/use-resources'
import { useArchiveTask, useCreateTask, useTasks, useUpdateTask, type TaskRecord } from '../hooks/use-tasks'

const priorities: NonNullable<CreateTaskFormData['priority']>[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const statuses: NonNullable<CreateTaskFormData['status']>[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]
const openStatuses = new Set(['PENDING', 'IN_PROGRESS'])

function localInputValue(value: string): string {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function dateLabel(value: string): string {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function TasksPage() {
  const { data: taskResponse, isLoading } = useTasks()
  const { data: enquiryResponse } = useEnquiries()
  const { data: resourceResponse } = useResources()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const archiveTask = useArchiveTask()
  const tasks: TaskRecord[] = taskResponse?.data ?? []
  const enquiries = (enquiryResponse?.data ?? []).filter((enquiry) => enquiry.isActive)
  const resources = (resourceResponse?.data ?? []).filter((resource) => resource.isActive)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TaskRecord | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<NonNullable<CreateTaskFormData['priority']>>('MEDIUM')
  const [status, setStatus] = useState<NonNullable<CreateTaskFormData['status']>>('PENDING')
  const [enquiryId, setEnquiryId] = useState('')
  const [resourceId, setResourceId] = useState('')
  const [error, setError] = useState('')

  const reset = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setEditing(null)
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority('MEDIUM')
      setStatus('PENDING')
      setEnquiryId('')
      setResourceId('')
      setError('')
    }
  }

  const edit = (task: TaskRecord) => {
    setEditing(task)
    setTitle(task.title)
    setDescription(task.description ?? '')
    setDueDate(localInputValue(task.dueDate))
    setPriority(task.priority)
    setStatus(task.status)
    setEnquiryId(task.enquiryId == null ? '' : String(task.enquiryId))
    setResourceId(task.resourceId == null ? '' : String(task.resourceId))
    setError('')
    setOpen(true)
  }

  const rowActions: DataTableRowAction<TaskRecord>[] = useMemo(
    () => [
      { label: 'Edit', onClick: edit },
      {
        label: 'Archive',
        variant: 'destructive',
        onClick: (task) => archiveTask.mutate(task.id),
      },
    ],
    [archiveTask],
  )

  const columns: ColumnDef<TaskRecord>[] = [
    { accessorKey: 'title', header: 'Task' },
    {
      id: 'relatedContact',
      header: 'Linked contact',
      cell: ({ row }) => row.original.enquiry?.customerName ?? row.original.resource?.name ?? '-',
    },
    {
      accessorKey: 'dueDate',
      header: 'Due',
      cell: ({ getValue }) => dateLabel(getValue<string>()),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => {
        const value = getValue<TaskRecord['priority']>()
        return <Badge variant={value === 'URGENT' ? 'destructive' : value === 'HIGH' ? 'default' : 'secondary'}>{value}</Badge>
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <Badge variant="outline">{getValue<string>().replaceAll('_', ' ')}</Badge>,
    },
  ]

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : '',
      priority,
      status,
      ...(editing
        ? { enquiryId: enquiryId ? Number(enquiryId) : null, resourceId: resourceId ? Number(resourceId) : null }
        : {
            ...(enquiryId ? { enquiryId: Number(enquiryId) } : {}),
            ...(resourceId ? { resourceId: Number(resourceId) } : {}),
          }),
    }
    const onError = (reason: Error) => setError(reason.message)
    if (editing) {
      const parsed = safeParse(UpdateTaskSchema, data)
      if (!parsed.success) {
        setError(parsed.issues[0]?.message ?? 'Check the task details')
        return
      }
      updateTask.mutate(
        { id: editing.id, data: parsed.output },
        { onSuccess: () => reset(false), onError },
      )
    } else {
      const parsed = safeParse(CreateTaskSchema, data)
      if (!parsed.success) {
        setError(parsed.issues[0]?.message ?? 'Check the task details')
        return
      }
      createTask.mutate(parsed.output, { onSuccess: () => reset(false), onError })
    }
  }

  const now = new Date()
  const openTasks = tasks.filter((task) => openStatuses.has(task.status))
  const overdueCount = openTasks.filter((task) => new Date(task.dueDate) < now).length
  const dueTodayCount = openTasks.filter((task) => {
    const due = new Date(task.dueDate)
    return due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
  }).length
  const urgentCount = openTasks.filter((task) => task.priority === 'URGENT').length

  const saving = createTask.isPending || updateTask.isPending

  return (
    <PageLayout
      title="Tasks & Follow-ups"
      description="Prioritize work, track due dates, and follow up on open items"
      action={
        <Button onClick={() => setOpen(true)}>
          <Plus data-icon="inline-start" /> Add task
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Open tasks</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{openTasks.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Due today</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{dueTodayCount}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Overdue / urgent</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{overdueCount} / {urgentCount}</CardContent>
        </Card>
      </div>
      <DataTable
        columns={columns}
        data={tasks}
        searchKey={{ id: 'title', placeholder: 'Search tasks...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No tasks found',
          description: 'Create a task to track a customer follow-up or resource assignment.',
        }}
      />
      {archiveTask.error && (
        <p role="alert" className="text-sm text-destructive">{archiveTask.error.message}</p>
      )}

      <Sheet open={open} onOpenChange={reset}>
        <SheetContent className="flex h-full flex-col gap-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit task' : 'Add task'}</SheetTitle>
          </SheetHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <form id="task-form" onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto">
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-due">Due date and time</Label>
              <Input id="task-due" type="datetime-local" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-priority">Priority</Label>
                <select
                  id="task-priority"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as typeof priority)}
                >
                  {priorities.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-status">Status</Label>
                <select
                  id="task-status"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as typeof status)}
                >
                  {statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-enquiry">Customer enquiry</Label>
              <select
                id="task-enquiry"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={enquiryId}
                onChange={(event) => setEnquiryId(event.target.value)}
              >
                <option value="">Not linked</option>
                {enquiries.map((enquiry) => <option key={enquiry.id} value={enquiry.id}>{enquiry.customerName} — {enquiry.materialInterest}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-resource">Resource contact</Label>
              <select
                id="task-resource"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={resourceId}
                onChange={(event) => setResourceId(event.target.value)}
              >
                <option value="">Not linked</option>
                {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.name} — {resource.category.replaceAll('_', ' ')}</option>)}
              </select>
            </div>
          </form>
          <div className="mt-auto flex gap-2 border-t pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => reset(false)}>
              Cancel
            </Button>
            <Button type="submit" form="task-form" className="flex-1" disabled={saving}>
              {saving ? 'Saving…' : 'Save task'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
