/// <reference types="vite/client" />
import { hc } from 'hono/client'
import type { AppType } from '@jg-app/api/client'

const baseUrl = (import.meta as Record<string, any>).env?.VITE_API_URL ?? ''

export const client = hc<AppType>(baseUrl)
export const api = client.api
