export function roundInvoiceSqft(sqft: number): number {
  if (!Number.isFinite(sqft) || sqft <= 0) return 0

  const thousandths = Math.round((sqft + Number.EPSILON) * 1000)
  const wholeSqft = Math.floor(thousandths / 1000)
  const fractionalThousandths = thousandths % 1000

  return wholeSqft + (fractionalThousandths > 200 ? 1 : 0)
}