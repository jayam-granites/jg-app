export type WhatsAppSettings = {
  apiUrl: string
  apiKey: string
  sessionId: string
}

export const EMPTY_WHATSAPP_SETTINGS: WhatsAppSettings = {
  apiUrl: '',
  apiKey: '',
  sessionId: '',
}

export function isWhatsAppConfigured(settings: WhatsAppSettings): boolean {
  return Boolean(
    settings.apiUrl.trim() && settings.apiKey.trim() && settings.sessionId.trim(),
  )
}
