/*
 * EventCalendar
 * Adapted from mors-component-library (https://github.com/murad-sinatra/mors-component-library)
 * Original author: Murad — MIT License
 *
 * MIT License
 *
 * Copyright (c) 2026 Murad
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { useMemo, useState, type FormEvent, type HTMLAttributes } from 'react'
import { cx } from '@/components/ui/event-calendar-utils/cx'
import type { Tone } from '@/components/ui/event-calendar-utils/types'
import {
  addMonths,
  dateKey,
  isSameDay,
  isSameMonth,
  monthGrid,
  startOfDay,
  startOfMonth,
  weekdayNames,
} from '@/components/ui/event-calendar-utils/date'
import { useControllableState } from '@/components/ui/event-calendar-utils/use-controllable-state'
import { Button, IconButton } from '@/components/ui/event-calendar-utils/button'
import { Card } from '@/components/ui/event-calendar-utils/card'
import { Icon } from '@/components/ui/event-calendar-utils/icon'
import { Swatch, SwatchGroup } from '@/components/ui/event-calendar-utils/swatch'
import { TextField } from '@/components/ui/event-calendar-utils/text-field'

export type EventTone = Extract<
  Tone,
  'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
>

export interface CalendarEvent {
  id: string
  title: string
  date: Date
  /** Optional clock time, displayed as-is (e.g. `09:30`). */
  time?: string
  description?: string
  tone?: EventTone
}

export interface EventCalendarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  events?: CalendarEvent[]
  defaultEvents?: CalendarEvent[]
  onEventsChange?: (events: CalendarEvent[]) => void
  onEventAdd?: (event: CalendarEvent) => void
  onEventUpdate?: (event: CalendarEvent) => void
  onEventRemove?: (id: string) => void
  month?: Date
  defaultMonth?: Date
  onMonthChange?: (month: Date) => void
  selectedDate?: Date
  defaultSelectedDate?: Date
  onSelectedDateChange?: (date: Date) => void
  locale?: string
  weekStartsOn?: 0 | 1
  readOnly?: boolean
}

const EMPTY_EVENTS: CalendarEvent[] = []

function createId(): string {
  return `mors-evt-${Math.random().toString(36).slice(2, 9)}`
}

function byDay(events: readonly CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const key = dateKey(event.date)
    const list = map.get(key)
    if (list) list.push(event)
    else map.set(key, [event])
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        (a.time ?? '').localeCompare(b.time ?? '') || a.title.localeCompare(b.title),
    )
  }
  return map
}

