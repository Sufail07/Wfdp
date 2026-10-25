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
    const isDark = theme === 'dark'
    const accentColor = isDark ? '#5FB3CE' : '#1F6F8B'
    const mutedColor = isDark ? '#9A9EA5' : '#6B6F76'
    const axisColor = isDark ? '#ECE9E2' : '#15171A'
    const axisMuted = isDark ? '#9A9EA5' : '#6B6F76'
    const ruleColor = isDark ? '#2A2C30' : '#D9D5CB'

    return {
      grid: { left: '10%', right: '8%', top: 25, bottom: 65, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        backgroundColor: isDark ? '#121315' : '#F6F4EF',
        borderColor: ruleColor,
        textStyle: { color: axisColor, fontSize: 11, fontFamily: 'ui-monospace, monospace' },
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: ruleColor } },
        axisTick: { show: true, length: 3 },
        axisLabel: {
          fontFamily: 'ui-monospace, monospace',
          fontSize: 9,
          color: axisMuted,
          interval: 0,
          rotate: -45,
          margin: 15,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontFamily: 'ui-monospace, monospace',
          fontSize: 9,
          color: axisMuted,
        },
        splitLine: { show: true, lineStyle: { color: ruleColor, type: 'dashed', width: 0.5 } },
      },
      series: series.map((s, idx) => ({
        name: s.name,
        type: 'line',
        data: s.data.map((d) => d.y),
        symbol: 'none',
        lineStyle: { width: idx === 0 ? 1.5 : 1, opacity: s.opacity ?? 1, ...s.lineStyle },
        itemStyle: { borderWidth: 0 },
        color: idx === 0 ? accentColor : mutedColor,
        smooth: true,
      })),
    }
  }, [series, theme])

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
