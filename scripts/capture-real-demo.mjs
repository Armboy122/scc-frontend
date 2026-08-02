import { chromium } from 'playwright'
import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const baseURL = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:13000'
const outputDir = resolve(process.cwd(), '../deliverables/video-demo/exports')
await mkdir(outputDir, { recursive: true })

const captures = [
  {
    filename: '03 - Admin & Exception Control.webm',
    account: { username: 'admin', password: 'Admin1234!' },
    steps: [
      { label: 'ภาพรวมใบงาน', href: '/' },
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Stock by office', href: '/stock' },
      { label: 'Cover register', href: '/covers' },
      { label: 'Borrow queue', href: '/borrows' },
      { label: 'Discrepancy queue', href: '/discrepancies' },
      { label: 'User administration', href: '/admin/users' },
    ],
  },
  {
    filename: '01 - Field Operations.webm',
    account: { username: 'tech-office-1', password: 'Tech1234!' },
    steps: [
      { label: 'My work orders', href: '/' },
      { label: 'My stock', href: '/stock' },
      { label: 'Cover register', href: '/covers' },
      { label: 'NFC fallback', href: '/covers/check-tag' },
      { label: 'Borrow requests', href: '/borrows' },
      { label: 'Report discrepancy', href: '/discrepancies/new' },
    ],
  },
  {
    filename: '02 - Cross-office Borrowing.webm',
    account: { username: 'exec-office-1', password: 'Exec1234!' },
    steps: [
      { label: 'Executive dashboard', href: '/dashboard' },
      { label: 'Stock availability', href: '/stock' },
      { label: 'Borrow queue', href: '/borrows' },
      { label: 'New borrow request', href: '/borrows/new' },
      { label: 'Notifications', href: '/notifications' },
    ],
  },
]

const selection = process.env.DEMO_CAPTURE
  ? captures.filter((capture) => capture.filename.startsWith(process.env.DEMO_CAPTURE))
  : captures

if (selection.length === 0) throw new Error(`Unknown DEMO_CAPTURE: ${process.env.DEMO_CAPTURE}`)

for (const capture of selection) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: outputDir, size: { width: 1920, height: 1080 } },
  })
  const page = await context.newPage()
  await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
  await page.getByLabel('ชื่อผู้ใช้').fill(capture.account.username)
  await page.locator('#password-input').fill(capture.account.password)
  await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click()
  await page.waitForURL(`${baseURL}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  for (const step of capture.steps) {
    await page.goto(`${baseURL}${step.href}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2200)
  }

  const source = await page.video().path()
  const target = resolve(outputDir, capture.filename)
  await page.close()
  await context.close()
  await browser.close()
  await copyFile(source, target)
  console.log(target)
}
