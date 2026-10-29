import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type DatePickerProps = {
  id?: string
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
}: DatePickerProps) {
  const selected = value && dayjs(value).isValid() ? dayjs(value) : null
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() =>
    (selected ?? dayjs()).startOf('month'),
  )

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setViewDate((selected ?? dayjs()).startOf('month'))
    }
  }

  const startOfMonth = viewDate.startOf('month')
  const leadingBlanks = startOfMonth.day()
  const daysInMonth = viewDate.daysInMonth()
  const cells: (dayjs.Dayjs | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => startOfMonth.add(index, 'day')),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function selectDay(day: dayjs.Dayjs) {
    onChange(day.format('YYYY-MM-DD'))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span>{selected ? selected.format('DD MMM YYYY') : placeholder}</span>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewDate((prev) => prev.subtract(1, 'month'))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{viewDate.format('MMMM YYYY')}</span>
          <button
            type="button"
            onClick={() => setViewDate((prev) => prev.add(1, 'month'))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <span
              key={day}
              className="flex h-7 items-center justify-center text-[10px] font-medium uppercase text-muted-foreground"
            >
              {day}
            </span>
          ))}
          {cells.map((day, index) => {
            if (!day) return <span key={`blank-${index}`} />
            const isSelected = selected?.isSame(day, 'day') ?? false
            const isToday = day.isSame(dayjs(), 'day')
            return (
              <button
                key={day.format('YYYY-MM-DD')}
                type="button"
                onClick={() => selectDay(day)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md text-xs transition-colors hover:bg-muted',
                  isToday && !isSelected && 'font-semibold text-primary',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
              >
                {day.date()}
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex justify-end border-t pt-2">
          <button
            type="button"
            onClick={() => selectDay(dayjs())}
            className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
          >
            Today
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
