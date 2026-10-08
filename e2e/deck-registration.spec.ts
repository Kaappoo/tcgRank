import { devices, expect, test } from '@playwright/test'
import { createEvent, signedInPage, visit } from './helpers.ts'

const LIST = `Pokémon: 16
4 Dreepy TWM 128
4 Drakloak TWM 129
3 Dragapult ex TWM 130
2 Duskull PRE 35
1 Dusclops PRE 36
1 Dusknoir PRE 37
1 Fezandipiti ex SFA 38
Trainer: 36
4 Arven SVI 166
4 Lillie's Determination MEG 119
2 Boss's Orders MEG 114
1 Iono PAL 185
4 Buddy-Buddy Poffin TEF 144
4 Ultra Ball SVI 196
4 Rare Candy SVI 191
4 Night Stretcher SFA 61
3 Counter Catcher PAR 160
3 Super Rod PAL 188
3 Area Zero Underdepths SCR 131
Energy: 8
4 Basic {R} Energy SVE 2
4 Basic {P} Energy SVE 5`

test.describe('deck registration', () => {
  test.skip(({ isMobile }) => isMobile, 'drives its own phone context')

  test('a player creates a deck while joining an event that requires one', async ({ browser }) => {
    test.setTimeout(60_000)
    const host = await signedInPage(browser, 'Professor Oak')
    const { url, code } = await createEvent(host.page, 'E2E Deck Check', { deckRequired: true })

    const ash = await signedInPage(browser, 'Ash Ketchum', devices['Pixel 7'])
    await visit(ash.page, `/join/${code}`)
    await expect(ash.page.getByText(/requires a registered deck/)).toBeVisible()
    await expect(ash.page.getByRole('radio', { name: /Skip/ })).toHaveCount(0)
    await expect(ash.page.getByRole('button', { name: /^Join E2E Deck Check/ })).toBeDisabled()

    await ash.page.getByRole('link', { name: 'New deck' }).click()
    await ash.page.waitForURL(/\/decks\/new\?joinCode=/)
    await ash.page.locator('html[data-hydrated]').waitFor()
    await ash.page.getByLabel('Deck name').fill('Dragapult ex')
    await ash.page.getByLabel('Deck list').fill(LIST)
    await ash.page.getByRole('button', { name: 'Save deck' }).click()

    // Back on the join page with the new deck already chosen.
    await ash.page.waitForURL(new RegExp(`/join/${code}\\?deck=`))
    await ash.page.locator('html[data-hydrated]').waitFor()
    await expect(ash.page.getByRole('radio', { name: /Dragapult ex/ })).toBeChecked()
    await ash.page.getByRole('button', { name: /^Join E2E Deck Check/ }).click()
    await ash.page.waitForURL(url)
    await expect(ash.page.getByRole('heading', { name: "You're registered" })).toBeVisible()

    await visit(host.page, url)
    await host.page.getByRole('tab', { name: /Players/ }).click()
    await expect(host.page.getByText('Dragapult ex')).toBeVisible()
  })
})
