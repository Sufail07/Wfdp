import { useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTheme } from '../context/ThemeContext'
import { getEChartsTheme } from './echartsTheme'
import { CutoffRule } from './CutoffRule'

interface TimeChartProps {
  series: Array<{
    name: string
    data: Array<{ x: string; y: number }>
    color?: string
    lineStyle?: any
    opacity?: number
  }>
  showCutoff?: boolean
  cutoffLabel?: string
  height?: number | string
  className?: string
}

export function TimeChart({
  series,
  showCutoff = true,
  cutoffLabel = '09:00 cutoff · D-1',
  height = 420,
  className,
}: TimeChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => {
    const base = series[0]?.data || []
    const xData = base.map((d) => d.x)

    return {
      grid: { left: '6%', right: '6%', top: 20, bottom: 40, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        backgroundColor: 'var(--paper)',
        borderColor: 'var(--rule)',
        textStyle: { color: 'var(--ink)', fontSize: 11, fontFamily: 'ui-monospace, monospace' },
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'var(--rule)' } },
        axisTick: { show: true, length: 3 },
        axisLabel: {
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          color: 'var(--ink-muted)',
          interval: 5,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          color: 'var(--ink-muted)',
        },
        splitLine: { show: true, lineStyle: { color: 'var(--rule)', type: 'dashed', width: 0.5 } },
      },
      series: series.map((s, idx) => ({
        name: s.name,
        type: 'line',
        data: s.data.map((d) => d.y),
        symbol: 'none',
        lineStyle: { width: idx === 0 ? 1.5 : 1, opacity: s.opacity ?? 1, ...s.lineStyle },
        itemStyle: { borderWidth: 0 },
        color: s.color || (idx === 0 ? 'var(--accent)' : 'var(--ink-muted)'),
        smooth: true,
      })),
    }
  }, [series])

  return (
    <div className={`time-chart relative ${className || ''}`} style={{ height }}>
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
      {showCutoff && (
        <div className="absolute left-1/3 top-0 bottom-0 flex items-start">
          <CutoffRule label={cutoffLabel} height="90%" />
        </div>
      )}
    </div>
  )
}
