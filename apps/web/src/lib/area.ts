const ROUND_OFF_THRESHOLD = 200

/**
 * Total area rounding:
 * - if total area > 200 sq.ft: round to nearest whole sq.ft
 * - if total area <= 200 sq.ft: round to nearest whole number (as requested)
 */
export function roundTotalArea(totalArea: number): number {
  if (!Number.isFinite(totalArea)) return 0
  if (totalArea > ROUND_OFF_THRESHOLD) return Math.round(totalArea)
  return Math.round(totalArea)
}

export function formatAreaValue(area: number): string {
  if (!Number.isFinite(area) || area <= 0) return '-'
  if (area > ROUND_OFF_THRESHOLD) return String(Math.round(area))
  return String(Math.round(area))
}

export function formatTotalArea(totalArea: number): string {
  if (!totalArea || totalArea <= 0) return '-'
  const rounded = roundTotalArea(totalArea)
  return String(rounded)
}
