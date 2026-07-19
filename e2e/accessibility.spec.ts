import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const authenticatedUser = {
  id: 'a11y-user', name: 'Accessibility Tester', username: 'a11y', role: 'admin', officeId: null,
}

async function mockAuthenticatedApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const data = url.pathname.endsWith('/auth/refresh')
      ? { accessToken: 'test-access-token', user: authenticatedUser }
      : []
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data, error: null }) })
  })
}

async function expectNoSeriousOrCriticalViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([])
}

test('public login has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/login')
  await expectNoSeriousOrCriticalViolations(page)
})

for (const pagePath of ['/', '/stock', '/covers', '/workorders/new']) {
  test(`authenticated ${pagePath} has no serious or critical accessibility violations`, async ({ page }) => {
    await mockAuthenticatedApi(page)
    await page.goto(pagePath)
    await expect(page.locator('main')).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page)
  })
}
