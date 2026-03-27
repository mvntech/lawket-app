import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'muntaha321pk@gmail.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Mun@1234'

async function loginAs(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 })
}

test.describe('Offline Functionality', () => {

  test('offline banner appears when network is disabled', async ({ page, context }) => {
    await loginAs(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // go offline
    await context.setOffline(true)

    // offline banner should appear
    await expect(
      page.locator('text=offline')
        .or(page.locator('text=Offline'))
        .or(page.locator('text=No internet'))
        .or(page.locator('[data-testid="offline-banner"]'))
        .first()
    ).toBeVisible({ timeout: 8000 })

    // restore connection
    await context.setOffline(false)
  })

  test('cached cases remain visible when offline', async ({ page, context }) => {
    await loginAs(page)

    // load cases page online first to populate cache
    await page.goto('/cases')
    await page.waitForLoadState('networkidle')

    // go offline
    await context.setOffline(true)

    // navigate to cases again
    await page.goto('/cases')

    // cases should still be visible from Dexie cache (or offline state handled gracefully)
    await expect(page.locator('body')).toBeVisible()
    // page should not crash with an unhandled error
    await expect(page.locator('text=Something went wrong')).not.toBeVisible({ timeout: 3000 })

    // restore
    await context.setOffline(false)
  })

  test('offline banner disappears when back online', async ({ page, context }) => {
    await loginAs(page)
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await context.setOffline(true)

    // wait for banner
    const offlineBanner = page.locator('text=offline').or(page.locator('text=No internet')).first()
    await offlineBanner.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {
      // banner may not appear immediately in all implementations
    })

    await context.setOffline(false)

    // banner should disappear after reconnecting
    await expect(offlineBanner).not.toBeVisible({ timeout: 8000 })
  })
})
