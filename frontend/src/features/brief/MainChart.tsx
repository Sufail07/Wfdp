import { MultiLineChart } from '../../components/charts'

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
    data: Array<{ x: string | number; y: number }>
    color: string
  }> = [
    {
      name: 'Decision Forecast',
      data: decisionForecast,
      color: '#0f172a',
    },
  ]

  if (riskAdjusted && riskAdjusted.length > 0) {
    series.push({
      name: 'Risk-Adjusted',
      data: riskAdjusted,
      color: '#64748b',
    })
  }

  if (actuals && actuals.length > 0) {
    series.push({
      name: 'Actuals',
      data: actuals,
      color: '#94a3b8',
    })
  }

  return (
    <div className="card">
      <h3 className="section-title">{title}</h3>
      <div className="h-[480px]">
        <MultiLineChart
          series={series}
          yAxisLabel="MW"
          xAxisLabel="Delivery Period"
          height={480}
        />
      </div>
    </div>
  )
}
