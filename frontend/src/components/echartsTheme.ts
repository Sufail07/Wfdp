import * as echarts from 'echarts'

// §6 ECharts theme — thin lines, minimal grid, no legends when direct labels fit, mono axis labels
// One source of truth for chart styling; no per-chart overrides.

const lightTheme = {
  color: ['#1F6F8B', '#C4452D', '#2D6A9F', '#6B6F76', '#9A9EA5'],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    fontSize: 11,
    color: '#6B6F76',
  },
  title: {
    textStyle: {
      fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
      fontSize: 14,
      fontWeight: 400,
      color: '#15171A',
    },
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'line' },
    backgroundColor: '#F6F4EF',
    borderColor: '#D9D5CB',
    textStyle: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 11,
      color: '#15171A',
    },
  },
  grid: {
    left: '6%',
    right: '6%',
    top: 30,
    bottom: 30,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    axisLine: { lineStyle: { color: '#D9D5CB' } },
    axisTick: { show: false },
    axisLabel: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 10,
      color: '#6B6F76',
    },
    splitLine: { show: false },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 10,
      color: '#6B6F76',
    },
    splitLine: {
      show: true,
      lineStyle: { color: '#D9D5CB', type: 'dashed', width: 0.5 },
    },
  },
  series: {
    line: {
      symbol: 'none',
      lineStyle: { width: 1.5 },
      itemStyle: { borderWidth: 0 },
      smooth: true,
    },
    bar: {
      barWidth: '40%',
      itemStyle: { borderRadius: [2, 2, 0, 0] },
    },
  },
  legend: {
    show: false,
  },
}

const darkTheme = {
  ...lightTheme,
  color: ['#5FB3CE', '#E5775F', '#6FA6D6', '#9A9EA5', '#64748b'],
  backgroundColor: 'transparent',
  textStyle: {
    ...lightTheme.textStyle,
    color: '#9A9EA5',
  },
  title: {
    ...lightTheme.title,
    textStyle: {
      ...lightTheme.title.textStyle,
      color: '#ECE9E2',
    },
  },
  tooltip: {
    ...lightTheme.tooltip,
    backgroundColor: '#121315',
    borderColor: '#2A2C30',
    textStyle: {
      ...lightTheme.tooltip.textStyle,
      color: '#ECE9E2',
    },
  },
  axisLabel: {
    color: '#9A9EA5',
  },
  xAxis: {
    ...lightTheme.xAxis,
    axisLine: { lineStyle: { color: '#2A2C30' } },
    axisLabel: {
      ...lightTheme.xAxis.axisLabel,
      color: '#9A9EA5',
    },
  },
  yAxis: {
    ...lightTheme.yAxis,
    axisLabel: {
      ...lightTheme.yAxis.axisLabel,
      color: '#9A9EA5',
    },
    splitLine: {
      show: true,
      lineStyle: { color: '#2A2C30', type: 'dashed', width: 0.5 },
    },
  },
}

// Register once at module load
echarts.registerTheme('publication', lightTheme)
echarts.registerTheme('publication-dark', darkTheme)

export function getEChartsTheme(isDark: boolean): string {
  return isDark ? 'publication-dark' : 'publication'
}
