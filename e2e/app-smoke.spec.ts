import { expect, test } from '@playwright/test'

test('renders the login screen', async ({ page }) => {
  await page.goto('/login')

  await expect(page).toHaveTitle(/Smart Cover Connect/)
  await expect(page.getByRole('heading', { name: 'Smart Cover Connect' })).toBeVisible()
  await expect(page.getByLabel('ชื่อผู้ใช้')).toBeVisible()
  await expect(page.locator('#password-input')).toBeVisible()
  await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeVisible()
})

test('shows validation messages for an empty login submit', async ({ page }) => {
  await page.goto('/login')

  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()

  await expect(page.getByText('กรุณากรอกชื่อผู้ใช้')).toBeVisible()
  await expect(page.getByText('กรุณากรอกรหัสผ่าน')).toBeVisible()
})
