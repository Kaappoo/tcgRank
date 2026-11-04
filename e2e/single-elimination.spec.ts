import { expect, test, type Page } from '@playwright/test'
import { createEvent, signedInPage, visit } from './helpers.ts'

/** The host enters a 2–0 win for player 1 at every table of a bracket round (its section in Pairings). */
async function hostReportsRound(page: Page, round: string) {
  const pencils = page
    .getByRole('region', { name: round, exact: true })
    .getByRole('button', { name: /^Set result for table/ })
  const tables = await pencils.count()
  for (let i = 0; i < tables; i++) {
    await pencils.nth(i).click()
    const dialog = page.getByRole('dialog', { name: /^Table \d+$/ })
    const addGame = dialog.getByRole('button', { name: /^Add a game:/ })
    await addGame.first().click()
    await addGame.first().click()
    await dialog.getByRole('button', { name: 'Send result' }).click()
    await expect(dialog).toBeHidden()
  }
}

test.describe('single elimination', () => {
  test.skip(({ isMobile }) => isMobile, 'the host desk flow runs on desktop')

  test('five players play a bracket with byes for the top seeds to its champion', async ({ browser }) => {
    test.setTimeout(120_000)
    const host = await signedInPage(browser, 'Professor Oak')
    const { url } = await createEvent(host.page, 'E2E Knockout', { pairingSystem: 'Single elimination' })
    await visit(host.page, url)
    for (const name of ['Ash Ketchum', 'Misty Waterflower', 'Brock Harrison', 'Gary Oak', 'Tracey Sketchit']) {
      await host.page.getByRole('textbox', { name: 'Player name' }).fill(name)
      await host.page.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(host.page.getByText(name)).toBeVisible()
    }
    await expect(
      host.page.getByText('Pairing round 1 draws the seeds and closes entries.', { exact: false }),
    ).toBeVisible()

    // Round 1: 8 seats for 5 players, so seeds 1–3 have byes and one match is played.
    await host.page.getByRole('button', { name: 'Pair round 1' }).click()
    await expect(host.page.getByText('Quarterfinal · Round 1 of 3')).toBeVisible()
    await expect(host.page.getByText('Bye', { exact: true })).toHaveCount(3)

    // The host can't enter a tie in an elimination round.
    await host.page.getByRole('button', { name: /^Set result for table/ }).click()
    const dialog = host.page.getByRole('dialog', { name: /^Table \d+$/ })
    for (const button of await dialog.getByRole('button', { name: /^Add a game:/ }).all()) await button.click()
    await expect(dialog.getByText(/Elimination matches can’t tie/)).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Send result' })).toBeDisabled()
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    await hostReportsRound(host.page, 'Quarterfinal')
    await expect(host.page.getByText('4/4 results in')).toBeVisible()
    await expect(host.page.getByRole('button', { name: 'End event early' })).toHaveCount(0)

    await host.page.getByRole('button', { name: 'Pair semifinals' }).click()
    await expect(host.page.getByText('Semifinal · Round 2 of 3')).toBeVisible()
    // The bracket view lists every round, newest first.
    const sections = host.page.getByRole('tabpanel').getByRole('region')
    await expect(sections.first()).toHaveAccessibleName('Semifinal')
    await expect(sections.nth(1)).toHaveAccessibleName('Quarterfinal')
    await hostReportsRound(host.page, 'Semifinal')
    await expect(host.page.getByText('2/2 results in')).toBeVisible()

    await host.page.getByRole('button', { name: 'Pair final' }).click()
    await expect(host.page.getByText('Final · Round 3 of 3')).toBeVisible()
    await hostReportsRound(host.page, 'Final')

    await host.page.getByRole('button', { name: 'Finish & publish standings' }).click()
    const podium = host.page.getByRole('region', { name: 'Podium' })
    // Seed 1 had a bye, then won the semifinal and the final: the bye counts as nothing.
    await expect(podium.getByText('Champion · 2–0')).toBeVisible()
    await expect(podium.getByText('Finalist · 1–1')).toBeVisible()
    await expect(podium.getByText(/^Semifinal · /)).toHaveCount(2)
  })
})
