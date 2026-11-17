import { ValidationError } from './errors'

export function parsePositiveId(value: string): number {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new ValidationError('ID must be a positive integer')
  }
  return id
}
