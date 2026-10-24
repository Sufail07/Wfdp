import { useQuery, UseQueryOptions } from '@tanstack/react-query'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

interface ApiError {
  detail?: string
  message?: string
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const resp = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  })

  if (!resp.ok) {
    const errorData: ApiError = await resp.json().catch(() => ({}))
    throw new Error(errorData.detail || errorData.message || `API error: ${resp.status}`)
  }

  return resp.json()
}

// --- Meta ---
export function useMeta(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ['meta'],
    queryFn: () => apiFetch('/meta'),
    ...options,
  })
}

// --- Decision Forecast ---
export interface DecisionForecastRequest {
  delivery_date: string
  cutoff_hour?: number
  cutoff_minute?: number
}

export function useDecisionForecast(params: DecisionForecastRequest, options?: UseQueryOptions) {
  const queryString = new URLSearchParams()
  queryString.set('delivery_date', params.delivery_date)
  if (params.cutoff_hour !== undefined) queryString.set('cutoff_hour', String(params.cutoff_hour))
  if (params.cutoff_minute !== undefined) queryString.set('cutoff_minute', String(params.cutoff_minute))

  return useQuery({
    queryKey: ['decision-forecast', params.delivery_date, params.cutoff_hour, params.cutoff_minute],
    queryFn: () => apiFetch(`/decision-forecast?${queryString.toString()}`),
    enabled: !!params.delivery_date,
    ...options,
  })
}

// --- Forecast Revisions ---
export function useForecastRevisions(
  delivery_date: string,
  max_vintages?: number,
  options?: UseQueryOptions,
) {
  const queryString = new URLSearchParams()
  queryString.set('delivery_date', delivery_date)
  if (max_vintages !== undefined) queryString.set('max_vintages', String(max_vintages))

  return useQuery({
    queryKey: ['forecast-revisions', delivery_date, max_vintages],
    queryFn: () => apiFetch(`/forecast-revisions?${queryString.toString()}`),
    enabled: !!delivery_date,
    ...options,
  })
}

// --- Accuracy Summary ---
export interface AccuracyRequest {
  from_date: string
  to_date: string
  cutoff_hour?: number
  cutoff_minute?: number
}

export function useAccuracySummary(params: AccuracyRequest, options?: UseQueryOptions) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', params.from_date)
  queryString.set('to_date', params.to_date)
  if (params.cutoff_hour !== undefined) queryString.set('cutoff_hour', String(params.cutoff_hour))
  if (params.cutoff_minute !== undefined) queryString.set('cutoff_minute', String(params.cutoff_minute))

  return useQuery({
    queryKey: ['accuracy-summary', params.from_date, params.to_date, params.cutoff_hour, params.cutoff_minute],
    queryFn: () => apiFetch(`/accuracy/summary?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy by Horizon ---
export function useAccuracyByHorizon(from_date: string, to_date: string, options?: UseQueryOptions) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)

  return useQuery({
    queryKey: ['accuracy-by-horizon', from_date, to_date],
    queryFn: () => apiFetch(`/accuracy/by-horizon?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy by Hour ---
export function useAccuracyByHour(
  from_date: string,
  to_date: string,
  cutoff_hour?: number,
  cutoff_minute?: number,
  options?: UseQueryOptions,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)
  if (cutoff_hour !== undefined) queryString.set('cutoff_hour', String(cutoff_hour))
  if (cutoff_minute !== undefined) queryString.set('cutoff_minute', String(cutoff_minute))

  return useQuery({
    queryKey: ['accuracy-by-hour', from_date, to_date, cutoff_hour, cutoff_minute],
    queryFn: () => apiFetch(`/accuracy/by-hour?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy by Wind Level ---
export function useAccuracyByWindLevel(
  from_date: string,
  to_date: string,
  cutoff_hour?: number,
  cutoff_minute?: number,
  options?: UseQueryOptions,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)
  if (cutoff_hour !== undefined) queryString.set('cutoff_hour', String(cutoff_hour))
  if (cutoff_minute !== undefined) queryString.set('cutoff_minute', String(cutoff_minute))

  return useQuery({
    queryKey: ['accuracy-by-wind-level', from_date, to_date, cutoff_hour, cutoff_minute],
    queryFn: () => apiFetch(`/accuracy/by-wind-level?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy Daily ---
export function useAccuracyDaily(
  from_date: string,
  to_date: string,
  cutoff_hour?: number,
  cutoff_minute?: number,
  options?: UseQueryOptions,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)
  if (cutoff_hour !== undefined) queryString.set('cutoff_hour', String(cutoff_hour))
  if (cutoff_minute !== undefined) queryString.set('cutoff_minute', String(cutoff_minute))

  return useQuery({
    queryKey: ['accuracy-daily', from_date, to_date, cutoff_hour, cutoff_minute],
    queryFn: () => apiFetch(`/accuracy/daily?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy Error Distribution ---
export function useAccuracyErrorDistribution(
  from_date: string,
  to_date: string,
  cutoff_hour?: number,
  cutoff_minute?: number,
  bins?: number,
  options?: UseQueryOptions,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)
  if (cutoff_hour !== undefined) queryString.set('cutoff_hour', String(cutoff_hour))
  if (cutoff_minute !== undefined) queryString.set('cutoff_minute', String(cutoff_minute))
  if (bins !== undefined) queryString.set('bins', String(bins))

  return useQuery({
    queryKey: ['accuracy-error-distribution', from_date, to_date, cutoff_hour, cutoff_minute, bins],
    queryFn: () => apiFetch(`/accuracy/error-distribution?${queryString.toString()}`),
    ...options,
  })
}

// --- Risk Band ---
export interface RiskBandRequest {
  delivery_date: string
  quantile?: number
  cutoff_hour?: number
  cutoff_minute?: number
}

export function useRiskBand(params: RiskBandRequest, options?: UseQueryOptions) {
  const queryString = new URLSearchParams()
  queryString.set('delivery_date', params.delivery_date)
  if (params.quantile !== undefined) queryString.set('quantile', String(params.quantile))
  if (params.cutoff_hour !== undefined) queryString.set('cutoff_hour', String(params.cutoff_hour))
  if (params.cutoff_minute !== undefined) queryString.set('cutoff_minute', String(params.cutoff_minute))

  return useQuery({
    queryKey: ['risk-band', params.delivery_date, params.quantile, params.cutoff_hour, params.cutoff_minute],
    queryFn: () => apiFetch(`/risk-band?${queryString.toString()}`),
    enabled: !!params.delivery_date,
    ...options,
  })
}