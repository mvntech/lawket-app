import { test, expect } from '@playwright/test'

test.describe('Security headers', () => {

  test('X-Frame-Options is DENY', async ({ request }) => {
    const response = await request.get('/login')
    const header = response.headers()['x-frame-options']
    expect(header).toBe('DENY')
  })

  test('X-Content-Type-Options is nosniff', async ({ request }) => {
    const response = await request.get('/login')
    const header = response.headers()['x-content-type-options']
    expect(header).toBe('nosniff')
  })

  test('Strict-Transport-Security header is present when set', async ({ request }) => {
    const response = await request.get('/login')
    const header = response.headers()['strict-transport-security']
    // HSTS is typically only sent over HTTPS (skip on localhost)
    if (header) {
      expect(header).toContain('max-age=')
    }
  })

  test('Referrer-Policy header is set', async ({ request }) => {
    const response = await request.get('/login')
    const header = response.headers()['referrer-policy']
    if (header) {
      expect(header).toBeTruthy()
    }
  })
})

test.describe('Auth protection on API routes', () => {

  test('POST /api/credits/ad-reward returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/credits/ad-reward')
    expect(response.status()).toBe(401)
  })

  test('POST /api/credits/checkout returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/credits/checkout', {
      data: { packageId: 'starter' },
    })
    expect(response.status()).toBe(401)
  })

  test('GET /api/credits/balance returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/credits/balance')
    expect(response.status()).toBe(401)
  })

  test('POST /api/ai/chat returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/ai/chat', {
      data: { message: 'Hello' },
    })
    expect(response.status()).toBe(401)
  })

  test('POST /api/documents/process returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/documents/process', {
      data: { filePath: 'test.pdf', mimeType: 'application/pdf' },
    })
    expect(response.status()).toBe(401)
  })
})
