import { useId } from 'react'
import { cn } from '@/lib/utils'
import { formatCompactCurrency } from '@/lib/format'

type TrendPoint = {
  label: string
  revenue: number
  expenses: number
  profit: number
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const gradientId = useId().replaceAll(':', '')
  const width = 760
  const height = 300
  const padding = { top: 20, right: 18, bottom: 38, left: 62 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No activity in this period
      </div>
    )
  }

  const values = data.flatMap((point) => [point.revenue, point.expenses, point.profit])
  const maxValue = Math.max(...values, 1)
  const minValue = Math.min(...values, 0)
  const span = maxValue - minValue || 1
  const xStep = data.length > 1 ? plotWidth / (data.length - 1) : 0
  const zeroY = padding.top + ((maxValue - 0) / span) * plotHeight

  const x = (index: number) => padding.left + index * xStep
  const y = (value: number) => padding.top + ((maxValue - value) / span) * plotHeight
  const linePath = (key: 'revenue' | 'expenses' | 'profit') =>
    data
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point[key])}`)
      .join(' ')
  const areaPath = (key: 'revenue' | 'expenses') =>
    `M ${x(0)} ${zeroY} ${data
      .map((point, index) => `L ${x(index)} ${y(point[key])}`)
      .join(' ')} L ${x(data.length - 1)} ${zeroY} Z`

  const ticks = Array.from({ length: 5 }, (_, index) => {
    const value = maxValue - (span / 4) * index
    return { value, y: y(value) }
  })

  const showEvery = data.length > 8 ? 2 : 1

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <LegendItem color="var(--chart-1)" label="Revenue" />
        <LegendItem color="var(--chart-5)" label="Expenses" />
        <LegendItem color="var(--chart-2)" label="Profit" dashed />
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Monthly revenue, expenses and profit trend"
      >
        <defs>
          <linearGradient id={`${gradientId}-revenue`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`${gradientId}-expenses`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-5)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--chart-5)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <text
              x={padding.left - 10}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {formatCompactCurrency(tick.value)}
            </text>
          </g>
        ))}

        {minValue < 0 && (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={zeroY}
            y2={zeroY}
            stroke="var(--muted-foreground)"
            strokeOpacity="0.4"
          />
        )}

        <path d={areaPath('revenue')} fill={`url(#${gradientId}-revenue)`} />
        <path d={areaPath('expenses')} fill={`url(#${gradientId}-expenses)`} />
        <path
          d={linePath('revenue')}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={linePath('expenses')}
          fill="none"
          stroke="var(--chart-5)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={linePath('profit')}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth="2"
          strokeDasharray="6 5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((point, index) => (
          <g key={point.label}>
            <circle cx={x(index)} cy={y(point.revenue)} r="4" fill="var(--chart-1)">
              <title>{`${point.label} revenue: ${formatCompactCurrency(point.revenue)}`}</title>
            </circle>
            <circle cx={x(index)} cy={y(point.expenses)} r="4" fill="var(--chart-5)">
              <title>{`${point.label} expenses: ${formatCompactCurrency(point.expenses)}`}</title>
            </circle>
            {index % showEvery === 0 && (
              <text
                x={x(index)}
                y={height - 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

export type DonutDatum = {
  label: string
  value: number
  display: string
  color: string
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: DonutDatum[]
  centerLabel: string
  centerValue: string
}) {
  const size = 200
  const radius = 74
  const strokeWidth = 20
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative shrink-0">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-44 w-44 -rotate-90"
          role="img"
          aria-label={centerLabel}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            data.map((item) => {
              const length = (item.value / total) * circumference
              const segment = Math.max(length - 2, 0)
              const dashOffset = -offset
              offset += length
              return (
                <circle
                  key={item.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${segment} ${circumference - segment}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                >
                  <title>{`${item.label}: ${item.display}`}</title>
                </circle>
              )
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {centerLabel}
          </span>
          <span className="text-lg font-bold">{centerValue}</span>
        </div>
      </div>
      <div className="w-full space-y-2.5">
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">No records yet</p>
        )}
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-muted-foreground">{item.label}</span>
            </div>
            <span className="shrink-0 font-medium">{item.display}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({
  values,
  color = 'var(--chart-1)',
  className,
}: {
  values: number[]
  color?: string
  className?: string
}) {
  const gradientId = useId().replaceAll(':', '')
  const width = 120
  const height = 40
  const padding = 4

  if (values.length === 0) return null

  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0
  const points = values.map((value, index) => {
    const x = padding + index * step
    const y = padding + ((max - value) / span) * (height - padding * 2)
    return `${x},${y}`
  })
  const line = `M ${points.join(' L ')}`
  const area = `M ${padding},${height - padding} L ${points.join(' L ')} L ${
    width - padding
  },${height - padding} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('h-10 w-28', className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function LegendItem({
  color,
  label,
  dashed,
}: {
  color: string
  label: string
  dashed?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span
        className={cn('h-0.5 w-4 rounded-full', dashed && 'border-t-2 border-dashed bg-transparent')}
        style={dashed ? { borderColor: color } : { backgroundColor: color }}
      />
      {label}
    </span>
  )
}
