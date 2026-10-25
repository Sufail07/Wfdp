import { format } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

const LONDON_TZ = 'Europe/London'

/**
 * Format a timestamp for display in London time
 */
export function formatLondonTime(isoString: string, formatStr: string = 'MMM d, HH:mm'): string {
  try {
    return formatInTimeZone(isoString, LONDON_TZ, formatStr)
  } catch {
    return isoString
  }
}

/**
 * Format a MW value with appropriate unit
 */
export function formatMW(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)} GW`
  }
  return `${value.toFixed(0)} MW`
}

/**
 * Format MWh value
 */
export function formatMWh(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)} GWh`
  }
  return `${value.toFixed(0)} MWh`
}

/**
 * Format a number with comma separators
 */
export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/**
 * Format a percentage
 */
export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Get London date from a delivery date string
 */
export function getLondonDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return format(d, 'yyyy-MM-dd')
  } catch {
    return dateStr
  }
}

/**
 * Get the cutoff timestamp (D-1 09:00 London) in ISO format
 */
export function getCutoffISO(deliveryDate: string, hour: number = 9, minute: number = 0): string {
  const deliveryUtc = new Date(deliveryDate + 'T00:00:00Z')
  const deliveryLondon = toZonedTime(deliveryUtc, LONDON_TZ)
  deliveryLondon.setDate(deliveryLondon.getDate() - 1)
  deliveryLondon.setHours(hour, minute, 0, 0)
  const cutoffUtc = fromZonedTime(deliveryLondon, LONDON_TZ)
  return cutoffUtc.toISOString()
}

/**
 * Format hours as human readable
 */
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${hours.toFixed(0)}h`
  return `${(hours / 24).toFixed(1)} days`
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Format an ISO snapshot timestamp as "24 Oct 2026, 16:03 UTC".
 */
export function formatLondonDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    const day = d.getUTCDate()
    const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
    const year = d.getUTCFullYear()
    const hours = d.getUTCHours().toString().padStart(2, '0')
    const minutes = d.getUTCMinutes().toString().padStart(2, '0')
    return `${day} ${month} ${year}, ${hours}:${minutes} UTC`
  } catch {
    return isoString
  }
}

/**
 * Format a signed MW value with direction words (above/below).
 * Positive = over-forecast = forecast above actual = shortfall risk.
 */
export function formatBiasDirection(value: number): { direction: 'above' | 'below'; absValue: number } {
  if (value >= 0) return { direction: 'above', absValue: value }
  return { direction: 'below', absValue: Math.abs(value) }
}

/**
 * Build the accuracy summary sentence for a date range.
 * e.g. "Over 14 to 17 January, forecasts ran 337 MW below actual wind on average,
 * and 1 in 20 half-hours was off by more than 1.1 GW."
 * 
 * p95All is the P95 of ALL signed errors (not over-forecasts only), so
 * "1 in 20 half-hours" is statistically correct.
 */
export function buildAccuracySummary(
  fromDate: string,
  toDate: string,
  bias: number | null | undefined,
  p95AllMw: number | null | undefined,
): string {
  if (bias === null || bias === undefined || isNaN(bias)) {
    return `Over ${fromDate} to ${toDate}, no accuracy data available.`
  }

  const { direction, absValue } = formatBiasDirection(bias)
  const biasStr = absValue.toFixed(0)
  const nIn20 = p95AllMw !== null && p95AllMw !== undefined && !isNaN(p95AllMw)
    ? `1 in 20 half-hours was off by more than ${formatMW(p95AllMw)}`
    : ''

  return `Over ${fromDate} to ${toDate}, forecasts ran ${biasStr} MW ${direction} actual wind on average.${nIn20 ? ' ' + nIn20 : ''}`
}

/**
 * Build a plain-English bias explanation line.
 * e.g. "On average the forecast was 337 MW below actual wind."
 */
export function buildBiasLine(bias: number | null | undefined): string {
  if (bias === null || bias === undefined || isNaN(bias)) return ''
  const { direction, absValue } = formatBiasDirection(bias)
  return `On average the forecast was ${absValue.toFixed(0)} MW ${direction} actual wind.`
}

/**
 * Tooltip definitions for accuracy metrics
 */
export const METRIC_TOOLTIPS: Record<string, string> = {
  bias: 'Mean signed error (forecast − actual). Positive = over-forecast = shortfall risk for buyer.',
  mae: 'Mean absolute error. Average magnitude of forecast error, regardless of direction.',
  rmse: 'Root mean square error. Penalises large errors more than MAE.',
  nmae: 'Normalised MAE (MAE ÷ mean actual wind). Dimensionless ratio for comparing across scales.',
}

/**
 * Count days in an inclusive date range
 */
export function countDaysInRange(fromDate: string, toDate: string): number {
  const from = new Date(fromDate + 'T00:00:00')
  const to = new Date(toDate + 'T00:00:00')
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
}