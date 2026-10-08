import { expect, type Browser, type BrowserContextOptions, type Page } from '@playwright/test'

let counter = 0

/** Creates a fresh account through the better-auth API and returns a signed-in page. */
export async function signedInPage(browser: Browser, name: string, options: BrowserContextOptions = {}) {
  const context = await browser.newContext(options)
  const handle = `${name.toLowerCase().replace(/\W/g, '').slice(0, 8)}${Date.now().toString(36).slice(-5)}${counter++}`
  const response = await context.request.post('/api/auth/sign-up/email', {
    data: { name, email: `${handle}@example.test`, password: 'correct-horse-1', username: handle },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  const page = await context.newPage()
  return { context, page, handle }
}

/** Navigates and waits until React has hydrated, so clicks and typing are handled by the app. */
export async function visit(page: Page, path: string) {
  await page.goto(path)
  await page.locator('html[data-hydrated]').waitFor()
}

export async function createEvent(page: Page, name: string, { deckRequired = false } = {}) {
  await visit(page, '/events/new')
  await page.getByLabel('Event name').fill(name)
  await page.getByLabel('Store').fill('Pallet Town Games')
  await page.getByRole('button', { name: '30 min' }).click()
  if (deckRequired) await page.getByRole('switch', { name: /Require a deck/ }).click()
  await page.getByRole('button', { name: 'Create event' }).click()
  await page.waitForURL(/\/events\/(?!new)[a-z0-9]+$/)
  await expect(page.getByRole('heading', { name })).toBeVisible()
  const code = (await page.getByLabel(/^Join code/).textContent())?.trim() ?? ''
  expect(code).toMatch(/^[A-Z2-9]{6}$/)
  return { url: page.url(), code }
}
