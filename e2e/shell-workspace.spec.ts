import { expect, test } from '@playwright/test'

import {
  clearBrowserState,
  fetchBootstrap,
  fetchWorkspaceSnapshot,
  registerRemoteMCPServerViaApi,
  saveRemoteProfileViaApi,
} from './runtime'

test('shell workspace tabs, utility actions, widget creation, and settings modal work end to end', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const remotePrimaryToken = `phase1remotefocus${seedStamp}`
  const remoteSecondaryToken = `phase1remoteother${seedStamp}`
  const mcpPrimaryToken = `phase1mcpfocus${seedStamp}`
  const mcpSecondaryToken = `phase1mcpother${seedStamp}`

  await saveRemoteProfileViaApi(request, {
    host: `${remotePrimaryToken}.example.test`,
    name: `Remote ${remotePrimaryToken}`,
    user: 'deploy',
  })
  await saveRemoteProfileViaApi(request, {
    host: `${remoteSecondaryToken}.example.test`,
    name: `Remote ${remoteSecondaryToken}`,
    user: 'ops',
  })
  await registerRemoteMCPServerViaApi(request, {
    endpoint: `https://${mcpPrimaryToken}.example.test/mcp`,
    id: `mcp.${mcpPrimaryToken}`,
  })
  await registerRemoteMCPServerViaApi(request, {
    endpoint: `https://${mcpSecondaryToken}.example.test/mcp`,
    id: `mcp.${mcpSecondaryToken}`,
  })

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
  await expect(workspaceTwoTab).toHaveCSS('min-height', '22px')
  await expect(addWorkspaceButton).toHaveCSS('min-height', '22px')
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
  await expect(page.getByRole('menu', { name: 'Create widget menu' })).toHaveCSS('width', '208px')
  await expect(page.getByRole('menuitem', { name: 'Create Terminal widget' })).toBeEnabled()
  await expect(page.getByRole('menuitem', { name: 'Create Files widget' })).toBeEnabled()
  await expect(
    page.getByRole('menuitem', { name: 'Commander widget unavailable: Frontend-local' }),
  ).toBeDisabled()
  await expect(
    page.getByRole('menuitem', { name: 'Preview widget unavailable: Needs file path' }),
  ).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: 'Editor widget unavailable: Planned' })).toBeDisabled()
  await expect(
    page.getByRole('menuitem', { name: 'Web Placeholder widget unavailable: Planned' }),
  ).toBeDisabled()
  await expect(page.getByRole('menuitem', { name: 'Create commander widget' })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Create Files widget' }).click()
  const filesPanelPath = page.locator('span[id*="files-panel-path"]')
  const filesPanelEntryCount = page.locator('span[id*="files-panel-entry-count"]')
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
  await expect(filesPanelEntryCount).toContainText('of')
  await page.getByRole('button', { name: 'Preview file package.json' }).click()
  await expect(page.locator('span[id*="preview-panel-path"]')).toHaveText(
    `${bootstrap.repo_root}/package.json`,
  )
  await expect(page.getByText(/Text preview/)).toBeVisible()
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).widgets.length)
    .toBe(baselineBackendWidgetCount + 3)
  await page.getByRole('button', { name: 'Close package.json' }).click()
  await expect(page.getByRole('button', { name: 'Close package.json' })).toHaveCount(0)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).widgets.length)
    .toBe(baselineBackendWidgetCount + 2)
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

  await page.getByRole('button', { name: /^Remote / }).click()
  const remoteFilter = page.getByRole('textbox', { name: 'Filter remote profiles' })
  await expect(remoteFilter).toBeVisible()
  await remoteFilter.fill(remotePrimaryToken)
  await expect(page.getByText(`Remote ${remotePrimaryToken}`)).toBeVisible()
  await expect(page.getByText(`Remote ${remoteSecondaryToken}`)).toHaveCount(0)
  await expect(page.getByText('1 visible')).toBeVisible()
  await remoteFilter.fill('missing-remote-filter')
  await expect(page.getByText('No SSH profiles match current filter.')).toBeVisible()

  await page.getByRole('button', { name: /^MCP / }).click()
  const mcpFilter = page.getByRole('textbox', { name: 'Filter MCP servers' })
  await expect(mcpFilter).toBeVisible()
  await mcpFilter.fill(mcpPrimaryToken)
  await expect(page.getByText(`mcp.${mcpPrimaryToken}`)).toBeVisible()
  await expect(page.getByText(`mcp.${mcpSecondaryToken}`)).toHaveCount(0)
  await expect(page.getByText('1 visible')).toBeVisible()
  await mcpFilter.fill('missing-mcp-filter')
  await expect(page.getByText('No MCP servers match current filter.')).toBeVisible()

  await page.getByRole('button', { name: 'Close Settings' }).click()
  await expect(page.getByText('Settings', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Close Workspace shell' }).click()
  await expect(page.getByRole('button', { name: 'Close Workspace shell' })).toHaveCount(0)
  await expect
    .poll(async () => (await fetchWorkspaceSnapshot(request)).tabs.length)
    .toBe(baselineBackendTabCount)
})

