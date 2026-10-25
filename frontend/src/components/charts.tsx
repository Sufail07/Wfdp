import { useCallback } from 'react'
import ReactECharts from 'echarts-for-react'
import { useTheme } from '../context/ThemeContext'
import { getEChartsTheme } from './echartsTheme'

interface LineChartProps {
  data: Array<{ x: string | number; y: number }>
  title?: string
  yAxisLabel?: string
  xAxisLabel?: string
  color?: string
  height?: number | string
  className?: string
}

export function LineChart({
  data,
  title,
  yAxisLabel = 'MW',
  xAxisLabel = 'Time',
  color,
  height = 320,
  className,
}: LineChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => ({
    title: title ? { text: title, left: 'left', top: 10, textStyle: { fontSize: 14, fontWeight: 600, fontFamily: 'ui-serif, Georgia, serif', color: '#0f172a' } } : undefined,
    tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.x),
      name: xAxisLabel,
      nameLocation: 'center',
      nameGap: 30,
      axisLabel: { rotate: 0, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'center',
      nameGap: 50,
      axisLabel: { fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: [
      {
        type: 'line',
        data: data.map((d) => d.y),
        color,
        smooth: true,
        lineStyle: { width: 2 },
        itemStyle: { borderWidth: 4 },
        showSymbol: false,
      },
    ],
    grid: { left: '8%', right: '8%', bottom: '14%', top: 40 },
  }), [data, title, yAxisLabel, xAxisLabel, color])

  return (
    <div className={className} style={{ height }}>
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

interface MultiLineChartProps {
  series: Array<{
    name: string
    data: Array<{ x: string | number; y: number }>
    color: string
  }>
  title?: string
  yAxisLabel?: string
  xAxisLabel?: string
  height?: number | string
  className?: string
}

export function MultiLineChart({
  series,
  title,
  yAxisLabel = 'MW',
  xAxisLabel = 'Time',
  height = 360,
  className,
}: MultiLineChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => ({
    title: title ? { text: title, left: 'left', top: 10, textStyle: { fontSize: 14, fontWeight: 600, fontFamily: 'ui-serif, Georgia, serif', color: '#0f172a' } } : undefined,
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: series.length > 1 ? { data: series.map((s) => s.name), top: 10, left: 'left', textStyle: { fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#64748b' } } : undefined,
    xAxis: {
      type: 'category',
      data: series[0]?.data.map((d) => d.x) || [],
      name: xAxisLabel,
      nameLocation: 'center',
      nameGap: 30,
      axisLabel: { rotate: 0, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'center',
      nameGap: 50,
      axisLabel: { fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      data: s.data.map((d) => d.y),
      color: s.color,
      smooth: true,
      lineStyle: { width: 2 },
      showSymbol: false,
    })),
    grid: { left: '8%', right: '8%', bottom: '14%', top: series.length > 1 ? 45 : 40 },
  }), [series, title, yAxisLabel, xAxisLabel])

  return (
    <div className={className} style={{ height }}>
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

interface BarChartProps {
  data: Array<{ x: string | number; y: number }>
  title?: string
  yAxisLabel?: string
  xAxisLabel?: string
  color?: string
  height?: number | string
  className?: string
}

export function BarChart({
  data,
  title,
  yAxisLabel,
  xAxisLabel = 'Category',
  color = '#0f172a',
  height = 320,
  className,
}: BarChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => ({
    title: title ? { text: title, left: 'left', top: 10, textStyle: { fontSize: 14, fontWeight: 600, fontFamily: 'ui-serif, Georgia, serif', color: '#0f172a' } } : undefined,
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.x),
      name: xAxisLabel,
      nameLocation: 'center',
      nameGap: 30,
      axisLabel: { rotate: 0, fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'center',
      nameGap: 50,
      axisLabel: { fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#64748b' },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => d.y),
        color,
        barWidth: '60%',
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      },
    ],
    grid: { left: '8%', right: '8%', bottom: '14%', top: 40 },
  }), [data, title, yAxisLabel, xAxisLabel, color])

  return (
    <div className={className} style={{ height }}>
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

interface HeatmapProps {
  data: Array<{ x: string | number; y: string | number; value: number }>
  title?: string
  height?: number | string
  className?: string
}

export function HeatmapChart({
  data,
  title,
  height = 300,
  className,
}: HeatmapProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => ({
    title: title ? { text: title, left: 'left', top: 10, textStyle: { fontSize: 14, fontWeight: 600, fontFamily: 'ui-serif, Georgia, serif', color: '#0f172a' } } : undefined,
    tooltip: { trigger: 'item' },
    xAxis: {
      type: 'category',
      data: [...new Set(data.map((d) => d.x))],
      name: 'Hour of Day',
      nameLocation: 'center',
      nameGap: 30,
      axisLabel: { fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#64748b' },
    },
    yAxis: {
      type: 'category',
      data: [...new Set(data.map((d) => d.y))],
      name: 'Metric',
      nameLocation: 'center',
      nameGap: 50,
      axisLabel: { fontSize: 11, fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#64748b' },
    },
    visualMap: {
      min: Math.min(...data.map((d) => d.value)),
      max: Math.max(...data.map((d) => d.value)),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 20,
      textStyle: { color: '#64748b', fontSize: 11 },
    },
    series: [
      {
        type: 'heatmap',
        data: data.map((d) => [d.x, d.y, d.value]),
        label: { show: true },
      },
    ],
    grid: { left: '8%', right: '8%', bottom: '22%', top: 40 },
  }), [data, title, height])

  return (
    <div className={className} style={{ height }}>
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
