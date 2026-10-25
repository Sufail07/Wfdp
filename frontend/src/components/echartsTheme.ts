import * as echarts from 'echarts'

// Direction F - Publication Moment: ECharts theme registered once from locked palette
// 2-color: moment (ink) + context (muted), serif display + mono data
const PALETTE = ['#0f172a', '#64748b', '#94a3b8', '#334155', '#475569']

const baseTheme = {
  color: PALETTE,
  textStyle: {
    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    color: '#0f172a',
    fontSize: 12,
  },
  title: {
    textStyle: {
      fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      fontSize: 14,
      fontWeight: 600,
      color: '#0f172a',
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
    color: '#64748b',
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
      color: '#64748b',
    },
  },
}

const darkTheme = {
  ...baseTheme,
  textStyle: {
    ...baseTheme.textStyle,
    color: '#f8fafc',
  },
  title: {
    ...baseTheme.title,
    textStyle: {
      ...baseTheme.title.textStyle,
      color: '#f8fafc',
    },
  },
  axisLabel: {
    ...baseTheme.axisLabel,
    color: '#94a3b8',
  },
  axisLine: {
    lineStyle: {
      color: '#1e293b',
    },
  },
  splitLine: {
    lineStyle: {
      color: '#0f172a',
      type: 'dashed',
    },
  },
  legend: {
    ...baseTheme.legend,
    textStyle: {
      ...baseTheme.legend.textStyle,
      color: '#94a3b8',
    },
  },
}

// Register once at module load
echarts.registerTheme('publication', baseTheme)
echarts.registerTheme('publication-dark', darkTheme)

export function getEChartsTheme(isDark: boolean): string {
  return isDark ? 'publication-dark' : 'publication'
}
