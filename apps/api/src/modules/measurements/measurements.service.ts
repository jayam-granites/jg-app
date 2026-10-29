import { Prisma } from '@prisma/client'
import { measurementsRepository } from './measurements.repository'
import { ConflictError } from '#/lib/errors'

const MAX_CREATE_ATTEMPTS = 5

function normalizeText(value?: string | null): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const measurementsService = {
  async getAll() {
    return measurementsRepository.findAll()
  },

  async getById(id: number) {
    return measurementsRepository.findById(id)
  },

  async create(data: { name?: string; phone?: string; address?: string; notes?: string }) {
    const payload = {
      name: normalizeText(data.name) ?? '',
      phone: normalizeText(data.phone),
      address: normalizeText(data.address),
      notes: normalizeText(data.notes),
    }

    for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
      try {
        return await measurementsRepository.createWithGeneratedNumber(payload)
      } catch (err) {
        const isUniqueViolation =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
        if (isUniqueViolation && attempt < MAX_CREATE_ATTEMPTS) continue
        if (isUniqueViolation) {
          throw new ConflictError('Measurement number already exists, please try again')
        }
        throw err
      }
    }

    throw new ConflictError('Unable to generate a unique measurement number, please try again')
  },

  async update(
    id: number,
    data: { name?: string; phone?: string; address?: string; notes?: string; isActive?: boolean },
  ) {
    const payload: {
      name?: string
      phone?: string | null
      address?: string | null
      notes?: string | null
      isActive?: boolean
    } = {}

    if (data.name !== undefined) payload.name = normalizeText(data.name) ?? ''
    if (data.phone !== undefined) payload.phone = normalizeText(data.phone)
    if (data.address !== undefined) payload.address = normalizeText(data.address)
    if (data.notes !== undefined) payload.notes = normalizeText(data.notes)
    if (data.isActive !== undefined) payload.isActive = data.isActive

    return measurementsRepository.update(id, payload)
  },

  async delete(id: number) {
    return measurementsRepository.delete(id)
  },
}
