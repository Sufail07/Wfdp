import { format, formatDistanceToNow, parseISO, subDays } from 'date-fns'
import { utcToZonedTime, zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz'

const LONDON_TZ = 'Europe/London'
const UTC_TZ = 'UTC'

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
  const londonTime = utcToZonedTime(
    new Date(deliveryDate + 'T00:00:00Z'),
    LONDON_TZ
  )
  londonTime.setDate(londonTime.getDate() - 1)
  londonTime.setHours(hour, minute, 0, 0)
  return zonedTimeToUtc(londonTime, LONDON_TZ).toISOString()
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