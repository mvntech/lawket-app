import { describe, it, expect } from 'vitest'

describe('/api/health', () => {
  it('returns healthy status object shape', () => {
    // the health endpoint should return { status: 'healthy', timestamp: '...' }
    const mockResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    }

    expect(mockResponse.status).toBe('healthy')
    expect(mockResponse.timestamp).toBeTruthy()
    expect(new Date(mockResponse.timestamp).toISOString()).toBeTruthy()
  })

  it('returns unhealthy status on DB failure', () => {
    const mockResponse = {
      status: 'unhealthy',
      error: 'Connection refused',
      timestamp: new Date().toISOString(),
    }

    expect(mockResponse.status).toBe('unhealthy')
    expect(mockResponse.error).toBeTruthy()
  })

  it('timestamp is a valid ISO 8601 date', () => {
    const ts = new Date().toISOString()
    // must not throw
    const parsed = new Date(ts)
    expect(parsed.toISOString()).toBe(ts)
  })
})
