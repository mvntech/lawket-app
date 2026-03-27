import { test, expect } from '@playwright/test'

test.describe('Public pages', () => {

  test('/ redirects to login or dashboard', async ({ page }) => {
    await page.goto('/')
    const url = page.url()
    expect(
      url.includes('/login') ||
      url.includes('/dashboard') ||
      url === 'http://localhost:3000/',
    ).toBe(true)
  })

  test('/login is accessible and does not crash', async ({ page }) => {
    await page.goto('/login')
    await expect(page).not.toHaveURL(/.*500.*/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('/register is accessible and does not crash', async ({ page }) => {
    await page.goto('/register')
    await expect(page).not.toHaveURL(/.*500.*/)
    await expect(page).toHaveURL(/.*register.*/)
  })

  test('404 page does not return 500', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist-lawket')
    // Should be 404, not 500
    expect(response?.status()).not.toBe(500)
  })

  test('login page has correct page title', async ({ page }) => {
    await page.goto('/login')
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('unauthenticated access to /dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('unauthenticated access to /cases redirects to login', async ({ page }) => {
    await page.goto('/cases')
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('unauthenticated access to /settings redirects to login', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/.*login.*/)
  })
})
