import { useMemo, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { CalendarDays, Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { safeParse } from 'valibot'
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  type CreateTaskFormData,
  type UpdateTaskFormData,
} from '@jg-app/validators'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import EventCalendar, { type CalendarEvent, type EventTone } from '@/components/ui/event-calendar'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useCrmContacts } from '@/features/crm/hooks/use-crm'
import { useArchiveTask, useCreateTask, useTasks, useUpdateTask, type TaskRecord } from '../hooks/use-tasks'
import { formatDate } from '@/lib/date'
import dayjs from '@/lib/dayjs'

const priorities: NonNullable<CreateTaskFormData['priority']>[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const statuses: NonNullable<CreateTaskFormData['status']>[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]
const openStatuses = new Set(['PENDING', 'IN_PROGRESS'])

const TONE_BY_PRIORITY: Record<NonNullable<CreateTaskFormData['priority']>, EventTone> = {
  LOW: 'info',
  MEDIUM: 'accent',
  HIGH: 'warning',
  URGENT: 'danger',
}

const PRIORITY_BY_TONE: Record<EventTone, NonNullable<CreateTaskFormData['priority']>> = {
  accent: 'MEDIUM',
  success: 'MEDIUM',
  warning: 'HIGH',
  danger: 'URGENT',
  info: 'LOW',
  neutral: 'LOW',
}

function taskTone(task: TaskRecord): EventTone {
  if (task.status === 'COMPLETED') return 'success'
  if (task.status === 'CANCELLED') return 'neutral'
  return TONE_BY_PRIORITY[task.priority]
}

const LINK_FIELDS = ['enquiryId', 'resourceId', 'customerId', 'supplierId', 'brokerId', 'transportId'] as const
type LinkField = (typeof LINK_FIELDS)[number]
type LinkValues = Partial<Record<LinkField, number | null>>

const ENTITY_BY_FIELD: Record<LinkField, string> = {
  enquiryId: 'enquiry',
  resourceId: 'resource',
  customerId: 'customer',
  supplierId: 'supplier',
  brokerId: 'broker',
  transportId: 'transport',
}

const LABEL_BY_FIELD: Record<LinkField, string> = {
  enquiryId: 'Enquiry',
  resourceId: 'Trade contact',
  customerId: 'Customer',
  supplierId: 'Supplier',
  brokerId: 'Broker',
  transportId: 'Transport',
}

const FIELD_BY_ENTITY: Record<string, LinkField> = {
  enquiry: 'enquiryId',
  enquiries: 'enquiryId',
  customerenquiry: 'enquiryId',
  resource: 'resourceId',
  resources: 'resourceId',
  resourcecontact: 'resourceId',
  trade: 'resourceId',
  tradecontact: 'resourceId',
  customer: 'customerId',
  customers: 'customerId',
  supplier: 'supplierId',
  suppliers: 'supplierId',
  broker: 'brokerId',
  brokers: 'brokerId',
  transport: 'transportId',
  transports: 'transportId',
  transportcontact: 'transportId',
}

type ContactOption = {
  id: number
  entityType: string
  name: string
  mobile?: string | null
  categoryLabel: string | null
  tierGroup?: string | null
}

function localInputValue(value: string): string {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function normalizeEntityType(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]/g, '')
}

function parseLinkedValue(value: string): { field: LinkField; id: number } | null {
  if (!value) return null
  const [rawType, rawId] = value.split(':')
  const field = FIELD_BY_ENTITY[normalizeEntityType(rawType ?? '')]
  const id = Number(rawId)
  if (!field || !Number.isInteger(id) || id <= 0) return null
  return { field, id }
}

function linkedField(task: TaskRecord): LinkField | null {
  return LINK_FIELDS.find((field) => task[field] != null) ?? null
}

function linkedName(task: TaskRecord): string {
  return (
    task.enquiry?.customerName ||
    task.resource?.name ||
    task.customer?.name ||
    task.supplier?.name ||
    task.broker?.name ||
    task.transport?.name ||
    '-'
  )
}

