import { devices, expect, test } from '@playwright/test'
import { createEvent, signedInPage, visit } from './helpers.ts'

test.describe('league night', () => {
  test.skip(({ isMobile }) => isMobile, 'multi-device flow drives its own phone contexts')

  test('host pairs a round, players report and confirm on their phones', async ({ browser }) => {
    test.setTimeout(90_000)
    const host = await signedInPage(browser, 'Professor Oak')
    const { url, code } = await createEvent(host.page, 'E2E League Challenge')
    await expect(host.page.getByRole('img', { name: /QR code to join/ })).toBeVisible()

    // Two players scan the QR (which opens /join/CODE) on their phones.
    const phone = devices['Pixel 7']
    const ash = await signedInPage(browser, 'Ash Ketchum', phone)
    const misty = await signedInPage(browser, 'Misty Waterflower', phone)
    for (const player of [ash, misty]) {
      await visit(player.page, `/join/${code}`)
      await player.page.getByRole('button', { name: /^Join E2E League Challenge/ }).click()
      await player.page.waitForURL(url)
      await expect(player.page.getByRole('heading', { name: "You're registered" })).toBeVisible()
    }

    await visit(host.page, url)
    await host.page.getByRole('button', { name: 'Pair round 1' }).click()
    await expect(host.page.getByText('Round 1 of 1')).toBeVisible()

    // Ash sees his opponent, table and the clock, then reports a 2–1 win.
    await visit(ash.page, url)
    const pairing = ash.page.getByRole('region', { name: 'Round 1 pairing' })
    await expect(pairing).toContainText('Misty Waterflower')
    await expect(pairing).toContainText('TABLE')
    await expect(ash.page.getByRole('timer')).toHaveText(/^(30:00|29:\d\d)$/)
    await ash.page.getByRole('radio', { name: 'Won 2–1' }).click()
    await ash.page.getByRole('button', { name: 'Submit result' }).click()
    await expect(ash.page.getByText('Awaiting opponent')).toBeVisible()

    // Misty confirms from her phone.
    await visit(misty.page, url)
    await expect(misty.page.getByText('Lost 1–2')).toBeVisible()
    await misty.page.getByRole('button', { name: /confirm/i }).click()
    await expect(misty.page.getByText('Confirmed', { exact: true })).toBeVisible()

    // The host closes the event and the champion is published.
    await visit(host.page, url)
    await host.page.getByRole('button', { name: /Finish & publish standings/ }).click()
    await expect(host.page.getByRole('region', { name: 'Podium' })).toContainText('Ash Ketchum')

    // Ash's profile shows the win.
    await visit(ash.page, `/u/${ash.handle}`)
    await expect(ash.page.getByLabel('1 wins, 0 losses, 0 ties')).toBeVisible()
  })
})
