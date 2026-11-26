import { useMemo, useState } from 'react'
import type { ReportPeriodRow } from '@jg-app/shared'
import { Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCompactCurrency, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const WIDTH = 960
const HEIGHT = 320
const PAD = { left: 72, right: 20, top: 16, bottom: 52 }
const PLOT_WIDTH = WIDTH - PAD.left - PAD.right
const PLOT_HEIGHT = HEIGHT - PAD.top - PAD.bottom
const TICKS = [0, 0.25, 0.5, 0.75, 1]

type View = 'bars' | 'lines'

function shortLabel(label: string) {
  return label.length > 13 ? `${label.slice(0, 12)}…` : label
}

export function RevenueProfitChart({ data, className }: { data: ReportPeriodRow[]; className?: string }) {
  const [view, setView] = useState<View>('bars')

  const geometry = useMemo(() => {
    const maxValue = Math.max(1, ...data.map((row) => Math.max(row.netSales, row.grossProfit, 0))) * 1.1
    const groupWidth = data.length > 0 ? PLOT_WIDTH / data.length : PLOT_WIDTH
    const barWidth = Math.max(4, Math.min(26, groupWidth * 0.3))
    const y = (value: number) => PAD.top + PLOT_HEIGHT - (Math.max(value, 0) / maxValue) * PLOT_HEIGHT
    const x = (index: number) => PAD.left + index * groupWidth + groupWidth / 2
    const labelStep = Math.max(1, Math.ceil(data.length / 12))
    return { maxValue, groupWidth, barWidth, y, x, labelStep }
  }, [data])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Revenue vs Gross Profit</CardTitle>
          <CardDescription>Net sales compared with gross profit by period</CardDescription>
        </div>
        <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-1">
          <Button
            type="button"
            size="sm"
            variant={view === 'bars' ? 'default' : 'ghost'}
            className="h-7 px-3"
            aria-pressed={view === 'bars'}
            onClick={() => setView('bars')}
          >
            Bars
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'lines' ? 'default' : 'ghost'}
            className="h-7 px-3"
            aria-pressed={view === 'lines'}
            onClick={() => setView('lines')}
          >
            Lines
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {data.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Inbox className="size-8 text-muted-foreground/50" />
            <p>No sales data available for this period</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="h-auto w-full"
              role="img"
              aria-label={`${view === 'bars' ? 'Grouped bar' : 'Line'} chart of net sales and gross profit across ${formatNumber(data.length)} periods`}
            >
              {TICKS.map((tick) => {
                const y = PAD.top + PLOT_HEIGHT - tick * PLOT_HEIGHT
                return (
                  <g key={tick}>
                    <line
                      x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y}
                      stroke="var(--border)" strokeWidth={1} strokeDasharray={tick === 0 ? undefined : '4 4'}
                    />
                    <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                      {formatCompactCurrency(tick * geometry.maxValue)}
                    </text>
                  </g>
                )
              })}

              {view === 'bars' ? (
                data.map((row, index) => {
                  const center = geometry.x(index)
                  const netHeight = PAD.top + PLOT_HEIGHT - geometry.y(row.netSales)
                  const profitHeight = PAD.top + PLOT_HEIGHT - geometry.y(row.grossProfit)
                  return (
                    <g key={row.key}>
                      <rect
                        x={center - geometry.barWidth - 2} y={geometry.y(row.netSales)}
                        width={geometry.barWidth} height={Math.max(netHeight, 0)} rx={3}
                        fill="var(--chart-1)"
                      >
                        <title>{`${row.label}: Net Sales ${formatCompactCurrency(row.netSales)}`}</title>
                      </rect>
                      <rect
                        x={center + 2} y={geometry.y(row.grossProfit)}
                        width={geometry.barWidth} height={Math.max(profitHeight, 0)} rx={3}
                        fill="var(--chart-2)"
                      >
                        <title>{`${row.label}: Gross Profit ${formatCompactCurrency(row.grossProfit)}`}</title>
                      </rect>
                    </g>
                  )
                })
              ) : (
                <g>
                  <polyline
                    points={data.map((row, index) => `${geometry.x(index)},${geometry.y(row.netSales)}`).join(' ')}
                    fill="none" stroke="var(--chart-1)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round"
                  />
                  <polyline
                    points={data.map((row, index) => `${geometry.x(index)},${geometry.y(row.grossProfit)}`).join(' ')}
                    fill="none" stroke="var(--chart-2)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round"
                  />
                  {data.map((row, index) => (
                    <g key={row.key}>
                      <circle cx={geometry.x(index)} cy={geometry.y(row.netSales)} r={4} fill="var(--chart-1)">
                        <title>{`${row.label}: Net Sales ${formatCompactCurrency(row.netSales)}`}</title>
                      </circle>
                      <circle cx={geometry.x(index)} cy={geometry.y(row.grossProfit)} r={4} fill="var(--chart-2)">
                        <title>{`${row.label}: Gross Profit ${formatCompactCurrency(row.grossProfit)}`}</title>
                      </circle>
                    </g>
                  ))}
                </g>
              )}

              {data.map((row, index) =>
                index % geometry.labelStep === 0 || index === data.length - 1 ? (
                  <text
                    key={`label-${row.key}`}
                    x={geometry.x(index)} y={HEIGHT - PAD.bottom + 20}
                    textAnchor="middle" className="fill-muted-foreground text-[10px]"
                  >
                    {shortLabel(row.label)}
                  </text>
                ) : null,
              )}
            </svg>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-1)' }} /> Net Sales
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-2)' }} /> Gross Profit
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
