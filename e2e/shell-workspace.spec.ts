import { expect, test } from '@playwright/test'

import { clearBrowserState, fetchBootstrap, fetchWorkspaceSnapshot } from './runtime'

test('shell workspace tabs, utility actions, widget creation, and settings modal work end to end', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  const bootstrap = await fetchBootstrap(request)
  const repoRootTitle = bootstrap.repo_root.split('/').filter(Boolean).pop() ?? bootstrap.repo_root
  const baselineBackendSnapshot = await fetchWorkspaceSnapshot(request)
  const baselineBackendTabCount = baselineBackendSnapshot.tabs.length
  const baselineBackendWidgetCount = baselineBackendSnapshot.widgets.length
  const openedFilesPaths: string[] = []

  await page.route('**/api/v1/fs/open', async (route) => {
    const postData = route.request().postDataJSON() as { path?: string } | null

    if (postData?.path) {
      openedFilesPaths.push(postData.path)
    }

    await route.fulfill({
      body: JSON.stringify({ path: postData?.path ?? '' }),
      contentType: 'application/json',
      status: 200,
    })
  })

  const workspaceOneTab = page.getByRole('tab', { name: 'Workspace-1' })
  const workspaceTwoTab = page.getByRole('tab', { name: 'Workspace-2' })
  const addWorkspaceButton = page.getByRole('button', { name: 'Add workspace' })
  const openUtilityPanelButton = page.getByRole('button', { name: 'Open utility panel' })
  const openSettingsButton = page.getByRole('button', { name: 'Open settings panel' })

  await expect(workspaceOneTab).toBeVisible()
  await expect(workspaceTwoTab).toHaveAttribute('aria-selected', 'true')
  await expect(workspaceTwoTab).toHaveCSS('min-height', '24px')
  await expect(addWorkspaceButton).toHaveCSS('min-height', '24px')
  await expect(page.getByRole('button', { name: 'Close tool' })).toHaveCount(1)

  await addWorkspaceButton.click()
  const workspaceThreeTab = page.getByRole('tab', { name: 'Workspace-3' })
  await expect(workspaceThreeTab).toHaveAttribute('aria-selected', 'true')

  await openUtilityPanelButton.click()
  await page.getByRole('menuitem', { name: 'Create workspace' }).click()
  const workspaceFourTab = page.getByRole('tab', { name: 'Workspace-4' })
  await expect(workspaceFourTab).toHaveAttribute('aria-selected', 'true')

  await openUtilityPanelButton.click()
  await page.getByRole('menuitem', { name: 'Create terminal widget' }).click()
  await expect(page.getByRole('button', { name: 'Close Workspace shell' })).toBeVisible()
  await expect(page.getByText(/terminal widget not found/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Close Main terminal' })).toHaveCount(0)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).tabs.length)
    .toBe(baselineBackendTabCount + 1)

  await openUtilityPanelButton.click()
  await expect(page.getByRole('menuitem', { name: 'Create Terminal widget' })).toBeEnabled()
  await expect(page.getByRole('menuitem', { name: 'Create Files widget' })).toBeEnabled()
  await expect(
    page.getByRole('menuitem', { name: 'Commander widget unavailable: Frontend-local' }),
  ).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: 'Preview widget unavailable: Planned' })).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: 'Editor widget unavailable: Planned' })).toBeDisabled()
  await expect(
    page.getByRole('menuitem', { name: 'Web Placeholder widget unavailable: Planned' }),
  ).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: 'Create commander widget' })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Create Files widget' }).click()
  const filesPanelPath = page.locator('span[id*="files-panel-path"]')
  await expect(filesPanelPath).toHaveText(bootstrap.repo_root)
  await expect(page.getByText('package.json', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open file .gitignore' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Show hidden files' }).click()
  await expect(page.getByRole('button', { name: 'Open file .gitignore' })).toBeVisible()
  await page.getByRole('button', { name: 'Hide hidden files' }).click()
  await page.getByRole('textbox', { name: 'Files path' }).fill(`${bootstrap.repo_root}/frontend`)
  await page.getByRole('button', { name: 'Open files path' }).click()
  await expect(filesPanelPath).toHaveText(`${bootstrap.repo_root}/frontend`)
  await page.getByRole('button', { name: 'Open parent directory' }).click()
  await expect(filesPanelPath).toHaveText(bootstrap.repo_root)
  await page.getByRole('button', { name: 'Open current directory externally' }).click()
  await expect(page.getByText('Open request sent for current directory')).toBeVisible()
  await page.getByRole('textbox', { name: 'Filter files' }).fill('package')
  await expect(page.getByRole('button', { name: 'Open directory frontend' })).toHaveCount(0)
  await expect(page.getByText('package.json', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear files filter' }).click()
  await page.getByRole('button', { name: 'Refresh directory' }).click()
  await expect(filesPanelPath).toHaveText(bootstrap.repo_root)
  await page.getByRole('button', { name: 'Sort files by modified time' }).click()
  await expect(page.getByText('Modified DESC')).toBeVisible()
  await page.getByRole('button', { name: 'Open file package.json' }).click()
  await expect(page.getByText('Open request sent for package.json')).toBeVisible()
  expect(openedFilesPaths).toEqual([bootstrap.repo_root, `${bootstrap.repo_root}/package.json`])
  await page.getByRole('button', { name: 'Open directory frontend' }).click()
  await expect(filesPanelPath).toHaveText(`${bootstrap.repo_root}/frontend`)
  await page.getByRole('button', { name: 'Open parent directory' }).click()
  await expect(filesPanelPath).toHaveText(bootstrap.repo_root)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).widgets.length)
    .toBe(baselineBackendWidgetCount + 2)

  await workspaceTwoTab.click()
  await expect(workspaceTwoTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'Close Main terminal' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close tool' })).toHaveCount(1)
  const commanderTab = page.locator('.dv-tab').filter({ hasText: 'commander' }).first()
  await expect(commanderTab).toContainText('tool')
  await page.getByRole('button', { name: 'Add terminal tab for Main terminal' }).click()
  await expect(page.getByRole('button', { name: 'Close Main terminal 2' })).toBeVisible()
  await expect(page.getByText(/terminal widget not found/i)).toHaveCount(0)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).tabs.length)
    .toBe(baselineBackendTabCount + 2)
  await page.getByRole('button', { name: 'Close Main terminal 2' }).click()
  await expect(page.getByRole('button', { name: 'Close Main terminal 2' })).toHaveCount(0)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).tabs.length)
    .toBe(baselineBackendTabCount + 1)

  await workspaceFourTab.click()
  await expect(workspaceFourTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'Close Main terminal' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Close Workspace shell' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close tool' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Close ${repoRootTitle}` })).toBeVisible()
  await page.getByRole('button', { name: `Close ${repoRootTitle}` }).click()
  await expect(page.getByRole('button', { name: `Close ${repoRootTitle}` })).toHaveCount(0)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).widgets.length)
    .toBe(baselineBackendWidgetCount + 1)
  await page.getByRole('button', { name: 'Add terminal tab for Workspace shell' }).click()
  await expect(page.getByRole('button', { name: 'Close Workspace shell 2' })).toBeVisible()
  await expect(page.getByText(/terminal widget not found/i)).toHaveCount(0)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).tabs.length)
    .toBe(baselineBackendTabCount + 2)
  await page.getByRole('button', { name: 'Close Workspace shell 2' }).click()
  await expect(page.getByRole('button', { name: 'Close Workspace shell 2' })).toHaveCount(0)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).tabs.length)
    .toBe(baselineBackendTabCount + 1)

  await openSettingsButton.click()
  await expect(page.getByText('Rune Terminal')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Установленные приложения' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Terminal Настройки терминального runtime.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Commander Настройки file-manager surface.' })).toBeVisible()
  await page.getByRole('button', { name: 'Close Settings' }).click()
  await expect(page.getByText('Settings', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Close Workspace shell' }).click()
  await expect(page.getByRole('button', { name: 'Close Workspace shell' })).toHaveCount(0)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).tabs.length)
    .toBe(baselineBackendTabCount)
})
