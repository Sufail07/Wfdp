import { vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
  writable: true,
})

// Mock ResizeObserver (ECharts needs it)
Object.defineProperty(window, 'ResizeObserver', {
  value: vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
  writable: true,
})

// Mock element dimensions for ECharts (checks clientWidth/clientHeight)
Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  value: 400,
  configurable: true,
})
Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  value: 300,
  configurable: true,
})

// Mock getComputedStyle for CSS variable resolution in ECharts color helper
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: (name: string) => {
      const vars: Record<string, string> = {
        '--paper': '#F6F4EF',
        '--ink': '#15171A',
        '--ink-muted': '#6B6F76',
        '--rule': '#D9D5CB',
        '--accent': '#1F6F8B',
        '--over': '#C4452D',
        '--under': '#2D6A9F',
      }
      return vars[name] || ''
    },
  }),
  writable: true,
})
