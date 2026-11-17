import { AppError, ValidationError } from '#/lib/errors'
import { env } from '#/config/env'

function toChatId(mobile: string): { chatId: string; digits: string } {
  const digitsOnly = mobile.replace(/\D/g, '')
  const digits =
    digitsOnly.length === 10
      ? `91${digitsOnly}`
      : digitsOnly

  if (digits.length < 11 || digits.length > 15) {
    throw new ValidationError('WhatsApp mobile number must include a country code')
  }

  return { chatId: `${digits}@c.us`, digits }
}

export async function sendWhatsAppText(
  mobile: string,
  text: string,
  idempotencyKey: string,
): Promise<void> {
  const { whatsappApiUrl, whatsappApiKey, whatsappSessionId, whatsappConfigured } = env
  if (!whatsappConfigured || !whatsappApiUrl || !whatsappApiKey || !whatsappSessionId) {
    throw new AppError('WhatsApp API is not configured', 503, 'WHATSAPP_NOT_CONFIGURED')
  }

  const { chatId } = toChatId(mobile)
  const endpoint = `${whatsappApiUrl}/api/sessions/${encodeURIComponent(whatsappSessionId)}/messages/send-text`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': whatsappApiKey,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ chatId, text }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300)
    throw new AppError(
      `OpenWA rejected the message (${response.status})${detail ? `: ${detail}` : ''}`,
      502,
      'WHATSAPP_SEND_FAILED',
    )
  }
}
