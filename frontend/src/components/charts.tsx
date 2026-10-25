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
  height = 400,
  className,
}: LineChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => ({
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.x),
      name: xAxisLabel,
      nameLocation: 'center',
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'center',
    },
    series: [
      {
        type: 'line',
        data: data.map((d) => d.y),
        color,
        smooth: true,
        lineStyle: { width: 2 },
        itemStyle: { borderWidth: 3 },
      },
    ],
    grid: { left: '10%', right: '10%', bottom: '15%', top: 60 },
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
  height = 400,
  className,
}: MultiLineChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => ({
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: { trigger: 'axis' },
    legend: series.length > 1 ? { data: series.map((s) => s.name) } : undefined,
    xAxis: {
      type: 'category',
      data: series[0]?.data.map((d) => d.x) || [],
      name: xAxisLabel,
      nameLocation: 'center',
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'center',
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      data: s.data.map((d) => d.y),
      color: s.color,
      smooth: true,
      lineStyle: { width: 2 },
    })),
    grid: { left: '10%', right: '10%', bottom: '15%', top: 60 },
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
  color = '#111827',
  height = 400,
  className,
}: BarChartProps) {
  const { theme } = useTheme()
  const echartsTheme = getEChartsTheme(theme === 'dark')

  const option = useCallback(() => ({
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.x),
      name: xAxisLabel,
      nameLocation: 'center',
    },
    yAxis: {
      type: 'value',
      name: yAxisLabel,
      nameLocation: 'center',
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => d.y),
        color,
      },
    ],
    grid: { left: '10%', right: '10%', bottom: '15%', top: 60 },
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
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: { trigger: 'item' },
    xAxis: {
      type: 'category',
      data: [...new Set(data.map((d) => d.x))],
      name: 'Hour of Day',
      nameLocation: 'center',
    },
    yAxis: {
      type: 'category',
      data: [...new Set(data.map((d) => d.y))],
      name: 'Metric',
      nameLocation: 'center',
    },
    visualMap: {
      min: Math.min(...data.map((d) => d.value)),
      max: Math.max(...data.map((d) => d.value)),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
    },
    series: [
      {
        type: 'heatmap',
        data: data.map((d) => [d.x, d.y, d.value]),
        label: { show: true },
      },
    ],
    grid: { left: '10%', right: '10%', bottom: '20%', top: 60 },
  }), [data, title, height])

  return (
    <div className={className} style={{ height }}>
      <ReactECharts option={option()} theme={echartsTheme} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
