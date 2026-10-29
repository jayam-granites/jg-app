import { dashboardRepository } from './dashboard.repository'

export const dashboardService = {
  getOverview(months: number) {
    return dashboardRepository.getOverview(months)
  },
}
