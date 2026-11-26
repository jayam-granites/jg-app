import { describe, expect, it } from 'bun:test'
import { safeParse } from 'valibot'
import { CreateTaskSchema, UpdateTaskSchema } from '@jg-app/validators'

describe('task validation', () => {
  it('accepts clearing all optional contact links on update', () => {
    expect(
      safeParse(UpdateTaskSchema, {
        enquiryId: null,
        resourceId: null,
        customerId: null,
        supplierId: null,
        brokerId: null,
        transportId: null,
      }).success,
    ).toBe(true)
  })

  it('accepts all six optional contact links on create', () => {
    expect(
      safeParse(CreateTaskSchema, {
        title: 'Follow up',
        dueDate: '2026-11-26T09:00:00.000Z',
        enquiryId: 1,
        resourceId: 2,
        customerId: 3,
        supplierId: 4,
        brokerId: 5,
        transportId: 6,
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
