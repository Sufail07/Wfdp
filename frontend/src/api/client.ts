/// <reference types="vite/client" />

import { useQuery, UseQueryOptions } from '@tanstack/react-query'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

interface ApiError {
  detail?: string
  message?: string
}

interface MetaResponse {
  coverage_start: string
  coverage_end: string
  default_cutoff_hour: number
  default_cutoff_minute: number
  timezone: string
  snapshot_id: string
  row_counts: Record<string, number>
  assumptions: string[]
  caveats: string[]
}

interface DecisionForecastPoint {
  startTime: string
  publishTime: string
  forecastMW: number
  horizon_h: number
}

interface DecisionForecastResponse {
  delivery_date: string
  cutoff_hour: number
  cutoff_minute: number
  cutoff_utc: string
  total_points: number
  forecasts: DecisionForecastPoint[]
  total_expected_mwh: number | null
  peak_mw: number | null
  min_mw: number | null
  mean_mw: number | null
  forecast_published_at: string | null
}

interface ForecastRevisionPoint {
  startTime: string
  publishTime: string
  forecastMW: number
  cutoff_eligible: boolean
}

interface ForecastRevisionsResponse {
  delivery_date: string
  vintages: ForecastRevisionPoint[]
  max_vintages: number | null
}

interface AccuracySummaryResponse {
  from_date: string
  to_date: string
  cutoff_hour: number
  cutoff_minute: number
  metrics: Record<string, any>
}

interface AccuracyByHorizonResponse {
  from_date: string
  to_date: string
  results: Record<string, any>[]
}

interface AccuracyByHourResponse {
  from_date: string
  to_date: string
  cutoff_hour: number | null
  cutoff_minute: number | null
  results: Record<string, any>[]
}

interface AccuracyByWindLevelResponse {
  from_date: string
  to_date: string
  cutoff_hour: number | null
  cutoff_minute: number | null
  results: Record<string, any>[]
  tercile_lower: number | null
  tercile_upper: number | null
}

interface AccuracyDailyResponse {
  from_date: string
  to_date: string
  cutoff_hour: number | null
  cutoff_minute: number | null
  results: Record<string, any>[]
}

interface AccuracyErrorDistributionResponse {
  from_date: string
  to_date: string
  cutoff_hour: number | null
  cutoff_minute: number | null
  bin_width: number | null
  distribution: Record<string, any>
}

interface RiskBandPoint {
  startTime: string
  forecastMW: number
  riskAdjustedMW: number
  horizon_h: number
}

