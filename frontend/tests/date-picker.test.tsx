import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { Accuracy } from '../src/features/accuracy/Accuracy'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../src/context/ThemeContext'

const mockFetch = vi.fn()
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  vi.restoreAllMocks()
  mockFetch.mockReset()
})

describe('Accuracy date pickers use meta min/max', () => {
  it('sets min and max from /api/meta coverage dates', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/meta')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            coverage_start: '2026-01-02',
            coverage_end: '2026-02-01',
            snapshot_id: '2026-10-24T16:03:18.542377+00:00',
          }),
        })
      }
      if (url.includes('/accuracy/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            from_date: '2026-01-02',
            to_date: '2026-01-08',
            metrics: {
              n: 672,
              n_days: 7,
              bias: -100,
              mae: 500,
              rmse: 600,
              nmae: 0.1,
              over_forecast_share: 0.5,
              tail_risk_p95_over_mw: 1000,
            },
          }),
        })
      }
      if (url.includes('/accuracy/daily')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        })
      }
      if (url.includes('/accuracy/by-horizon')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        })
      }
      if (url.includes('/accuracy/by-hour')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        })
      }
      if (url.includes('/accuracy/by-wind-level')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        })
      }
      if (url.includes('/accuracy/error-distribution')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            distribution: {
              histogram: { bins: [], counts: [] },
              quantiles: {},
            },
          }),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Accuracy />
        </ThemeProvider>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      const inputs = document.querySelectorAll('input[type="date"]')
      expect(inputs.length).toBeGreaterThanOrEqual(2)
      const fromInput = inputs[0] as HTMLInputElement
      const toInput = inputs[1] as HTMLInputElement
      expect(fromInput.min).toBe('2026-01-02')
      expect(fromInput.max).toBe('2026-02-01')
      expect(toInput.min).toBe('2026-01-02')
      expect(toInput.max).toBe('2026-02-01')
    })
  })
})
