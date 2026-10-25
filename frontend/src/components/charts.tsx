import { useCallback, useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTheme } from '../context/ThemeContext'
import { getEChartsTheme } from './echartsTheme'
import { resolveColor, clearColorCache } from '../utils/colors'

// Clear color cache when theme changes so ECharts picks up new values
export function useResolvedColor(token: string): string {
  const [color, setColor] = useState<string>(() => resolveColor(token))

  useEffect(() => {
    clearColorCache()
    setColor(resolveColor(token))
  }, [token])

  return color
}

interface BaseChartProps {
  title?: string
  height?: number | string
  className?: string
  yAxisLabel?: string
  xAxisLabel?: string
}

/** Common ECharts option base with resolved colours */
function baseOption({
  title,
  yAxisLabel,
  xAxisLabel,
  bottom = 45,
  xLabelRotate = 0,
  yFormatter = (v: number) => `${Math.round(v)} MW`,
  ruleColor = '#D9D5CB',
  inkColor = '#15171A',
  inkMutedColor = '#6B6F76',
  paperColor = '#F6F4EF',
}: BaseChartProps & {
  bottom?: number
  xLabelRotate?: number
  yFormatter?: (v: number) => string
  ruleColor?: string
  inkColor?: string
  inkMutedColor?: string
  paperColor?: string
}) {

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
            color: inkColor,
          },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      backgroundColor: paperColor,
      borderColor: ruleColor,
      textStyle: { color: inkColor, fontSize: 11, fontFamily: 'ui-monospace, monospace' },
    },
    grid: { left: '8%', right: '6%', top: 40, bottom, containLabel: true },
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: ruleColor } },
      axisTick: { show: true, length: 3 },
      axisLabel: {
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 9,
        color: inkMutedColor,
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
        color: inkMutedColor,
        formatter: yFormatter,
      },
      splitLine: {
        show: true,
        lineStyle: { color: ruleColor, type: 'solid', width: 0.5 },
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
  series2Color,
  height = 320,
}: BarChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  // Resolve CSS variables to real colours for ECharts
  const accentColor = useResolvedColor('--accent')
  const ruleColor = useResolvedColor('--rule')
  const inkColor = useResolvedColor('--ink')
  const inkMutedColor = useResolvedColor('--ink-muted')
  const paperColor = useResolvedColor('--paper')
  const overColor = series2Color ? useResolvedColor(series2Color) : useResolvedColor('--over')

  const option = useCallback(() => {
    const base = baseOption({
      bottom: series2 ? 55 : 45,
      xLabelRotate: -45,
      ruleColor,
      inkColor,
      inkMutedColor,
      paperColor,
    })

    const series: any[] = [
      {
        type: 'bar',
        name: 'MAE',
        data: data.map((d) => d.y),
        color: accentColor,
        barWidth: '55%',
        itemStyle: {
          borderRadius: [2, 2, 0, 0],
          opacity: 1,
        },
        emphasis: {
          itemStyle: {
            opacity: 0.85,
          },
        },
      },
    ]

    if (series2 && series2.length > 0) {
      series.push({
        type: 'line',
        name: series2Name,
        data: series2.map((d) => d.y),
        color: overColor,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 1.5, type: 'solid' },
        yAxisIndex: 0,
      })
    }

    if (series2 && series2.length > 0) {
      base.legend = {
        data: ['MAE', series2Name],
        top: 12,
        left: 'left',
        textStyle: { fontSize: 11, fontFamily: 'ui-monospace, monospace', color: inkMutedColor },
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
  }, [data, series2, series2Name, overColor, accentColor, ruleColor, inkColor, inkMutedColor, paperColor])

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
  color,
  height = 320,
}: LineChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const accentColor = useResolvedColor(color || '--accent')
  const ruleColor = useResolvedColor('--rule')
  const inkColor = useResolvedColor('--ink')
  const inkMutedColor = useResolvedColor('--ink-muted')
  const paperColor = useResolvedColor('--paper')

  const option = useCallback(() => {
    return {
      ...baseOption({ bottom: 45, xLabelRotate: -45, ruleColor, inkColor, inkMutedColor, paperColor }),
      xAxis: {
        ...baseOption({}).xAxis,
        data: data.map((d) => String(d.x)),
      },
      series: [
        {
          type: 'line',
          data: data.map((d) => d.y),
          color: accentColor,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { width: 1.5 },
          smooth,
          itemStyle: { borderWidth: 0 },
        },
      ],
    }
  }, [data, smooth, accentColor, ruleColor, inkColor, inkMutedColor, paperColor])

  return (
    <div style={{ height }} className="w-full">
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

interface HistogramChartProps {
  bins: number[]      // bin edges (n+1 values)
  counts: number[]    // counts per bin (n values)
  bin_width?: number  // bin width in MW
  markers?: Array<{ value: number; label: string; color?: string }>
  height?: number | string
}

export function HistogramChart({
  bins,
  counts,
  bin_width = 250,
  markers = [],
  height = 320,
}: HistogramChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const accentColor = useResolvedColor('--accent')
  const ruleColor = useResolvedColor('--rule')
  const inkColor = useResolvedColor('--ink')
  const inkMutedColor = useResolvedColor('--ink-muted')
  const paperColor = useResolvedColor('--paper')
  const overColor = useResolvedColor('--over')
  const underColor = useResolvedColor('--under')

  // Build histogram bar data: each bin becomes a bar at its center value
  const barData = bins.slice(0, -1).map((start, i) => {
    const end = bins[i + 1] ?? start + bin_width
    const center = (start + end) / 2
    const count = counts[i] || 0
    return {
      x: center,
      y: count,
      binStart: Math.round(start),
      binEnd: Math.round(end),
      color: center >= 0 ? overColor : underColor,
    }
  })

  const totalCount = barData.reduce((sum, d) => sum + d.y, 0)
  const hasData = totalCount > 0
  const maxCount = hasData ? Math.max(...barData.map((d) => d.y)) : 0
  const yMax = maxCount > 0 ? Math.ceil(maxCount * 1.1) : 10

  // Build markLine data: zero line at x=0, plus P-markers
  const markLineData: any[] = [
    {
      xAxis: 0,
      label: { show: false },
      lineStyle: { color: inkMutedColor, width: 1, type: 'dashed' },
    },
  ]

  markers.forEach((m) => {
    markLineData.push({
      xAxis: m.value,
      label: {
        show: true,
        formatter: m.label,
        position: 'insideStartTop',
        color: m.color || overColor,
        fontSize: 10,
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        backgroundColor: paperColor,
        padding: [2, 6],
        borderColor: m.color || overColor,
        borderWidth: 1,
        borderRadius: 2,
      },
      lineStyle: { color: m.color || overColor, width: 1, type: 'dashed' },
    })
  })

  const option = useCallback(() => {
    return {
      ...baseOption({
        bottom: 55,
        xLabelRotate: 0,
        yFormatter: (v: number) => Math.round(v).toString(),
        ruleColor,
        inkColor,
        inkMutedColor,
        paperColor,
      }),
      tooltip: {
        trigger: 'item',
        backgroundColor: paperColor,
        borderColor: ruleColor,
        textStyle: { color: inkColor, fontSize: 11, fontFamily: 'ui-monospace, monospace' },
        formatter: (params: any) => {
          const d = params.data
          if (!d) return ''
          const start = d.binStart
          const end = d.binEnd
          const count = d.y
          const share = totalCount > 0 ? ((count / totalCount) * 100).toFixed(0) : '0'
          return `${start} to ${end} MW<br/>${count} half-hours (${share}%)`
        },
      },
      xAxis: {
        ...baseOption({}).xAxis,
        type: 'value',
        min: bins[0],
        max: bins[bins.length - 1],
        name: 'Signed error (MW)',
        nameLocation: 'center',
        nameGap: 35,
        axisLabel: {
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 9,
          color: inkMutedColor,
          formatter: (v: number) => `${Math.round(v)}`,
        },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: ruleColor } },
        axisTick: { show: true, length: 3 },
      },
      yAxis: {
        ...baseOption({}).yAxis,
        name: 'Half-hours',
        nameLocation: 'center',
        nameGap: 50,
        max: yMax,
        min: 0,
        splitLine: {
          show: true,
          lineStyle: { color: ruleColor, type: 'solid', width: 0.5 },
        },
      },
      series: [
        {
          type: 'bar',
          name: 'Count',
          data: barData.map((d) => ({
            x: d.x,
            y: d.y,
            binStart: d.binStart,
            binEnd: d.binEnd,
            itemStyle: { color: d.color, opacity: 1 },
          })),
          color: overColor,
          barWidth: Math.max(4, Math.min(30, bin_width / 2)),
          barMaxWidth: 40,
          itemStyle: {
            borderRadius: [2, 2, 0, 0],
            opacity: 1,
          },
          emphasis: {
            itemStyle: { opacity: 0.85 },
          },
          markLine: {
            data: markLineData,
            animation: false,
          },
        },
      ],
    }
  }, [bins, counts, bin_width, markers, totalCount, maxCount, yMax, accentColor, ruleColor, inkColor, inkMutedColor, paperColor, overColor, underColor])

  return (
    <div style={{ height }} className="w-full flex flex-col items-center justify-center">
      {!hasData && (
        <p className="text-xs font-mono text-ink-muted mt-4">
          No error data available for this range.
        </p>
      )}
      {hasData && (
        <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  )
}

