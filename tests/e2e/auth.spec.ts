import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'muntaha321pk@gmail.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Mun@1234'

test.describe('Authentication', () => {

  test('redirects unauthenticated user from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('shows validation errors on empty form submit', async ({ page }) => {
    await page.goto('/login')
    await page.click('button[type="submit"]')
    // either role="alert" or an error message text should appear
    await expect(
      page.locator('[role="alert"], [data-testid="error"], .text-destructive').first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('shows error on wrong password', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', 'definitelywrongpassword999')
    await page.click('button[type="submit"]')
    await expect(
      page.locator('[role="alert"]')
        .or(page.locator('text=Invalid'))
        .or(page.locator('text=credentials'))
        .first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('redirects logged-in user from /login to /dashboard', async ({ page }) => {
    // first authenticate
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 })

    // now try to visit login again
    await page.goto('/login')
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('full auth flow: register → dashboard → logout → login guard', async ({ page }) => {
    const uniqueEmail = `test-${Date.now()}@lawket-test.app`

    // register
    await page.goto('/register')
    await page.fill('input[name="full_name"]', 'Test Advocate')
    await page.fill('input[type="email"]', uniqueEmail)
    await page.fill('input[type="password"]', TEST_PASSWORD)

    // look for confirm_password field if it exists
    const confirmInput = page.locator('input[name="confirm_password"]')
    if (await confirmInput.count() > 0) {
      await confirmInput.fill(TEST_PASSWORD)
    }

    await page.click('button[type="submit"]')

    // should redirect to dashboard after registration
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 })

    // should show a greeting or dashboard content
    await expect(
      page.locator('text=Good')
        .or(page.locator('text=Dashboard'))
        .or(page.locator('text=Welcome'))
        .first()
    ).toBeVisible()

    // sign out (go to settings or find sign-out button)
    await page.goto('/settings')

    const signOutButton = page.locator('button:has-text("Sign out")').or(
      page.locator('button:has-text("Log out")')
    )

    if (await signOutButton.count() > 0) {
      await signOutButton.first().click()
      // confirm dialog if present
      const confirmButton = page.locator('button:has-text("Sign out")').or(
        page.locator('[role="alertdialog"] button:has-text("Sign out")')
      )
      if (await confirmButton.count() > 0) {
        await confirmButton.last().click()
      }
      await expect(page).toHaveURL(/.*login/, { timeout: 8000 })
    }

    // verify dashboard is now protected
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*login/)
  })
})
