import { Prisma } from '@prisma/client'
import { ValidationError } from '#/lib/errors'
import { settingsRepository } from './settings.repository'

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const TAN_PATTERN = /^[A-Z]{4}[0-9]{5}[A-Z]$/
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/
const UPI_PATTERN = /^[A-Z0-9._-]{2,256}@[A-Z0-9.-]{2,64}$/i
const PHONE_PATTERN = /^[0-9+(). -]{7,20}$/
const IMAGE_DATA_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/

type ConfigurationType = 'string' | 'number' | 'boolean' | 'select' | 'json'
type ConfigurationOption = { label: string; value: string }

type ProfileUpdate = {
  companyName?: string
  address?: string
  logoUrl?: string
  website?: string
  primaryPhone?: string
  secondaryPhone?: string
  email?: string
  gstNumber?: string
  panNumber?: string
  tanNumber?: string
  bankName?: string
  accountHolderName?: string
  accountNumber?: string
  ifscCode?: string
  branch?: string
  upiId?: string
  upiQrUrl?: string
}

type ConfigurationInput = {
  configKey: string
  configLabel: string
  configValue: string
  dataType: ConfigurationType
  options?: ConfigurationOption[]
  category?: string
  description?: string
}

function normalized(value: string | undefined) {
  return value?.trim() ?? ''
}

function validateProfile(data: ProfileUpdate) {
  const gstNumber = normalized(data.gstNumber).toUpperCase()
  const panNumber = normalized(data.panNumber).toUpperCase()
  const tanNumber = normalized(data.tanNumber).toUpperCase()
  const ifscCode = normalized(data.ifscCode).toUpperCase()
  const upiId = normalized(data.upiId)

  if (data.companyName !== undefined && !normalized(data.companyName)) {
    throw new ValidationError('Company name is required')
  }
  if (gstNumber && !GSTIN_PATTERN.test(gstNumber)) {
    throw new ValidationError('GST number must be a valid 15-character GSTIN')
  }
  if (panNumber && !PAN_PATTERN.test(panNumber)) {
    throw new ValidationError('PAN must be 10 characters in the format ABCDE1234F')
  }
  if (tanNumber && !TAN_PATTERN.test(tanNumber)) {
    throw new ValidationError('TAN must be 10 characters in the format ABCD12345E')
  }
  if (ifscCode && !IFSC_PATTERN.test(ifscCode)) {
    throw new ValidationError('IFSC code must be 11 characters in the format ABCD0123456')
  }
  if (upiId && !UPI_PATTERN.test(upiId)) {
    throw new ValidationError('Enter a valid UPI ID, such as name@bank')
  }
  for (const phone of [data.primaryPhone, data.secondaryPhone]) {
    const value = normalized(phone)
    if (value && !PHONE_PATTERN.test(value)) {
      throw new ValidationError('Phone numbers may contain digits, spaces, +, -, parentheses, or periods')
    }
  }
  const email = normalized(data.email)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError('Enter a valid email address')
  }
  const website = normalized(data.website)
  if (website) {
    try {
      const parsed = new URL(website)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error()
    } catch {
      throw new ValidationError('Website must be a valid HTTP or HTTPS URL')
    }
  }

  for (const image of [data.logoUrl, data.upiQrUrl]) {
    const value = normalized(image)
    if (!value) continue
    if (value.length > 2_800_000 || !IMAGE_DATA_PATTERN.test(value)) {
      throw new ValidationError('Images must be PNG, JPEG, or WebP files smaller than 2 MB')
    }
  }
}

function validateConfiguration(data: ConfigurationInput) {
  if (!/^[a-z][a-z0-9_]{1,99}$/.test(data.configKey)) {
    throw new ValidationError('Config key must use lowercase letters, numbers, and underscores')
  }
  if (!data.configLabel.trim()) throw new ValidationError('Config label is required')
  if (!data.category?.trim()) throw new ValidationError('Category is required')

  switch (data.dataType) {
    case 'number':
      if (!data.configValue.trim() || !Number.isFinite(Number(data.configValue))) {
        throw new ValidationError('Config value must be a valid number')
      }
      break
    case 'boolean':
      if (data.configValue !== 'true' && data.configValue !== 'false') {
        throw new ValidationError('Boolean values must be true or false')
      }
      break
    case 'select':
      if (!data.options?.length) {
        throw new ValidationError('Select configurations need at least one option')
      }
      if (data.options.some((option) => !option.label.trim() || !option.value.trim())) {
        throw new ValidationError('Select option labels and values cannot be blank')
      }
      if (new Set(data.options.map((option) => option.value)).size !== data.options.length) {
        throw new ValidationError('Select option values must be unique')
      }
      if (!data.options.some((option) => option.value === data.configValue)) {
        throw new ValidationError('Select values must match one of the configured options')
      }
      break
    case 'json':
      try {
        JSON.parse(data.configValue)
      } catch {
        throw new ValidationError('Config value must contain valid JSON')
      }
      break
  }
}

function configurationData(data: ConfigurationInput) {
  return {
    configKey: data.configKey.trim(),
    configLabel: data.configLabel.trim(),
    configValue: data.configValue,
    dataType: data.dataType,
    options: data.options
      ? data.options.map((option) => ({ label: option.label.trim(), value: option.value.trim() }))
      : Prisma.JsonNull,
    category: data.category?.trim() || 'General',
    description: data.description?.trim() || null,
  }
}

export const settingsService = {
  getProfile() {
    return settingsRepository.getProfile()
  },

  async updateProfile(data: ProfileUpdate) {
    validateProfile(data)
    await settingsRepository.getProfile()
    const updateData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => {
        if (typeof value !== 'string') return [key, value]
        const cleaned = value.trim()
        if (key === 'gstNumber' || key === 'panNumber' || key === 'tanNumber' || key === 'ifscCode') {
          return [key, cleaned.toUpperCase() || null]
        }
        return [key, cleaned || null]
      }),
    )
    return settingsRepository.updateProfile(updateData)
  },

  listConfigurations() {
    return settingsRepository.listConfigurations()
  },

  createConfiguration(data: ConfigurationInput) {
    validateConfiguration(data)
    return settingsRepository.createConfiguration(configurationData(data))
  },

  updateConfiguration(id: string, data: ConfigurationInput) {
    validateConfiguration(data)
    return settingsRepository.updateConfiguration(id, configurationData(data))
  },

  deleteConfiguration(id: string) {
    return settingsRepository.deleteConfiguration(id)
  },
}
