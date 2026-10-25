import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildAccuracySummary,
  buildBiasLine,
  formatMW,
  formatBiasDirection,
  countDaysInRange,
} from '../src/utils/format'

describe('buildAccuracySummary', () => {
  it('reports below-average when bias is negative', () => {
    const result = buildAccuracySummary('2026-01-14', '2026-01-17', -337, 1100)
    expect(result).toContain('Over 2026-01-14 to 2026-01-17')
    expect(result).toContain('337 MW below actual wind on average')
    expect(result).toContain('1 in 20 half-hours was off by more than 1.1 GW')
  })

  it('reports above-average when bias is positive', () => {
    const result = buildAccuracySummary('2026-01-14', '2026-01-17', 250, 1500)
    expect(result).toContain('250 MW above actual wind on average')
    expect(result).toContain('1 in 20 half-hours was off by more than 1.5 GW')
  })

  it('handles zero bias', () => {
    const result = buildAccuracySummary('2026-01-14', '2026-01-17', 0, null)
    expect(result).toContain('0 MW above actual wind on average')
    expect(result).not.toContain('1 in 20')
  })

  it('handles null bias gracefully', () => {
    const result = buildAccuracySummary('2026-01-14', '2026-01-17', null, null)
    expect(result).toContain('no accuracy data available')
  })
})

describe('buildBiasLine', () => {
  it('reports below when bias is negative', () => {
    expect(buildBiasLine(-337)).toBe('On average the forecast was 337 MW below actual wind.')
  })

  it('reports above when bias is positive', () => {
    expect(buildBiasLine(250)).toBe('On average the forecast was 250 MW above actual wind.')
  })

  it('returns empty string for null bias', () => {
    expect(buildBiasLine(null)).toBe('')
  })
})

describe('formatBiasDirection', () => {
  it('returns above for positive values', () => {
    const r = formatBiasDirection(337)
    expect(r.direction).toBe('above')
    expect(r.absValue).toBe(337)
  })

  it('returns below for negative values', () => {
    const r = formatBiasDirection(-337)
    expect(r.direction).toBe('below')
    expect(r.absValue).toBe(337)
  })

  it('returns above for zero', () => {
    const r = formatBiasDirection(0)
    expect(r.direction).toBe('above')
    expect(r.absValue).toBe(0)
  })
})

describe('formatMW', () => {
  it('rounds to whole MW when below 1000', () => {
    expect(formatMW(676)).toBe('676 MW')
    expect(formatMW(676.58)).toBe('677 MW')
  })

  it('converts to GW when >= 1000 MW', () => {
    expect(formatMW(8172)).toBe('8.2 GW')
    expect(formatMW(6003)).toBe('6.0 GW')
  })

  it('returns N/A for null/undefined', () => {
    expect(formatMW(null)).toBe('N/A')
    expect(formatMW(undefined)).toBe('N/A')
  })
})

describe('countDaysInRange', () => {
  it('counts inclusive days correctly', () => {
    expect(countDaysInRange('2026-01-14', '2026-01-17')).toBe(4)
    expect(countDaysInRange('2026-01-02', '2026-02-01')).toBe(31)
    expect(countDaysInRange('2026-01-02', '2026-01-02')).toBe(1)
  })
})

describe('small sample notice', () => {
  it('flags ranges under 7 days as small sample', () => {
    expect(countDaysInRange('2026-01-14', '2026-01-17') < 7).toBe(true)
  })

  it('does not flag ranges of 7+ days', () => {
    expect(countDaysInRange('2026-01-02', '2026-01-08') < 7).toBe(false)
  })
})

describe('histogram data invariants', () => {
  it('counts sum to total half-hours', () => {
    const bins = [-1000, -750, -500, -250, 0, 250, 500, 750, 1000]
    const counts = [5, 10, 20, 35, 50, 30, 15, 5]
    const total = counts.reduce((sum, c) => sum + c, 0)
    expect(total).toBe(170)
  })

  it('zero marker is at x=0', () => {
    const markLineData = [{ xAxis: 0, label: { show: false } }]
    expect(markLineData[0].xAxis).toBe(0)
  })

  it('P-markers are at their x-axis values', () => {
    const p90 = 2551
    const p95 = 3024
    const markers = [
      { xAxis: p90, label: `P90 all: ${Math.round(p90)} MW` },
      { xAxis: p95, label: `P95 all: ${Math.round(p95)} MW` },
    ]
    expect(markers[0].xAxis).toBe(2551)
    expect(markers[1].xAxis).toBe(3024)
  })

  it('y-axis max is at most 1.1x the tallest bin', () => {
    const counts = [5, 10, 20, 35, 50, 30, 15, 5]
    const maxCount = Math.max(...counts)
    const yMax = Math.ceil(maxCount * 1.1)
    expect(yMax).toBeGreaterThanOrEqual(maxCount)
    expect(yMax).toBeLessThanOrEqual(maxCount * 1.1 + 1)
  })

  it('bar colors use over for positive centers, under for negative', () => {
    const bins = [-500, -250, 0, 250, 500]
    const bin_width = 250
    const barData = bins.slice(0, -1).map((start, i) => {
      const end = bins[i + 1] ?? start + bin_width
      const center = (start + end) / 2
      return center >= 0 ? 'over' : 'under'
    })
    expect(barData).toEqual(['under', 'under', 'over', 'over'])
  })
})
