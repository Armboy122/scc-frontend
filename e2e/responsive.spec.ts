import { expect, test } from '@playwright/test'

test.describe('responsive smoke', () => {
  test('login form fits common mobile viewport without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Smart Cover Connect' })).toBeVisible()

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))

    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
  })

  test('login form remains usable at tablet width', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/login')

    await expect(page.getByLabel('ชื่อผู้ใช้')).toBeVisible()
    await expect(page.locator('#password-input')).toBeVisible()
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeVisible()
  })
})
