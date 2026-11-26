import { describe, expect, test } from 'bun:test'
import { EMPTY_WHATSAPP_SETTINGS, isWhatsAppConfigured } from './whatsapp'

describe('isWhatsAppConfigured', () => {
  test('is disabled while any required field is blank', () => {
    expect(isWhatsAppConfigured(EMPTY_WHATSAPP_SETTINGS)).toBe(false)
    expect(isWhatsAppConfigured({ ...EMPTY_WHATSAPP_SETTINGS, apiUrl: 'https://wa.example.com' })).toBe(false)
    expect(isWhatsAppConfigured({
      apiUrl: 'https://wa.example.com',
      apiKey: 'secret',
      sessionId: '',
    })).toBe(false)
  })

  test('is enabled when all required fields are present', () => {
    expect(isWhatsAppConfigured({
      apiUrl: 'https://wa.example.com',
      apiKey: 'secret',
      sessionId: 'session-1',
    })).toBe(true)
  })
})
