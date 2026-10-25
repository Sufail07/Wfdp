import * as echarts from 'echarts'

// Direction F - Publication Moment: ECharts theme registered once from locked palette
// 2-color: moment (ink) + context (muted), serif display + mono data
const PALETTE = ['#111827', '#6b7280', '#9ca3af', '#1f2937', '#4b5563']

const baseTheme = {
  color: PALETTE,
  textStyle: {
    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    color: '#111827',
    fontSize: 13,
  },
  title: {
    textStyle: {
      fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      fontSize: 16,
      fontWeight: 600,
      color: '#111827',
    },
  },
  tooltip: {
    textStyle: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 12,
    },
  },
  axisLabel: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    fontSize: 11,
    color: '#6b7280',
  },
  axisLine: {
    lineStyle: {
      color: '#e2e8f0',
    },
  },
  splitLine: {
    lineStyle: {
      color: '#f1f5f9',
      type: 'dashed',
    },
  },
  legend: {
    textStyle: {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 12,
      color: '#6b7280',
    },
  },
}

const darkTheme = {
  ...baseTheme,
  textStyle: {
    ...baseTheme.textStyle,
    color: '#ffffff',
  },
  title: {
    ...baseTheme.title,
    textStyle: {
      ...baseTheme.title.textStyle,
      color: '#ffffff',
    },
  },
  axisLabel: {
    ...baseTheme.axisLabel,
    color: '#9ca3af',
  },
  axisLine: {
    lineStyle: {
      color: '#334155',
    },
  },
  splitLine: {
    lineStyle: {
      color: '#1e293b',
      type: 'dashed',
    },
  },
  legend: {
    ...baseTheme.legend,
    textStyle: {
      ...baseTheme.legend.textStyle,
      color: '#9ca3af',
    },
  },
}

// Register once at module load
echarts.registerTheme('publication', baseTheme)
echarts.registerTheme('publication-dark', darkTheme)

export function getEChartsTheme(isDark: boolean): string {
  return isDark ? 'publication-dark' : 'publication'
}
