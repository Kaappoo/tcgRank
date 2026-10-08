import { expect, test } from '@playwright/test'
import { visit } from './helpers.ts'

test('signing in updates the header without a reload', async ({ page }) => {
  const handle = `misty${Date.now().toString(36).slice(-6)}`
  const response = await page.request.post('/api/auth/sign-up/email', {
    data: { name: 'Misty', email: `${handle}@example.test`, password: 'correct-horse-1', username: handle },
  })
  expect(response.ok(), await response.text()).toBeTruthy()
  await page.context().clearCookies()

  const header = page.getByRole('banner')
  // Load a page first so the signed-out session is cached client-side.
  await visit(page, '/')
  await expect(header.getByRole('link', { name: 'Sign in' })).toBeVisible()
  await header.getByRole('link', { name: 'Sign in' }).click()
  await page.getByLabel('Email or username').fill(handle)
  await page.getByLabel('Password').fill('correct-horse-1')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL((url) => url.pathname === '/')
  await expect(header.getByRole('button', { name: 'Account menu' })).toBeVisible()
  await expect(header.getByRole('link', { name: 'Sign in' })).toHaveCount(0)
})
