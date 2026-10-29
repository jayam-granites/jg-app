const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function formatCurrency(value: number | string | null | undefined): string {
  const numeric = Number(value ?? 0)
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0)
}

export function formatCompactCurrency(value: number | string | null | undefined): string {
  const numeric = Number(value ?? 0)
  return compactCurrencyFormatter.format(Number.isFinite(numeric) ? numeric : 0)
}

export function formatNumber(value: number | string | null | undefined): string {
  const numeric = Number(value ?? 0)
  return numberFormatter.format(Number.isFinite(numeric) ? numeric : 0)
}

export function formatPercent(value: number | string | null | undefined, digits = 1): string {
  const numeric = Number(value ?? 0)
  return `${(Number.isFinite(numeric) ? numeric : 0).toFixed(digits)}%`
}
