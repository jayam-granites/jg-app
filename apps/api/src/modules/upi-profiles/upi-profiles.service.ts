import { ValidationError } from '#/lib/errors'
import { upiProfilesRepository } from './upi-profiles.repository'

const UPI_VPA_PATTERN = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/

type CreateUpiProfileInput = {
  payeeVPA: string
  payeeName: string
  isDefault?: boolean
}

type UpdateUpiProfileInput = {
  payeeVPA?: string
  payeeName?: string
  isDefault?: boolean
}

function normalizeVpa(value: string) {
  const payeeVPA = value.trim()
  if (!UPI_VPA_PATTERN.test(payeeVPA)) {
    throw new ValidationError('Enter a valid UPI ID, such as merchant@bank')
  }
  return payeeVPA
}

function normalizeName(value: string) {
  const payeeName = value.trim()
  if (!payeeName) throw new ValidationError('Payee name is required')
  return payeeName
}

export const upiProfilesService = {
  list() {
    return upiProfilesRepository.findAll()
  },

  create(input: CreateUpiProfileInput) {
    return upiProfilesRepository.create({
      payeeVPA: normalizeVpa(input.payeeVPA),
      payeeName: normalizeName(input.payeeName),
      isDefault: input.isDefault ?? false,
    })
  },

  update(id: number, input: UpdateUpiProfileInput) {
    const data: UpdateUpiProfileInput = {}
    if (input.payeeVPA !== undefined) data.payeeVPA = normalizeVpa(input.payeeVPA)
    if (input.payeeName !== undefined) data.payeeName = normalizeName(input.payeeName)
    if (input.isDefault !== undefined) data.isDefault = input.isDefault
    if (Object.keys(data).length === 0) {
      throw new ValidationError('At least one UPI profile field must be provided')
    }
    return upiProfilesRepository.update(id, data)
  },

  delete(id: number) {
    return upiProfilesRepository.delete(id)
  },
}