export function TasksPage() {
  const { data: taskResponse, isLoading } = useTasks()
  const { data: crmResponse } = useCrmContacts()
  const { contact: contactParam } = useSearch({ strict: false }) as { contact?: string }
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const archiveTask = useArchiveTask()
  const contacts: ContactOption[] = crmResponse?.data ?? []

  const contactFilter = parseLinkedValue(contactParam ?? '')
  const contactName = contactFilter
    ? contacts.find(
        (contact) =>
          contact.id === contactFilter.id && FIELD_BY_ENTITY[normalizeEntityType(contact.entityType)] === contactFilter.field,
      )?.name ?? 'selected contact'
    : null
  const allTasks: TaskRecord[] = taskResponse?.data ?? []
  const tasks = contactFilter
    ? allTasks.filter((task) => task[contactFilter.field] === contactFilter.id)
    : allTasks

  const [open, setOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [editing, setEditing] = useState<TaskRecord | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<NonNullable<CreateTaskFormData['priority']>>('MEDIUM')
  const [status, setStatus] = useState<NonNullable<CreateTaskFormData['status']>>('PENDING')
  const [linkedContact, setLinkedContact] = useState('none')
  const [error, setError] = useState('')

  const contactOptions = useMemo(() => {
    const options = contacts.map((contact) => ({
      value: `${contact.entityType}:${contact.id}`,
      label: [contact.name, contact.categoryLabel, contact.tierGroup].filter(Boolean).join(' — '),
    }))
    if (!editing) return options
    const currentField = linkedField(editing)
    if (!currentField) return options
    const currentId = editing[currentField]
    if (currentId == null) return options
    const isListed = options.some((option) => {
      const parsed = parseLinkedValue(option.value)
      return parsed?.field === currentField && parsed.id === currentId
    })
    if (!isListed) {
      options.unshift({
        value: `${ENTITY_BY_FIELD[currentField]}:${currentId}`,
        label: `${linkedName(editing)} — Current link`,
      })
    }
    return options
  }, [contacts, editing])

  const reset = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setEditing(null)
      setTitle('')
      setDescription('')
      setDueDate('')
      setPriority('MEDIUM')
      setStatus('PENDING')
      setLinkedContact('none')
      setError('')
    }
  }

  const edit = (task: TaskRecord) => {
    const currentField = linkedField(task)
    const currentId = currentField ? task[currentField] : null
    setEditing(task)
    setTitle(task.title)
    setDescription(task.description ?? '')
    setDueDate(localInputValue(task.dueDate))
    setPriority(task.priority)
    setStatus(task.status)
    setLinkedContact(currentField && currentId != null ? `${ENTITY_BY_FIELD[currentField]}:${currentId}` : 'none')
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
      id: 'linkedContact',
      header: 'Linked contact',
      cell: ({ row }) => linkedName(row.original),
    },
    {
      id: 'linkedContactType',
      header: 'Type',
      cell: ({ row }) => {
        const field = linkedField(row.original)
        return field ? <Badge variant="outline">{LABEL_BY_FIELD[field]}</Badge> : '-'
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due',
      cell: ({ getValue }) => formatDate(getValue<string>()),
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
    const selected = parseLinkedValue(linkedContact)
    const linkValues: LinkValues = {}
    if (editing) {
      for (const field of LINK_FIELDS) linkValues[field] = null
      if (selected) linkValues[selected.field] = selected.id
    } else if (selected) {
      linkValues[selected.field] = selected.id
    }
    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : '',
      priority,
      status,
      ...linkValues,
    }
    const onError = (reason: Error) => setError(reason.message)
    if (editing) {
      const parsed = safeParse(UpdateTaskSchema, data)
      if (!parsed.success) {
        setError(parsed.issues[0]?.message ?? 'Check the task details')
        return
      }
      updateTask.mutate(
        { id: editing.id, data: { ...parsed.output, ...linkValues } as UpdateTaskFormData },
        { onSuccess: () => reset(false), onError },
      )
    } else {
      const parsed = safeParse(CreateTaskSchema, data)
      if (!parsed.success) {
        setError(parsed.issues[0]?.message ?? 'Check the task details')
        return
      }
      createTask.mutate({ ...parsed.output, ...linkValues } as CreateTaskFormData, {
        onSuccess: () => reset(false),
        onError,
      })
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

  const calendarEvents: CalendarEvent[] = allTasks.map((task) => {
    const contact = linkedName(task)
    const statusLabel = task.status.replaceAll('_', ' ')
    return {
      id: String(task.id),
      title: task.title,
      date: new Date(task.dueDate),
      time: dayjs(task.dueDate).format('HH:mm'),
      description: [contact === '-' ? null : contact, statusLabel].filter(Boolean).join(' · '),
      tone: taskTone(task),
    }
  })

  const handleCalendarAdd = (event: CalendarEvent) => {
    const [hours = 9, minutes = 0] = (event.time || '09:00').split(':').map(Number)
    const dueDate = new Date(event.date)
    dueDate.setHours(hours, minutes, 0, 0)
    createTask.mutate({
      title: event.title,
      description: event.description,
      dueDate: dueDate.toISOString(),
      priority: PRIORITY_BY_TONE[event.tone ?? 'accent'],
      status: 'PENDING',
    })
  }

  const handleCalendarUpdate = (event: CalendarEvent) => {
    const id = Number(event.id)
    if (!Number.isFinite(id)) return
    updateTask.mutate({
      id,
      data: {
        title: event.title,
        description: event.description,
      },
    })
  }

  const handleCalendarRemove = (id: string) => {
    const taskId = Number(id)
    if (Number.isFinite(taskId)) archiveTask.mutate(taskId)
  }

  const saving = createTask.isPending || updateTask.isPending

  return (
    <PageLayout
      title="Tasks & Follow-ups"
      description="Prioritize work, track due dates, and follow up on open items"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="View follow-up calendar"
            title="View follow-up calendar"
            onClick={() => setCalendarOpen(true)}
          >
            <CalendarDays />
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" /> Add task
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Open tasks</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold tracking-tight">{openTasks.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Due today</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold tracking-tight">{dueTodayCount}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Overdue / urgent</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold tracking-tight">{overdueCount} / {urgentCount}</CardContent>
        </Card>
      </div>
      {contactFilter && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Showing tasks for <span className="font-medium text-foreground">{contactName}</span>
          </span>
          <a href="/tasks" className="ml-auto underline underline-offset-2 hover:text-foreground">
            Clear filter
          </a>
        </div>
      )}
      <DataTable
        columns={columns}
        data={tasks}
        searchKey={{ id: 'title', placeholder: 'Search tasks...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        emptyState={{
          title: 'No tasks found',
          description: 'Create a task to track a follow-up with any linked contact.',
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
                <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
                  <SelectTrigger id="task-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {priorities.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-status">Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger id="task-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {statuses.map((value) => <SelectItem key={value} value={value}>{value.replaceAll('_', ' ')}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="task-contact">Linked contact</Label>
              <Select value={linkedContact} onValueChange={setLinkedContact}>
                <SelectTrigger id="task-contact"><SelectValue placeholder="Select a contact" /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">Not linked</SelectItem>
                    {contactOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </form>
          <div className="mt-auto flex flex-col gap-4">
            <Separator />
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => reset(false)}>
                Cancel
              </Button>
              <Button type="submit" form="task-form" className="flex-1" disabled={saving}>
                {saving ? 'Saving…' : 'Save task'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
        <SheetContent side="right" className="flex h-full flex-col gap-4 overflow-y-auto sm:max-w-5xl">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>Follow-up calendar</SheetTitle>
            <SheetDescription>
              All task follow-ups appear on their due date. Add, edit, or remove them here.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <EventCalendar
              events={calendarEvents}
              onEventAdd={handleCalendarAdd}
              onEventUpdate={handleCalendarUpdate}
              onEventRemove={handleCalendarRemove}
            />
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}
