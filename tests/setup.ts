import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeAll(() => {
  // mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(
      (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })
    ),
  })

  // mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(
    () => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    })
  )

  // mock IntersectionObserver
  global.IntersectionObserver = vi.fn()
    .mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))

  // mock navigator.serviceWorker
  Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          subscribe: vi.fn(),
          getSubscription: vi.fn().mockResolvedValue(null),
        },
        sync: { register: vi.fn() },
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      register: vi.fn(),
    },
  })

  // mock Notification API
  global.Notification = {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  } as unknown as typeof Notification
})
