import { devices, expect, test, type Page } from '@playwright/test'
import { createEvent, signedInPage, visit } from './helpers.ts'

const CLOSED = 'Entries are closed: the schedule has started'

/** The host enters a 2–0 win for player 1 at every unconfirmed table of the round on show. */
async function hostReportsRound(page: Page) {
  const pencils = page.getByRole('button', { name: /^Set result for table/ })
  const tables = await pencils.count()
  for (let i = 0; i < tables; i++) {
    await pencils.nth(i).click()
    const dialog = page.getByRole('dialog', { name: /^Table \d+$/ })
    const addGame = dialog.getByRole('button', { name: /^Add a game:/ }).first()
    await addGame.click()
    await addGame.click()
    await dialog.getByRole('button', { name: 'Send result' }).click()
    await expect(dialog).toBeHidden()
  }
}

test.describe('round robin', () => {
  test.skip(({ isMobile }) => isMobile, 'multi-device flow drives its own phone contexts')

  test('everyone plays everyone, entries close at round 1, and the host publishes the standings', async ({
    browser,
  }) => {
    test.setTimeout(120_000)
    const host = await signedInPage(browser, 'Professor Oak')
    const { url, code } = await createEvent(host.page, 'E2E Round Robin', { pairingSystem: 'Round robin' })

    // Gary joins from his phone; the host adds two players without an account.
    const phone = devices['Pixel 7']
    const gary = await signedInPage(browser, 'Gary Oak', phone)
    await visit(gary.page, `/join/${code}`)
    await gary.page.getByText('Skip — enter without a deck').click()
    await gary.page.getByRole('button', { name: /^Join E2E Round Robin/ }).click()
    await gary.page.waitForURL(url)

    await visit(host.page, url)
    for (const name of ['Ash Ketchum', 'Misty Waterflower']) {
      await host.page.getByRole('textbox', { name: 'Player name' }).fill(name)
      await host.page.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(host.page.getByText(name)).toBeVisible()
    }
    await expect(
      host.page.getByText('Pairing round 1 draws the schedule and closes entries.', { exact: false }),
    ).toBeVisible()

    // Three players: three rounds, one match and one bye each.
    for (let round = 1; round <= 3; round++) {
      await host.page.getByRole('button', { name: `Pair round ${round}` }).click()
      await expect(host.page.getByText(`Round ${round} of 3`)).toBeVisible()
      if (round > 1)
        await host.page
          .getByRole('group', { name: 'Choose round' })
          .getByRole('button', { name: `Round ${round}` })
          .click()
      await expect(host.page.getByText('Bye', { exact: true })).toBeVisible()
      await hostReportsRound(host.page)
      await expect(host.page.getByText('2/2 results in')).toBeVisible()

      if (round === 1) {
        // Entries are closed: a latecomer gets the note, and the host can't add anyone.
        const late = await signedInPage(browser, 'Late Larry', phone)
        await visit(late.page, `/join/${code}`)
        await expect(late.page.getByText(CLOSED)).toBeVisible()
        await expect(late.page.getByRole('button', { name: /^Join E2E Round Robin/ })).toHaveCount(0)
        await late.context.close()

        await host.page.getByRole('tab', { name: /Players/ }).click()
        await expect(host.page.getByText(CLOSED)).toBeVisible()
        await expect(host.page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled()
        await host.page.getByRole('tab', { name: 'Pairings' }).click()
      }
    }

    await host.page.getByRole('button', { name: 'Finish & publish standings' }).click()
    await expect(host.page.getByRole('region', { name: 'Podium' })).toBeVisible()
    const standings = host.page.getByRole('table', { name: 'Final standings' })
    await expect(standings.getByRole('columnheader')).toHaveText(['#', 'Player', 'Pts', 'W-L-T', 'GW%', 'OMW'])
    await expect(standings.getByRole('row')).toHaveCount(4)
  })
})
