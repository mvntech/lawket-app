import { test, expect } from '@playwright/test'

test.describe('Health check', () => {

  test('/api/health returns 200', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
  })

  test('/api/health returns healthy status', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json() as { status: string; timestamp: string }
    expect(body.status).toBe('healthy')
  })

  test('/api/health returns a valid ISO timestamp', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json() as { status: string; timestamp: string }
    expect(body.timestamp).toBeTruthy()
    // Must be a parseable date
    const parsed = new Date(body.timestamp)
    expect(parsed.toISOString()).toBeTruthy()
    // Must be recent (within the last minute)
    const ageMs = Date.now() - parsed.getTime()
    expect(ageMs).toBeLessThan(60_000)
  })

  test('/api/health responds in under 5 seconds', async ({ request }) => {
    const start = Date.now()
    const response = await request.get('/api/health')
    const elapsed = Date.now() - start
    expect(response.status()).toBe(200)
    expect(elapsed).toBeLessThan(5000)
  })
})
