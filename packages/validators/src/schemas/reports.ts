import { object, optional, picklist, pipe, regex, string } from 'valibot'

const dateKey = pipe(string(), regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'))

export const ReportsQuerySchema = object({
  from: optional(dateKey),
  to: optional(dateKey),
  granularity: optional(picklist(['daily', 'weekly', 'monthly', 'yearly'])),
  status: optional(picklist(['active', 'all'])),
})
