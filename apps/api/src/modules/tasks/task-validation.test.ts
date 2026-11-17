import { describe, expect, it } from 'bun:test'
import { safeParse } from 'valibot'
import { CreateTaskSchema, UpdateTaskSchema } from '@jg-app/validators'

describe('task validation', () => {
  it('accepts clearing optional enquiry and resource links on update', () => {
    expect(
      safeParse(UpdateTaskSchema, {
        enquiryId: null,
        resourceId: null,
      }).success,
    ).toBe(true)
  })

  it('rejects an invalid due date', () => {
    expect(
      safeParse(CreateTaskSchema, {
        title: 'Call customer',
        dueDate: 'not-a-date',
      }).success,
    ).toBe(false)
  })

  it('rejects unsupported priorities', () => {
    expect(
      safeParse(CreateTaskSchema, {
        title: 'Call customer',
        dueDate: '2026-11-16T10:00:00.000Z',
        priority: 'CRITICAL',
      }).success,
    ).toBe(false)
  })
})
