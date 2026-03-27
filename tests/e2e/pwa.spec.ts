import { test, expect } from '@playwright/test'

test.describe('PWA requirements', () => {

  test('manifest.json is accessible', async ({ request }) => {
    const response = await request.get('/manifest.json')
    expect(response.status()).toBe(200)
  })

  test('manifest.json has correct content-type', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const contentType = response.headers()['content-type']
    expect(contentType).toMatch(/json/)
  })

  test('manifest has required name fields', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json() as {
      name: string
      short_name: string
      start_url: string
      display: string
      icons: Array<{ src: string; sizes: string; type: string }>
      theme_color: string
    }

    expect(manifest.name).toBeTruthy()
    expect(manifest.short_name).toBeTruthy()
  })

  test('manifest has standalone display mode', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json() as { display: string }
    expect(manifest.display).toBe('standalone')
  })

  test('manifest has at least one icon', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json() as {
      icons: Array<{ src: string; sizes: string }>
    }
    expect(manifest.icons).toBeInstanceOf(Array)
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  test('manifest theme_color is Lawket brand amber', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json() as { theme_color: string }
    expect(manifest.theme_color).toBe('#f59e0b')
  })

  test('manifest start_url points to /dashboard', async ({ request }) => {
    const response = await request.get('/manifest.json')
    const manifest = await response.json() as { start_url: string }
    expect(manifest.start_url).toBe('/dashboard')
  })

  test('icon-192.png is accessible', async ({ request }) => {
    const response = await request.get('/icons/icon-192.png')
    expect(response.status()).toBe(200)
  })

  test('icon-512.png is accessible', async ({ request }) => {
    const response = await request.get('/icons/icon-512.png')
    expect(response.status()).toBe(200)
  })

  test('apple-touch-icon.png is accessible', async ({ request }) => {
    const response = await request.get('/icons/apple-touch-icon.png')
    expect(response.status()).toBe(200)
  })

  test('sw.js is accessible', async ({ request }) => {
    const response = await request.get('/sw.js')
    expect(response.status()).toBeLessThan(400)
  })
})
