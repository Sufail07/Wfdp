import { useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTheme } from '../context/ThemeContext'
import { getEChartsTheme } from './echartsTheme'

interface BaseChartProps {
  title?: string
  height?: number | string
  className?: string
  yAxisLabel?: string
  xAxisLabel?: string
}

/** Common ECharts option base with the publication theme's styling */
function baseOption({
  title,
  yAxisLabel,
  xAxisLabel,
  bottom = 45,
  xLabelRotate = 0,
}: BaseChartProps & { bottom?: number; xLabelRotate?: number }) {
  return {
    title: title
      ? {
          text: title,
          left: 'left',
          top: 12,
          textStyle: {
            fontSize: 16,
            fontWeight: 400,
            fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
            color: 'var(--ink)',
          },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: 'var(--paper)',
      borderColor: 'var(--rule)',
      textStyle: { color: 'var(--ink)', fontSize: 11, fontFamily: 'ui-monospace, monospace' },
    },
    grid: { left: '8%', right: '6%', top: 40, bottom, containLabel: true },
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: 'var(--rule)' } },
      axisTick: { show: true, length: 3 },
      axisLabel: {
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 9,
        color: 'var(--ink-muted)',
        rotate: xLabelRotate,
        margin: 12,
      },
      splitLine: { show: false },
      name: xAxisLabel,
      nameLocation: 'center',
      nameGap: 30,
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 9,
        color: 'var(--ink-muted)',
        formatter: (v: number) => `${Math.round(v)} MW`,
      },
      splitLine: {
        show: true,
        lineStyle: { color: 'var(--rule)', type: 'solid', width: 0.5 },
      },
      name: yAxisLabel,
      nameLocation: 'center',
      nameGap: 50,
    },
  } as Record<string, any>
}

interface BarChartProps {
  data: Array<{ x: string | number; y: number }>
  series2?: Array<{ x: string | number; y: number }>
  series2Name?: string
  series2Color?: string
  height?: number | string
}

export function BarChart({
  data,
  series2,
  series2Name = 'Bias',
  series2Color = 'var(--over)',
  height = 320,
}: BarChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => {
    const base = baseOption({
      bottom: series2 ? 55 : 45,
      xLabelRotate: -45,
    })

    const series: any[] = [
      {
        type: 'bar',
        name: 'MAE',
        data: data.map((d) => d.y),
        color: 'var(--accent)',
        barWidth: '50%',
        itemStyle: { borderRadius: [2, 2, 0, 0] },
      },
    ]

    if (series2 && series2.length > 0) {
      series.push({
        type: 'line',
        name: series2Name,
        data: series2.map((d) => d.y),
        color: series2Color,
        symbol: 'none',
        lineStyle: { width: 1.5, type: 'solid' },
        yAxisIndex: 0,
      })
    }

    if (series2 && series2.length > 0) {
      base.legend = {
        data: ['MAE', series2Name],
        top: 12,
        left: 'left',
        textStyle: { fontSize: 11, fontFamily: 'ui-monospace, monospace', color: 'var(--ink-muted)' },
      }
    }

    return {
      ...base,
      xAxis: {
        ...base.xAxis,
        data: data.map((d) => String(d.x)),
      },
      series,
    }
  }, [data, series2, series2Name, series2Color])

  return (
    <div style={{ height }} className="w-full">
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

interface LineChartProps {
  data: Array<{ x: string | number; y: number }>
  smooth?: boolean
  color?: string
  height?: number | string
}

export function LineChart({
  data,
  smooth = false,
  color = 'var(--accent)',
  height = 320,
}: LineChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => {
    return {
      ...baseOption({ bottom: 45, xLabelRotate: -45 }),
      xAxis: {
        ...baseOption({}).xAxis,
        data: data.map((d) => String(d.x)),
      },
      series: [
        {
          type: 'line',
          data: data.map((d) => d.y),
          color,
          symbol: 'none',
          lineStyle: { width: 1.5 },
          smooth,
          itemStyle: { borderWidth: 0 },
        },
      ],
    }
  }, [data, smooth, color])

  return (
    <div style={{ height }} className="w-full">
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

interface HistogramChartProps {
  bins: number[]
  counts: number[]
  zeroLine?: boolean
  markers?: Array<{ value: number; label: string; color?: string }>
  height?: number | string
}

export function HistogramChart({
  bins,
  counts,
  zeroLine = true,
  markers = [],
  height = 320,
}: HistogramChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => {
    // Build histogram bars: bin centers and counts
    const barData = bins.map((b, i) => ({
      x: Math.round(b),
      y: counts[i] || 0,
    }))

    const series: any[] = [
      {
        type: 'bar',
        name: 'Count',
        data: barData.map((d) => d.y),
        color: 'var(--accent)',
        barWidth: '90%',
        itemStyle: { borderRadius: [2, 2, 0, 0] },
      },
    ]

    // Add zero line as a reference
    if (zeroLine) {
      series.push({
        type: 'line',
        name: 'Zero error',
        data: barData.map(() => 0),
        color: 'var(--ink-muted)',
        lineStyle: { width: 1, type: 'dashed' },
        symbol: 'none',
        z: 10,
      })
    }

    // Add percentile markers
    markers.forEach((m) => {
      series.push({
        type: 'line',
        name: m.label,
        data: barData.map(() => m.value),
        color: m.color || 'var(--over)',
        lineStyle: { width: 1, type: 'dashed' },
        symbol: 'none',
        z: 10,
      })
    })

    return {
      ...baseOption({ bottom: 50 }),
      title: {
        text: 'Error distribution (MW)',
        left: 'left',
        top: 12,
        textStyle: {
          fontSize: 16,
          fontWeight: 400,
          fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
          color: 'var(--ink)',
        },
      },
      xAxis: {
        ...baseOption({}).xAxis,
        data: barData.map((d) => String(d.x)),
        name: 'Signed error (MW)',
        nameLocation: 'center',
        nameGap: 35,
      },
      yAxis: {
        ...baseOption({}).yAxis,
        name: 'Count',
        nameLocation: 'center',
        nameGap: 50,
      },
      series,
    }
  }, [bins, counts, zeroLine, markers])

  return (
    <div style={{ height }} className="w-full">
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