test('remote settings surface normalized preflight failures and default-target state', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const remoteToken = `phase4-remote-${seedStamp}`
  const saved = await saveRemoteProfileViaApi(request, {
    host: `${remoteToken}.example.test`,
    identity_file: '~/.ssh/id_prod.pub',
    name: `Remote ${remoteToken}`,
    user: 'deploy',
  })

  await page.route(`**/api/v1/connections/${saved.profile.id}/check`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        connection: {
          active: false,
          id: saved.profile.id,
          kind: 'ssh',
          name: saved.profile.name,
          runtime: {
            check_error: 'Identity file points to a public key. Use the private key file instead.',
            check_status: 'failed',
            launch_status: 'idle',
          },
          usability: 'attention',
        },
        connections: {
          active_connection_id: 'local',
          connections: [
            {
              active: false,
              id: saved.profile.id,
              kind: 'ssh',
              name: saved.profile.name,
              runtime: {
                check_error: 'Identity file points to a public key. Use the private key file instead.',
                check_status: 'failed',
                launch_status: 'idle',
              },
              usability: 'attention',
            },
          ],
        },
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: /^Remote / }).click()

  const remoteFilter = page.getByRole('textbox', { name: 'Filter remote profiles' })
  await remoteFilter.fill(remoteToken)
  await expect(page.getByText(`Remote ${remoteToken}`)).toBeVisible()

  await page.getByRole('button', { name: 'Check' }).click()
  await expect(page.getByText(`Remote ${remoteToken}: preflight failed.`)).toBeVisible()
  await expect(
    page.getByText('Identity file points to a public key. Use the private key file instead.'),
  ).toBeVisible()
  await expect(page.getByText('attention')).toBeVisible()
  await expect(page.getByText('failed', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Set default' }).click()
  await expect(page.getByText(`Default connection: Remote ${remoteToken}.`)).toBeVisible()
  await expect(page.getByText('default', { exact: true })).toBeVisible()
})

test('remote settings persist tmux resume launch policy', async ({ page }) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const remoteToken = `phase5-tmux-${seedStamp}`

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: /^Remote / }).click()

  await page.getByRole('textbox', { name: 'Remote profile name' }).fill(`Remote ${remoteToken}`)
  await page.getByRole('textbox', { name: 'Remote profile host' }).fill(`${remoteToken}.example.test`)
  await page.getByRole('textbox', { name: 'Remote profile user' }).fill('deploy')
  await page.getByRole('checkbox', { name: 'Resume remote shell through tmux' }).click()
  await page.getByRole('textbox', { name: 'Remote profile tmux session' }).fill('prod-main')
  await page.getByRole('button', { name: 'Save remote profile' }).click()

  await expect(page.getByText(`Saved Remote ${remoteToken}.`)).toBeVisible()
  await expect(page.getByText('tmux resume: prod-main')).toBeVisible()
  await expect(page.getByText('tmux', { exact: true })).toBeVisible()

  const savedProfileRow = page.locator('[data-runa-component="clear-box"]').filter({
    has: page.getByText(`Remote ${remoteToken}`),
  })
  await savedProfileRow.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByRole('checkbox', { name: 'Resume remote shell through tmux' })).toBeChecked()
  await expect(page.getByRole('textbox', { name: 'Remote profile tmux session' })).toHaveValue('prod-main')
})

test('remote settings browse tmux sessions and load one into the profile editor', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const remoteToken = `phase5-tmux-browser-${seedStamp}`
  const saved = await saveRemoteProfileViaApi(request, {
    host: `${remoteToken}.example.test`,
    launch_mode: 'tmux',
    name: `Remote ${remoteToken}`,
    tmux_session: 'prod-main',
    user: 'deploy',
  })

  await page.route(`**/api/v1/remote/profiles/${saved.profile.id}/tmux-sessions`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        sessions: [
          { attached: true, name: 'prod-main', window_count: 2 },
          { attached: false, name: 'prod-jobs', window_count: 1 },
        ],
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: /^Remote / }).click()
  await page.getByRole('textbox', { name: 'Filter remote profiles' }).fill(remoteToken)
  await expect(page.getByText(`Remote ${remoteToken}`)).toBeVisible()

  const savedProfileRow = page.locator('[data-runa-component="clear-box"]').filter({
    has: page.getByText(`Remote ${remoteToken}`),
  })

  await savedProfileRow.getByRole('button', { name: 'Browse tmux' }).click()
  await expect(page.getByText('prod-main · attached · 2 windows')).toBeVisible()
  await expect(page.getByText('prod-jobs · detached · 1 windows')).toBeVisible()
  await savedProfileRow.getByRole('button', { name: 'Use session' }).nth(1).click()

  await expect(page.getByRole('checkbox', { name: 'Resume remote shell through tmux' })).toBeChecked()
  await expect(page.getByRole('textbox', { name: 'Remote profile tmux session' })).toHaveValue('prod-jobs')
})