export default function EventCalendar({
  events,
  defaultEvents = EMPTY_EVENTS,
  onEventsChange,
  onEventAdd,
  onEventUpdate,
  onEventRemove,
  month,
  defaultMonth,
  onMonthChange,
  selectedDate,
  defaultSelectedDate,
  onSelectedDateChange,
  locale,
  weekStartsOn = 1,
  readOnly = false,
  className,
  ...rest
}: EventCalendarProps) {
  const [items, setItems] = useControllableState(
    events,
    defaultEvents,
    onEventsChange,
  )
  const [visibleMonth, setVisibleMonth] = useControllableState(
    month,
    startOfMonth(
      defaultMonth ?? selectedDate ?? defaultSelectedDate ?? new Date(),
    ),
    onMonthChange,
  )
  const [selected, setSelected] = useControllableState(
    selectedDate,
    startOfDay(defaultSelectedDate ?? new Date()),
    onSelectedDateChange,
  )
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftTime, setDraftTime] = useState('')
  const [draftTone, setDraftTone] = useState<EventTone>('accent')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const today = startOfDay(new Date())
  const days = monthGrid(visibleMonth, weekStartsOn)
  const weekdays = weekdayNames(locale, weekStartsOn)
  const grouped = useMemo(() => byDay(items), [items])
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth)
  const dayHeading = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(selected)
  const selectedEvents = grouped.get(dateKey(selected)) ?? []

  const addEvent = (event: FormEvent) => {
    event.preventDefault()
    const title = draftTitle.trim()
    if (!title) return
    const next: CalendarEvent = {
      id: createId(),
      title,
      date: startOfDay(selected),
      time: draftTime.trim() || undefined,
      description: draftDescription.trim() || undefined,
      tone: draftTone,
    }
    setItems([...items, next])
    onEventAdd?.(next)
    setDraftTitle('')
    setDraftDescription('')
    setDraftTime('')
  }

  const beginEdit = (entry: CalendarEvent) => {
    setEditingId(entry.id)
    setEditTitle(entry.title)
    setEditDescription(entry.description ?? '')
  }

  const saveEdit = (id: string) => {
    const title = editTitle.trim()
    if (!title) return
    let updated: CalendarEvent | undefined
    setItems(
      items.map((entry) => {
        if (entry.id !== id) return entry
        updated = {
          ...entry,
          title,
          description: editDescription.trim() || undefined,
        }
        return updated
      }),
    )
    if (updated) onEventUpdate?.(updated)
    setEditingId(null)
  }

  const removeEvent = (id: string) => {
    setItems(items.filter((entry) => entry.id !== id))
    onEventRemove?.(id)
    if (editingId === id) setEditingId(null)
  }

  return (
    <div className={cx('mors-event-calendar', className)} {...rest}>
      <div className="mors-event-calendar-toolbar">
        <IconButton
          label="Previous month"
          icon={<Icon name="chevron-left" />}
          variant="ghost"
          size="sm"
          onClick={() =>
            setVisibleMonth(startOfMonth(addMonths(visibleMonth, -1)))
          }
        />
        <h2 className="mors-event-calendar-title">{monthLabel}</h2>
        <IconButton
          label="Next month"
          icon={<Icon name="chevron-right" />}
          variant="ghost"
          size="sm"
          onClick={() =>
            setVisibleMonth(startOfMonth(addMonths(visibleMonth, 1)))
          }
        />
        <Button
          size="sm"
          variant="ghost"
          className="mors-event-calendar-today"
          onClick={() => {
            const now = startOfDay(new Date())
            setVisibleMonth(startOfMonth(now))
            setSelected(now)
          }}
        >
          Today
        </Button>
      </div>

      <div className="mors-event-calendar-layout">
        <div className="mors-event-calendar-month">
          <div className="mors-event-calendar-weekdays">
            {weekdays.map((day) => (
              <span key={day.long} className="mors-event-calendar-weekday">
                {day.short}
              </span>
            ))}
          </div>
          <div className="mors-event-calendar-grid">
            {days.map((date) => {
              const key = dateKey(date)
              const dayEvents = grouped.get(key) ?? []
              const overflow = Math.max(0, dayEvents.length - 3)
              const visible = dayEvents.slice(0, overflow > 0 ? 2 : 3)
              const outside = !isSameMonth(date, visibleMonth)
              const isSelected = isSameDay(date, selected)
              const isToday = isSameDay(date, today)

              return (
                <button
                  key={key}
                  type="button"
                  className={cx(
                    'mors-event-calendar-cell',
                    outside && 'mors-event-calendar-cell--outside',
                    isSelected && 'mors-event-calendar-cell--selected',
                    isToday && 'mors-event-calendar-cell--today',
                  )}
                  aria-pressed={isSelected}
                  aria-label={`${date.toDateString()}${dayEvents.length ? `, ${dayEvents.length} events` : ''}`}
                  onClick={() => {
                    setSelected(startOfDay(date))
                    if (!isSameMonth(date, visibleMonth))
                      setVisibleMonth(startOfMonth(date))
                  }}
                >
                  <span className="mors-event-calendar-date">
                    {date.getDate()}
                  </span>
                  <span className="mors-event-calendar-chips">
                    {visible.map((entry) => (
                      <span
                        key={entry.id}
                        className={cx(
                          'mors-event-calendar-chip',
                          `mors-event-calendar-chip--${entry.tone ?? 'accent'}`,
                        )}
                      >
                        {entry.time ? `${entry.time} ` : ''}
                        {entry.title}
                      </span>
                    ))}
                    {overflow > 0 && (
                      <span className="mors-event-calendar-more">
                        +{overflow + 1} more
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <section className="mors-event-calendar-panel" aria-label={dayHeading}>
          <header className="mors-event-calendar-panel-head">
            <h3 className="mors-event-calendar-panel-title">{dayHeading}</h3>
            <p className="mors-event-calendar-panel-count">
              {selectedEvents.length === 0
                ? 'No events'
                : `${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'}`}
            </p>
          </header>

          <ul className="mors-event-calendar-list">
            {selectedEvents.map((entry) => (
              <li key={entry.id}>
                <Card
                  elevation="raised"
                  padding="sm"
                  className="mors-event-calendar-item"
                >
                  {editingId === entry.id ? (
                    <form
                      className="mors-event-calendar-edit"
                      onSubmit={(event) => {
                        event.preventDefault()
                        saveEdit(entry.id)
                      }}
                    >
                      <div className="mors-event-calendar-item-row">
                        <Swatch tone={entry.tone ?? 'accent'} size="sm" />
                        {entry.time && (
                          <span className="mors-event-calendar-time">
                            {entry.time}
                          </span>
                        )}
                      </div>
                      <TextField
                        label="Title"
                        value={editTitle}
                        onChange={(event) =>
                          setEditTitle(event.currentTarget.value)
                        }
                        size="sm"
                        required
                      />
                      <TextField
                        label="Description"
                        placeholder="Optional note"
                        value={editDescription}
                        onChange={(event) =>
                          setEditDescription(event.currentTarget.value)
                        }
                        size="sm"
                      />
                      <div className="mors-event-calendar-edit-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          startIcon={<Icon name="trash" />}
                          aria-label={`Delete ${entry.title}`}
                          onClick={() => removeEvent(entry.id)}
                        >
                          Delete
                        </Button>
                        <Button type="submit" size="sm">
                          Save
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mors-event-calendar-item-row">
                      <Swatch tone={entry.tone ?? 'accent'} size="sm" />
                      <div className="mors-event-calendar-item-body">
                        {entry.time && (
                          <span className="mors-event-calendar-time">
                            {entry.time}
                          </span>
                        )}
                        <span className="mors-event-calendar-item-title">
                          {entry.title}
                        </span>
                        {entry.description && (
                          <span className="mors-event-calendar-item-note">
                            {entry.description}
                          </span>
                        )}
                      </div>
                      {!readOnly && (
                        <IconButton
                          label={`Edit ${entry.title}`}
                          icon={<Icon name="edit" />}
                          size="sm"
                          variant="ghost"
                          onClick={() => beginEdit(entry)}
                        />
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>

          {!readOnly && (
            <form className="mors-event-calendar-composer" onSubmit={addEvent}>
              <TextField
                label="Title"
                placeholder="Event title"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.currentTarget.value)}
                size="sm"
                required
              />
              <TextField
                label="Description"
                placeholder="Optional note"
                value={draftDescription}
                onChange={(event) =>
                  setDraftDescription(event.currentTarget.value)
                }
                size="sm"
              />
              <div className="mors-event-calendar-composer-row">
                <TextField
                  label="Time"
                  type="time"
                  value={draftTime}
                  onChange={(event) => setDraftTime(event.currentTarget.value)}
                  size="sm"
                />
                <SwatchGroup
                  label="Colour"
                  size="sm"
                  block={false}
                  value={draftTone}
                  onChange={(tone) => setDraftTone(tone)}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                block
                startIcon={<Icon name="plus" />}
              >
                Add
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
