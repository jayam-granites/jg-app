/// <reference types="vite/client" />
import { hc } from 'hono/client'
import type { AppType } from '@jg-app/api/client'
import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import type { auth } from '@jg-app/api/client'

const baseUrl = (import.meta as Record<string, any>).env?.VITE_API_URL ?? ''

export const client = hc<AppType>(baseUrl, {
  init: { credentials: 'include' },
})
export const api = client.api
export const authClient = createAuthClient({
  baseURL: baseUrl || undefined,
  plugins: [inferAdditionalFields<typeof auth>()],
})
