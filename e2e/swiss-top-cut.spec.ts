import { expect, test, type Page } from '@playwright/test'
import { createEvent, hostReportsRound, signedInPage, visit } from './helpers.ts'

async function addPlayer(page: Page, name: string) {
  await page.getByRole('textbox', { name: 'Player name' }).fill(name)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(name)).toBeVisible()
}

test.describe('Swiss top cut', () => {
  test.skip(({ isMobile }) => isMobile, 'the host desk flow runs on desktop')

  test('a Swiss event plays its rounds, cuts to a top 4 and finishes with its champion', async ({ browser }) => {
    test.setTimeout(180_000)
    const host = await signedInPage(browser, 'Professor Oak')
    const { url } = await createEvent(host.page, 'E2E League Cup', { topCut: true, swissRounds: 2 })
    await visit(host.page, url)
    const players = ['Ash', 'Misty', 'Brock', 'Gary', 'Tracey', 'Dawn', 'May', 'Max', 'Iris']
    for (const name of players) await addPlayer(host.page, name)

    const chip = (name: string) => host.page.getByRole('group', { name: 'Choose round' }).getByRole('button', { name })
    await host.page.getByRole('button', { name: 'Pair round 1' }).click()
    await expect(host.page.getByText('Round 1 of 2 · then top cut')).toBeVisible()
    await hostReportsRound(host.page)
    await expect(host.page.getByText('5/5 results in')).toBeVisible()

    // Late entry still works during the Swiss rounds.
    await host.page.getByRole('tab', { name: /^Players/ }).click()
    await addPlayer(host.page, 'Cilan')
    await host.page.getByRole('tab', { name: 'Pairings' }).click()
    await host.page.getByRole('button', { name: 'Pair round 2' }).click()
    await expect(host.page.getByText('Round 2 of 2 · then top cut')).toBeVisible()
    await expect(chip('Round 2')).toHaveAttribute('aria-pressed', 'true')
    await hostReportsRound(host.page)
    await expect(host.page.getByText('5/5 results in')).toBeVisible()

    // After the last Swiss round: cut to the default top 4 with a longer top cut timer, or finish.
    await expect(host.page.getByRole('button', { name: 'Finish & publish standings' })).toBeEnabled()
    await host.page.getByRole('spinbutton', { name: 'Top cut round timer (minutes)' }).fill('40')
    await host.page.getByRole('button', { name: 'Cut to top 4' }).click()
    await expect(host.page.getByText('Top 4 · Semifinal').first()).toBeVisible()
    await host.page.getByRole('tab', { name: /^Players/ }).click()
    await expect(host.page.getByText('Entries are closed: the top cut has started').first()).toBeVisible()
    await host.page.getByRole('tab', { name: 'Pairings' }).click()
    await expect(host.page.getByRole('button', { name: 'End event early' })).toHaveCount(0)
    await expect(chip('Top cut')).toHaveAttribute('aria-pressed', 'true')

    // The store screen switches to the bracket at the cut.
    const screen = await host.context.newPage()
    await visit(screen, `${url}/screen`)
    await expect(screen.getByRole('heading', { name: 'Top 4 · Semifinal' })).toBeVisible()
    await screen.close()

    await hostReportsRound(host.page, 'Top 4 · Semifinal')
    await expect(host.page.getByText('2/2 results in')).toBeVisible()

    await host.page.getByRole('button', { name: 'Pair final' }).click()
    await expect(host.page.getByRole('region', { name: 'Final', exact: true })).toBeVisible()
    await hostReportsRound(host.page, 'Final')
    await expect(host.page.getByText('1/1 results in')).toBeVisible()

    await host.page.getByRole('button', { name: 'Finish & publish standings' }).click()
    const podium = host.page.getByRole('region', { name: 'Podium' })
    await expect(podium.getByText(/^Champion · \d+ pts · \d+-\d+-\d+$/)).toBeVisible()
    await expect(podium.getByText(/^Finalist · \d+ pts/)).toBeVisible()

    await host.page.getByRole('tab', { name: 'Standings' }).click()
    await expect(host.page.getByRole('cell', { name: 'Top 4 cut' })).toBeVisible()
    const rows = host.page.getByRole('row')
    await expect(rows.nth(1)).toContainText('Champion')
    await expect(rows.nth(4)).toContainText('Semifinal')
  })
})
