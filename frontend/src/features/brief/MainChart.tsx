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
      color: '#111827',
    },
  ]

  if (riskAdjusted && riskAdjusted.length > 0) {
    series.push({
      name: 'Risk-Adjusted',
      data: riskAdjusted,
      color: '#6b7280',
    })
  }

  if (actuals && actuals.length > 0) {
    series.push({
      name: 'Actuals',
      data: actuals,
      color: '#9ca3af',
    })
  }

  return (
    <div className="card">
      <h3 className="font-serif font-semibold text-moment mb-4">{title}</h3>
      <MultiLineChart
        series={series}
        yAxisLabel="MW"
        xAxisLabel="Delivery Period"
        height={400}
      />
    </div>
  )
}
