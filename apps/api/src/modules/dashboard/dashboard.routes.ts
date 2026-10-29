import { Hono } from 'hono'
import { dashboardService } from './dashboard.service'

export const dashboardRoutes = new Hono().get('/', async (c) => {
  const requested = Number(c.req.query('months') ?? 6)
  const months = requested === 12 ? 12 : 6
  const data = await dashboardService.getOverview(months)
  return c.json({ data })
})
