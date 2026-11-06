import { devices, expect, test, type Page } from '@playwright/test'
import { createEvent, hostReportsRound, signedInPage, visit } from './helpers.ts'

/** The full-screen unlock celebration (toasts are non-modal dialogs too). */
const celebrating = (page: Page) => page.locator('[role="dialog"][aria-modal="true"]')

test.describe('league night', () => {
  test.skip(({ isMobile }) => isMobile, 'multi-device flow drives its own phone contexts')

  test('host pairs a round, players report and confirm on their phones, and the winner celebrates', async ({
    browser,
  }) => {
    test.setTimeout(180_000)
    const host = await signedInPage(browser, 'Professor Oak')
    const { url, code } = await createEvent(host.page, 'E2E League Challenge', { swissRounds: 2 })
    await expect(host.page.getByRole('img', { name: /QR code to join/ })).toBeVisible()

    // Four players scan the QR (which opens /join/CODE) on their phones: a qualifying event.
    const phone = devices['Pixel 7']
    const names = ['Ash Ketchum', 'Misty Waterflower', 'Brock Harrison', 'Gary Oak'] as const
    const players = new Map<string, Awaited<ReturnType<typeof signedInPage>>>()
    for (const name of names) {
      const player = await signedInPage(browser, name, phone)
      players.set(name, player)
      await visit(player.page, `/join/${code}`)
      await player.page.getByText('Skip — enter without a deck').click()
      await player.page.getByRole('button', { name: /^Join E2E League Challenge/ }).click()
      await player.page.waitForURL(url)
      await expect(player.page.getByRole('heading', { name: "You're registered" })).toBeVisible()
    }
    const ash = players.get('Ash Ketchum')!

    await visit(host.page, url)
    await host.page.getByRole('button', { name: 'Pair round 1' }).click()
    await expect(host.page.getByText('Round 1 of 2')).toBeVisible()

    // Ash sees his opponent, table and the clock, then reports a 2–1 win.
    await visit(ash.page, url)
    const pairing = ash.page.getByRole('region', { name: 'Round 1 pairing' })
    await expect(pairing).toContainText('TABLE')
    let opponent = null
    for (const name of names.slice(1)) {
      if ((await pairing.textContent())?.includes(name)) opponent = { name, ...players.get(name)! }
    }
    expect(opponent, 'Ash is paired with one of the other players').not.toBeNull()
    await expect(ash.page.getByRole('timer')).toHaveText(/^(30:00|29:\d\d)$/)
    // The celebration never covers a running round.
    await expect(celebrating(ash.page)).toHaveCount(0)
    await ash.page.getByRole('button', { name: 'Add a game: My games' }).click()
    await ash.page.getByRole('button', { name: 'Add a game: My games' }).click()
    await ash.page.getByRole('button', { name: 'Add a game: Their games' }).click()
    await expect(ash.page.getByRole('status').filter({ hasText: 'Won 2–1' })).toBeVisible()
    await ash.page.getByRole('button', { name: 'Send result' }).click()
    await expect(ash.page.getByText('Awaiting opponent')).toBeVisible()

    // His opponent confirms from their phone.
    await visit(opponent!.page, url)
    await expect(opponent!.page.getByText('Lost 1–2')).toBeVisible()
    await opponent!.page.getByRole('button', { name: /confirm/i }).click()
    await expect(opponent!.page.getByText('Confirmed', { exact: true })).toBeVisible()

    // The host enters the other table, pairs round 2 and enters it with Ash winning.
    await visit(host.page, url)
    await hostReportsRound(host.page, undefined, 'Ash Ketchum')
    await host.page.getByRole('button', { name: 'Pair round 2' }).click()
    await expect(host.page.getByText('Round 2 of 2')).toBeVisible()
    await hostReportsRound(host.page, undefined, 'Ash Ketchum')
    await expect(celebrating(ash.page)).toHaveCount(0)

    // The host closes the event and the champion is published.
    await host.page.getByRole('button', { name: /Finish & publish standings/ }).click()
    await expect(host.page.getByRole('region', { name: 'Podium' })).toContainText('Ash Ketchum')

    // On Ash's phone the celebration plays over the final standings, without a reload.
    const celebration = ash.page.getByRole('dialog', { name: 'Trophy item: Champion cap' })
    await expect(celebration).toBeVisible({ timeout: 30_000 })
    await celebration.getByRole('button', { name: 'Wear it' }).click()
    await expect(celebration.getByRole('button', { name: 'Wearing it' })).toBeVisible()
    await celebration.click()
    await ash.page.getByRole('dialog', { name: 'Trophy item: Champion slab' }).click()
    const badge = ash.page.getByRole('dialog', { name: 'Badge: Champion, title Champion' })
    await badge.getByRole('button', { name: 'Show it' }).click()
    await expect(badge.getByRole('button', { name: 'Showing Champion' })).toBeVisible()
    await badge.getByRole('button', { name: 'Skip' }).click()
    await expect(celebrating(ash.page)).toHaveCount(0)

    // His profile shows the win, the Champion title, and the cap he put on.
    await visit(ash.page, `/u/${ash.handle}`)
    await expect(ash.page.getByLabel('2 wins, 0 losses, 0 ties')).toBeVisible()
    await expect(ash.page.locator('[data-slot="trainer-card"] [data-slot="title-chip"]')).toHaveText('Champion')
    await visit(ash.page, '/customise?slot=hat')
    await expect(ash.page.getByRole('button', { name: 'Champion cap', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
