import { expect, test } from '@playwright/test'
import { signedInPage, visit } from './helpers.ts'

const LIST = `Pokémon: 3
3 Dragapult ex TWM 130
Trainer: 4
4 Arven SVI 166`

test('saves a deck from a pasted PTCG Live list', async ({ browser, isMobile }) => {
  const { page } = await signedInPage(
    browser,
    'Cynthia',
    isMobile ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } : {},
  )
  await visit(page, '/decks/new')
  await page.getByLabel('Deck name').fill('Dragapult test list')
  await page.getByLabel('Deck list').fill(LIST)
  // The debounced preview parses the list and flags the illegal size.
  await expect(page.getByText(/Deck has 7 cards/)).toBeVisible()
  await page.getByRole('button', { name: 'Save deck' }).click()
  await page.waitForURL(/\/decks\/(?!new)[a-z0-9]+/)
  await expect(page.getByRole('heading', { name: 'Dragapult test list' })).toBeVisible()
  await visit(page, '/decks')
  await expect(page.getByRole('link', { name: /Dragapult test list/ })).toBeVisible()
})

test('anonymous visitors are sent to sign in before hosting', async ({ page }) => {
  await page.goto('/events/new')
  await expect(page).toHaveURL(/\/sign-in\?redirect=/)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})