interface RiskBandResponse {
  delivery_date: string
  quantile: number
  cutoff_hour: number
  cutoff_minute: number
  in_sample: boolean
  sample_days: number
  sample_errors: number
  over_forecast_quantile: number | null
  risk_adjusted: RiskBandPoint[]
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
export function useMeta(options?: UseQueryOptions<MetaResponse>) {
  return useQuery<MetaResponse>({
    queryKey: ['meta'],
    queryFn: () => apiFetch<MetaResponse>('/meta'),
    ...options,
  })
}

// --- Decision Forecast ---
export interface DecisionForecastRequest {
  delivery_date: string
  cutoff_hour?: number
  cutoff_minute?: number
}

export function useDecisionForecast(
  params: DecisionForecastRequest,
  options?: UseQueryOptions<DecisionForecastResponse>,
) {
  const queryString = new URLSearchParams()
  queryString.set('delivery_date', params.delivery_date)
  if (params.cutoff_hour !== undefined) queryString.set('cutoff_hour', String(params.cutoff_hour))
  if (params.cutoff_minute !== undefined) queryString.set('cutoff_minute', String(params.cutoff_minute))

  return useQuery<DecisionForecastResponse>({
    queryKey: ['decision-forecast', params.delivery_date, params.cutoff_hour, params.cutoff_minute],
    queryFn: () =>
      apiFetch<DecisionForecastResponse>(`/decision-forecast?${queryString.toString()}`),
    enabled: !!params.delivery_date,
    ...options,
  })
}

// --- Forecast Revisions ---
export function useForecastRevisions(
  delivery_date: string,
  max_vintages?: number,
  options?: UseQueryOptions<ForecastRevisionsResponse>,
) {
  const queryString = new URLSearchParams()
  queryString.set('delivery_date', delivery_date)
  if (max_vintages !== undefined) queryString.set('max_vintages', String(max_vintages))

  return useQuery<ForecastRevisionsResponse>({
    queryKey: ['forecast-revisions', delivery_date, max_vintages],
    queryFn: () =>
      apiFetch<ForecastRevisionsResponse>(`/forecast-revisions?${queryString.toString()}`),
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

export function useAccuracySummary(
  params: AccuracyRequest,
  options?: UseQueryOptions<AccuracySummaryResponse>,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', params.from_date)
  queryString.set('to_date', params.to_date)
  if (params.cutoff_hour !== undefined) queryString.set('cutoff_hour', String(params.cutoff_hour))
  if (params.cutoff_minute !== undefined) queryString.set('cutoff_minute', String(params.cutoff_minute))

  return useQuery<AccuracySummaryResponse>({
    queryKey: [
      'accuracy-summary',
      params.from_date,
      params.to_date,
      params.cutoff_hour,
      params.cutoff_minute,
    ],
    queryFn: () =>
      apiFetch<AccuracySummaryResponse>(`/accuracy/summary?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy by Horizon ---
export function useAccuracyByHorizon(
  from_date: string,
  to_date: string,
  options?: UseQueryOptions<AccuracyByHorizonResponse>,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)

  return useQuery<AccuracyByHorizonResponse>({
    queryKey: ['accuracy-by-horizon', from_date, to_date],
    queryFn: () =>
      apiFetch<AccuracyByHorizonResponse>(`/accuracy/by-horizon?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy by Hour ---
export function useAccuracyByHour(
  from_date: string,
  to_date: string,
  cutoff_hour?: number,
  cutoff_minute?: number,
  options?: UseQueryOptions<AccuracyByHourResponse>,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)
  if (cutoff_hour !== undefined) queryString.set('cutoff_hour', String(cutoff_hour))
  if (cutoff_minute !== undefined) queryString.set('cutoff_minute', String(cutoff_minute))

  return useQuery<AccuracyByHourResponse>({
    queryKey: ['accuracy-by-hour', from_date, to_date, cutoff_hour, cutoff_minute],
    queryFn: () =>
      apiFetch<AccuracyByHourResponse>(`/accuracy/by-hour?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy by Wind Level ---
export function useAccuracyByWindLevel(
  from_date: string,
  to_date: string,
  cutoff_hour?: number,
  cutoff_minute?: number,
  options?: UseQueryOptions<AccuracyByWindLevelResponse>,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)
  if (cutoff_hour !== undefined) queryString.set('cutoff_hour', String(cutoff_hour))
  if (cutoff_minute !== undefined) queryString.set('cutoff_minute', String(cutoff_minute))

  return useQuery<AccuracyByWindLevelResponse>({
    queryKey: ['accuracy-by-wind-level', from_date, to_date, cutoff_hour, cutoff_minute],
    queryFn: () =>
      apiFetch<AccuracyByWindLevelResponse>(`/accuracy/by-wind-level?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy Daily ---
export function useAccuracyDaily(
  from_date: string,
  to_date: string,
  cutoff_hour?: number,
  cutoff_minute?: number,
  options?: UseQueryOptions<AccuracyDailyResponse>,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)
  if (cutoff_hour !== undefined) queryString.set('cutoff_hour', String(cutoff_hour))
  if (cutoff_minute !== undefined) queryString.set('cutoff_minute', String(cutoff_minute))

  return useQuery<AccuracyDailyResponse>({
    queryKey: ['accuracy-daily', from_date, to_date, cutoff_hour, cutoff_minute],
    queryFn: () =>
      apiFetch<AccuracyDailyResponse>(`/accuracy/daily?${queryString.toString()}`),
    ...options,
  })
}

// --- Accuracy Error Distribution ---
export function useAccuracyErrorDistribution(
  from_date: string,
  to_date: string,
  cutoff_hour?: number,
  cutoff_minute?: number,
  bin_width?: number,
  options?: UseQueryOptions<AccuracyErrorDistributionResponse>,
) {
  const queryString = new URLSearchParams()
  queryString.set('from_date', from_date)
  queryString.set('to_date', to_date)
  if (cutoff_hour !== undefined) queryString.set('cutoff_hour', String(cutoff_hour))
  if (cutoff_minute !== undefined) queryString.set('cutoff_minute', String(cutoff_minute))
  if (bin_width !== undefined) queryString.set('bin_width', String(bin_width))

  return useQuery<AccuracyErrorDistributionResponse>({
    queryKey: [
      'accuracy-error-distribution',
      from_date,
      to_date,
      cutoff_hour,
      cutoff_minute,
      bin_width,
    ],
    queryFn: () =>
      apiFetch<AccuracyErrorDistributionResponse>(
        `/accuracy/error-distribution?${queryString.toString()}`
      ),
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

export function useRiskBand(
  params: RiskBandRequest,
  options?: UseQueryOptions<RiskBandResponse>,
) {
  const queryString = new URLSearchParams()
  queryString.set('delivery_date', params.delivery_date)
  if (params.quantile !== undefined) queryString.set('quantile', String(params.quantile))
  if (params.cutoff_hour !== undefined) queryString.set('cutoff_hour', String(params.cutoff_hour))
  if (params.cutoff_minute !== undefined)
    queryString.set('cutoff_minute', String(params.cutoff_minute))

  return useQuery<RiskBandResponse>({
    queryKey: [
      'risk-band',
      params.delivery_date,
      params.quantile,
      params.cutoff_hour,
      params.cutoff_minute,
    ],
    queryFn: () => apiFetch<RiskBandResponse>(`/risk-band?${queryString.toString()}`),
    enabled: !!params.delivery_date,
    ...options,
  })
}