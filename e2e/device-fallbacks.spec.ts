import { expect, test } from '@playwright/test'

const user = {
  id: 'device-test-user', name: 'Field Tester', username: 'field-test', role: 'tech', officeId: 'office-1',
}

async function mockApi(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const data = url.pathname.endsWith('/auth/refresh') ? { accessToken: 'test-access', user } : []
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data, error: null }) })
  })
}

test('mobile fallback keeps NFC tag lookup usable when Web NFC is unavailable', async ({ page }) => {
  await mockApi(page)
  await page.goto('/covers/check-tag')
  await expect(page.getByLabel('รหัสจาก tag')).toBeVisible()
  await expect(page.getByText('การอ่านและแก้ไขผ่าน NFC ใช้ได้บน Chrome Android ผ่าน HTTPS')).toBeVisible()
  await expect(page.getByText(/หรือกรอกรหัสจาก NFC/)).toBeVisible()
})

test('mobile fallback retains manual GPS entry when browser GPS is unavailable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined }))
  await mockApi(page)
  await page.goto('/workorders/new')
  await expect(page.getByText('กรอกพิกัดเอง ถ้าแผนที่/GPS ใช้ไม่ได้')).toBeVisible()
  await page.getByText('กรอกพิกัดเอง ถ้าแผนที่/GPS ใช้ไม่ได้').click()
  await expect(page.getByLabel('ละติจูด')).toBeVisible()
  await expect(page.getByLabel('ลองจิจูด')).toBeVisible()
})
