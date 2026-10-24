import React from 'react'
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
      color: '#0ea5e9',
    },
  ]

  if (riskAdjusted && riskAdjusted.length > 0) {
    series.push({
      name: 'Risk-Adjusted',
      data: riskAdjusted,
      color: '#ef4444',
    })
  }

  if (actuals && actuals.length > 0) {
    series.push({
      name: 'Actuals',
      data: actuals,
      color: '#10b981',
    })
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <MultiLineChart
        series={series}
        yAxisLabel="MW"
        xAxisLabel="Delivery Period"
        height={400}
      />
    </div>
  )
}