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

export async function createEvent(
  page: Page,
  name: string,
  {
    deckRequired = false,
    pairingSystem,
    topCut = false,
    swissRounds,
  }: {
    deckRequired?: boolean
    pairingSystem?: 'Round robin' | 'Single elimination'
    topCut?: boolean
    swissRounds?: number
  } = {},
) {
  await visit(page, '/events/new')
  await page.getByLabel('Event name').fill(name)
  await page.getByLabel('Store').fill('Pallet Town Games')
  await page.getByRole('button', { name: '30 min' }).click()
  if (pairingSystem) await page.getByRole('button', { name: pairingSystem, exact: true }).click()
  if (topCut) await page.getByRole('switch', { name: /Top cut/ }).click()
  if (swissRounds) await page.getByRole('spinbutton', { name: 'Swiss rounds' }).fill(String(swissRounds))
  if (deckRequired) await page.getByRole('switch', { name: /Require a deck/ }).click()
  await page.getByRole('button', { name: 'Create event' }).click()
  await page.waitForURL(/\/events\/(?!new)[a-z0-9]+$/)
  await expect(page.getByRole('heading', { name })).toBeVisible()
  const code = (await page.getByLabel(/^Join code/).textContent())?.trim() ?? ''
  expect(code).toMatch(/^[A-Z2-9]{6}$/)
  return { url: page.url(), code }
}

/**
 * The host enters a 2–0 win for player 1 at every table of the round on show, from the table pencils (for `winner`
 * at their own table). Pass a bracket round's name to report within its section only (Pairings lists every bracket
 * round at once).
 */
export async function hostReportsRound(page: Page, bracketRound?: string, winner?: string) {
  const scope = bracketRound ? page.getByRole('region', { name: bracketRound, exact: true }) : page
  const pencils = scope.getByRole('button', { name: /^Set result for table/ })
  const tables = await pencils.count()
  for (let i = 0; i < tables; i++) {
    await pencils.nth(i).click()
    const dialog = page.getByRole('dialog', { name: /^Table \d+$/ })
    const favourite = winner ? dialog.getByRole('button', { name: `Add a game: ${winner}`, exact: true }) : null
    const addGame =
      favourite && (await favourite.count()) > 0
        ? favourite
        : dialog.getByRole('button', { name: /^Add a game:/ }).first()
    if (await addGame.isDisabled()) {
      // Already reported in full by the players: leave it as it is.
      await page.keyboard.press('Escape')
      await expect(dialog).toBeHidden()
      continue
    }
    await addGame.click()
    await addGame.click()
    await dialog.getByRole('button', { name: 'Send result' }).click()
    await expect(dialog).toBeHidden()
  }
}
