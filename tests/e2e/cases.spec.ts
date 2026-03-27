import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'muntaha321pk@gmail.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'Mun@1234'

// authentication helper

async function loginAs(page: import('@playwright/test').Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 })
}

// tests

test.describe('Case Management', () => {

  test.beforeEach(async ({ page }) => {
    await loginAs(page)
  })

  test('create new case - appears in cases list', async ({ page }) => {
    await page.goto('/cases/new')

    await page.fill('input[name="case_number"]', `E2E-${Date.now()}`)
    await page.fill('input[name="title"]', 'E2E Automated Test Case')
    await page.fill('input[name="client_name"]', 'Automated Test Client')

    // select case type if there's a dropdown
    const caseTypeSelect = page.locator('[name="case_type"], select[name="case_type"]')
    if (await caseTypeSelect.count() > 0) {
      await caseTypeSelect.selectOption('criminal').catch(async () => {
        // it might be a custom select/combobox
        await page.locator('[name="case_type"]').click()
        await page.locator('text=Criminal').first().click()
      })
    }

    await page.click('button[type="submit"]')

    // should redirect to the new case detail page
    await expect(page).toHaveURL(/.*cases\/(?!new).+/, { timeout: 10000 })
    await expect(page.locator('text=E2E Automated Test Case')).toBeVisible()

    // verify appears in cases list
    await page.goto('/cases')
    await expect(page.locator('text=E2E Automated Test Case')).toBeVisible()
  })

  test('cases list page loads without errors', async ({ page }) => {
    await page.goto('/cases')

    // should not show an error state
    await expect(page.locator('text=Something went wrong')).not.toBeVisible()
    await expect(page.locator('text=Error')).not.toBeVisible()

    // page should load - either shows cases or empty state
    await expect(
      page.locator('text=No cases')
        .or(page.locator('[data-testid="case-card"]'))
        .or(page.locator('[role="button"]'))
        .first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('search input filters cases in the list', async ({ page }) => {
    await page.goto('/cases')
    await page.waitForLoadState('networkidle')

    // look for a search input
    const searchInput = page.locator(
      'input[placeholder*="Search"], input[type="search"], input[placeholder*="search"]'
    ).first()

    if (await searchInput.count() > 0) {
      await searchInput.fill('nonexistent-case-xyz-12345')
      // wait for debounce
      await page.waitForTimeout(500)

      // should either show empty state or no results
      await expect(
        page.locator('text=No cases')
          .or(page.locator('text=no results'))
          .or(page.locator('text=Nothing found'))
          .first()
      ).toBeVisible({ timeout: 5000 })
    } else {
      // if no search, just verify page loaded
      test.skip()
    }
  })

  test('/cases/new page renders correctly', async ({ page }) => {
    await page.goto('/cases/new')

    // required form fields should be visible
    await expect(page.locator('input[name="case_number"]').or(
      page.locator('input[placeholder*="case number"]')
    ).first()).toBeVisible()

    await expect(page.locator('input[name="title"]').or(
      page.locator('input[placeholder*="title"]')
    ).first()).toBeVisible()

    await expect(page.locator('input[name="client_name"]').or(
      page.locator('input[placeholder*="client"]')
    ).first()).toBeVisible()
  })
})
