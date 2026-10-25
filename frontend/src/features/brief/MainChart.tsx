import { TimeChart } from '../../components/TimeChart'

interface MainChartProps {
  decisionForecast: Array<{ x: string; y: number }>
  actuals?: Array<{ x: string; y: number }>
  riskAdjusted?: Array<{ x: string; y: number }>
  title?: string
}

export function MainChart({
  decisionForecast,
  actuals,
  riskAdjusted,
  title = 'Wind Forecast Decision Brief',
}: MainChartProps) {
  const series: Array<{
    name: string
    data: Array<{ x: string; y: number }>
    color?: string
  }> = [
    {
      name: 'Decision Forecast',
      data: decisionForecast.map((d) => ({ x: String(d.x), y: d.y })),
      color: 'var(--accent)',
    },
  ]

  if (riskAdjusted && riskAdjusted.length > 0) {
    series.push({
      name: 'Risk-Adjusted',
      data: riskAdjusted.map((d) => ({ x: String(d.x), y: d.y })),
      color: 'var(--ink-muted)',
    })
  }

  if (actuals && actuals.length > 0) {
    series.push({
      name: 'Actuals',
      data: actuals.map((d) => ({ x: String(d.x), y: d.y })),
      color: 'var(--over)',
    })
  }

  return (
    <div className="card">
      <h3 className="section-title">{title}</h3>
      <TimeChart series={series} showCutoff={true} height={440} />
    </div>
  )
}
