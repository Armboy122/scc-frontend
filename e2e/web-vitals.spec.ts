import { expect, test } from '@playwright/test'

test('login interaction latency stays below the 200 ms INP target', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => {
    const durations: number[] = []
    const observer = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) durations.push(entry.duration)
    })
    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit & { durationThreshold: number })
    ;(window as Window & { __sccInteractionDurations?: number[] }).__sccInteractionDurations = durations
  })

  await page.getByRole('button', { name: 'แสดงรหัสผ่าน' }).click()
  await page.waitForTimeout(250)

  const maxInteractionDuration = await page.evaluate(() => Math.max(
    0,
    ...((window as Window & { __sccInteractionDurations?: number[] }).__sccInteractionDurations ?? []),
  ))
  expect(maxInteractionDuration).toBeLessThan(200)
})
