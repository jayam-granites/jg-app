export const API_PREFIX = '/api'
export const API_PORT = 3001
export const PAGINATION_DEFAULT_PAGE = 1
export const PAGINATION_DEFAULT_PAGE_SIZE = 20

/**
 * Normalizes a user-entered name so it always starts with a capital letter.
 * The rest of the name is preserved (for example, "de Silva" stays intact).
 */
export function capitalizeName(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ''
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/** Category names accepted when adding products to a slab measurement. */
export function isGraniteCategoryName(name: string | null | undefined): boolean {
  const normalized = name?.trim().toLowerCase()
  return normalized === 'granite' || normalized === 'granites'
}

export const LOOKUP_GROUPS = {
  CATEGORY_TYPE: 'CATEGORY_TYPE',
  EXPENSE_FREQUENCY: 'EXPENSE_FREQUENCY',
  PAYMENT_MODE: 'PAYMENT_MODE',
  ITEM_TYPE: 'ITEM_TYPE',
  INVOICE_STATUS: 'INVOICE_STATUS',
  PURCHASE_ORDER_STATUS: 'PURCHASE_ORDER_STATUS',
} as const

export const SETTINGS_KEYS = {
  INVOICE_GST_PERCENT: 'invoice.gstPercent',
  WHATSAPP_API_URL: 'whatsapp.apiUrl',
  WHATSAPP_API_KEY: 'whatsapp.apiKey',
  WHATSAPP_SESSION_ID: 'whatsapp.sessionId',
} as const
