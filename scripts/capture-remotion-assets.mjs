import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const baseURL = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:13000';
const output = resolve(process.cwd(), '../video/public/ui');
await mkdir(output, {recursive: true});

const desktopShots = [
  {name: 'admin-dashboard.png', role: 'admin', href: '/dashboard'},
  {name: 'admin-stock.png', role: 'admin', href: '/stock'},
  {name: 'admin-covers.png', role: 'admin', href: '/covers'},
  {name: 'admin-register-cover.png', role: 'admin', href: '/covers/register'},
  {name: 'admin-write-nfc.png', role: 'admin', href: '/covers/write-nfc'},
  {name: 'admin-discrepancies.png', role: 'admin', href: '/discrepancies'},
  {name: 'admin-users.png', role: 'admin', href: '/admin/users'},
  {name: 'exec-dashboard.png', role: 'exec-office-1', href: '/dashboard'},
  {name: 'exec-workorders.png', role: 'exec-office-1', href: '/'},
  {name: 'exec-new-workorder.png', role: 'exec-office-1', href: '/workorders/new'},
  {name: 'exec-borrows.png', role: 'exec-office-1', href: '/borrows'},
  {name: 'exec-new-borrow.png', role: 'exec-office-1', href: '/borrows/new'},
  {name: 'exec-notifications.png', role: 'exec-office-1', href: '/notifications'},
];

const credentials = {
  admin: ['admin', 'Admin1234!'],
  'exec-office-1': ['exec-office-1', 'Exec1234!'],
  'tech-office-1': ['tech-office-1', 'Tech1234!'],
};

const browser = await chromium.launch({headless: true});

async function login(page, role) {
  const [username, password] = credentials[role];
  await page.goto(`${baseURL}/login`, {waitUntil: 'networkidle'});
  await page.getByLabel('ชื่อผู้ใช้').fill(username);
  await page.locator('#password-input').fill(password);
  await page.getByRole('button', {name: 'เข้าสู่ระบบ'}).click();
  await page.waitForURL(`${baseURL}/`, {waitUntil: 'networkidle'});
}

for (const role of ['admin', 'exec-office-1']) {
  const context = await browser.newContext({viewport: {width: 1440, height: 960}});
  const page = await context.newPage();
  await login(page, role);
  for (const shot of desktopShots.filter((item) => item.role === role)) {
    await page.goto(`${baseURL}${shot.href}`, {waitUntil: 'networkidle'});
    await page.waitForTimeout(900);
    await page.screenshot({path: resolve(output, shot.name), animations: 'disabled'});
  }
  await context.close();
}

const mobileContext = await browser.newContext({
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
});
const mobilePage = await mobileContext.newPage();
await login(mobilePage, 'tech-office-1');
for (const shot of [
  {name: 'tech-stock.png', href: '/stock'},
  {name: 'tech-check-tag.png', href: '/covers/check-tag'},
  {name: 'tech-notifications.png', href: '/notifications'},
]) {
  await mobilePage.goto(`${baseURL}${shot.href}`, {waitUntil: 'networkidle'});
  await mobilePage.waitForTimeout(900);
  await mobilePage.screenshot({path: resolve(output, shot.name), animations: 'disabled'});
}
await mobileContext.close();

await browser.close();
console.log(`Saved real UI screenshots to ${output}`);
