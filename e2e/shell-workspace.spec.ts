import { expect, test, type Page } from '@playwright/test'

import {
  clearBrowserState,
  fetchBootstrap,
  fetchWorkspaceSnapshot,
  openDirectoryWorkspaceWidgetViaApi,
  registerRemoteMCPServerViaApi,
  saveRemoteProfileViaApi,
} from './runtime'

async function mockRemoteTerminalSurface(
  page: Page,
  input: {
    connectionId: string
    connectionName: string
    widgetId: string
    workingDir?: string
  },
) {
  await page.route(`**/api/v1/terminal/${input.widgetId}`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        active_session_id: input.widgetId,
        chunks: [],
        next_seq: 1,
        sessions: [
          {
            can_interrupt: true,
            can_send_input: true,
            connection_id: input.connectionId,
            connection_kind: 'ssh',
            connection_name: input.connectionName,
            pid: 4242,
            session_id: input.widgetId,
            shell: '/bin/zsh',
            started_at: '2026-04-26T12:00:00Z',
            status: 'running',
            widget_id: input.widgetId,
            working_dir: input.workingDir ?? `/remote/${input.connectionName}`,
          },
        ],
        state: {
          can_interrupt: true,
          can_send_input: true,
          connection_id: input.connectionId,
          connection_kind: 'ssh',
          connection_name: input.connectionName,
          pid: 4242,
          session_id: input.widgetId,
          shell: '/bin/zsh',
          started_at: '2026-04-26T12:00:00Z',
          status: 'running',
          widget_id: input.widgetId,
          working_dir: input.workingDir ?? `/remote/${input.connectionName}`,
        },
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.route(`**/api/v1/terminal/${input.widgetId}/stream?*`, async (route) => {
    await route.fulfill({
      body: '',
      contentType: 'text/event-stream',
      status: 200,
    })
  })
}

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
  await expect(page.getByRole('button', { name: 'AI провайдеры' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Terminal Настройки терминального runtime.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Plugins Local catalog and install lifecycle.' })).toBeVisible()
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

test('mcp settings onboard a remote server from template helpers and draft probe', async ({ page }) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const serverID = `mcp.phase7-${seedStamp}`

  await page.route('**/api/v1/mcp/probe', async (route) => {
    const payload = route.request().postDataJSON() as {
      endpoint?: string
      headers?: Record<string, string>
    } | null

    expect(payload?.endpoint).toBe('https://mcp.phase7.example.test/mcp')
    expect(payload?.headers).toEqual({
      'X-API-Key': 'phase7-secret',
    })

    await route.fulfill({
      body: JSON.stringify({
        probe: {
          http_status: 200,
          message: 'Connected. Endpoint completed initialize and advertised 3 tool(s).',
          protocol_version: '2024-11-05',
          reachable: true,
          server_name: 'Phase7 MCP',
          server_version: '1.0.0',
          status: 'ready',
          tool_count: 3,
        },
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: /^MCP / }).click()

  await expect(page.getByRole('button', { name: 'Generic API-key MCP' })).toBeVisible()
  await page.getByRole('button', { name: 'Generic API-key MCP' }).click()

  await page.getByRole('textbox', { name: 'MCP server id' }).fill(serverID)
  await page.getByRole('textbox', { name: 'MCP endpoint URL' }).fill('https://mcp.phase7.example.test/mcp')
  await page.getByRole('textbox', { name: 'API key' }).fill('phase7-secret')
  await page.getByRole('button', { name: 'Test MCP endpoint' }).click()

  await expect(page.getByText(/Probe `ready`:/)).toBeVisible()

  await page.getByRole('button', { name: 'Register remote MCP server' }).click()
  await expect(page.getByText(`Registered ${serverID}. Start it explicitly before invoke.`)).toBeVisible()
  await expect(page.getByText(serverID, { exact: true })).toBeVisible()
})

test('plugin settings install, filter, enable, update, and remove local catalog entries', async ({
  page,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const installID = `plugin.phase8-${seedStamp}`

  let catalog = {
    current_actor: {
      home_dir: '/Users/avm',
      username: 'avm',
    },
    plugins: [
      {
        access: {
          allowed_users: ['alice'],
          owner_username: 'avm',
          visibility: 'shared',
        },
        display_name: 'Docs Plugin',
        enabled: false,
        id: 'docs.plugin',
        installed_by: {
          username: 'avm',
        },
        metadata: {
          team: 'docs',
        },
        plugin_version: '0.9.0',
        protocol_version: 'rterm.plugin.v1',
        runtime_status: 'disabled',
        source: {
          kind: 'git',
          ref: 'main',
          url: 'https://example.test/docs-plugin.git',
        },
        tools: [{ approval_tier: 'safe', name: 'plugin.docs_echo', target_kind: 'workspace' }],
        updated_by: {
          username: 'avm',
        },
      },
    ],
  }

  await page.route('**/api/v1/plugins**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (request.method() === 'GET' && path === '/api/v1/plugins') {
      await route.fulfill({
        body: JSON.stringify(catalog),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (request.method() === 'POST' && path === '/api/v1/plugins/install') {
      const payload = request.postDataJSON() as {
        access?: {
          allowed_users?: string[]
          visibility?: string
        }
        metadata?: Record<string, string>
        source?: {
          kind?: string
          url?: string
        }
      } | null

      expect(payload?.source?.kind).toBe('zip')
      expect(payload?.source?.url).toBe(`file:///tmp/${installID}.zip`)
      expect(payload?.metadata).toEqual({ team: 'ops' })
      expect(payload?.access?.allowed_users).toEqual(['alice', 'bob'])
      expect(payload?.access?.visibility).toBe('private')

      const nextPlugin = {
        access: {
          allowed_users: ['alice', 'bob'],
          owner_username: 'avm',
          visibility: 'private',
        },
        display_name: `Zip Plugin ${seedStamp}`,
        enabled: true,
        id: installID,
        installed_by: {
          username: 'avm',
        },
        metadata: {
          team: 'ops',
        },
        plugin_version: '1.2.0',
        protocol_version: 'rterm.plugin.v1',
        runtime_status: 'ready',
        source: {
          kind: 'zip',
          url: `file:///tmp/${installID}.zip`,
        },
        tools: [{ approval_tier: 'safe', name: 'plugin.bundle_echo', target_kind: 'workspace' }],
        updated_by: {
          username: 'avm',
        },
      }
      catalog = {
        ...catalog,
        plugins: [...catalog.plugins, nextPlugin],
      }
      await route.fulfill({
        body: JSON.stringify({
          plugin: nextPlugin,
          plugins: catalog,
        }),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (request.method() === 'POST' && path === '/api/v1/plugins/docs.plugin/enable') {
      catalog = {
        ...catalog,
        plugins: catalog.plugins.map((plugin) =>
          plugin.id === 'docs.plugin'
            ? {
                ...plugin,
                enabled: true,
                runtime_status: 'ready',
              }
            : plugin,
        ),
      }
      const updatedPlugin = catalog.plugins.find((plugin) => plugin.id === 'docs.plugin')
      await route.fulfill({
        body: JSON.stringify({
          plugin: updatedPlugin,
          plugins: catalog,
        }),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (request.method() === 'POST' && path === `/api/v1/plugins/${installID}/update`) {
      catalog = {
        ...catalog,
        plugins: catalog.plugins.map((plugin) =>
          plugin.id === installID
            ? {
                ...plugin,
                plugin_version: '1.3.0',
              }
            : plugin,
        ),
      }
      const updatedPlugin = catalog.plugins.find((plugin) => plugin.id === installID)
      await route.fulfill({
        body: JSON.stringify({
          plugin: updatedPlugin,
          plugins: catalog,
        }),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    if (request.method() === 'DELETE' && path === `/api/v1/plugins/${installID}`) {
      const removedPlugin = catalog.plugins.find((plugin) => plugin.id === installID)
      catalog = {
        ...catalog,
        plugins: catalog.plugins.filter((plugin) => plugin.id !== installID),
      }
      await route.fulfill({
        body: JSON.stringify({
          plugin: removedPlugin,
          plugins: catalog,
        }),
        contentType: 'application/json',
        status: 200,
      })
      return
    }

    await route.fallback()
  })

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: /^Plugins / }).click()

  await expect(page.getByText('actor: avm')).toBeVisible()
  await expect(page.getByText('Docs Plugin')).toBeVisible()

  const filterInput = page.getByRole('textbox', { name: 'Filter installed plugins' })
  await filterInput.fill('disabled')
  await expect(page.getByText('Docs Plugin')).toBeVisible()
  await page.getByRole('button', { name: 'Enable' }).click()
  await expect(page.getByText('Docs Plugin enabled.')).toBeVisible()

  await filterInput.fill('')
  await page.getByRole('combobox', { name: 'Plugin source kind' }).selectOption('zip')
  await page.getByRole('textbox', { name: 'Plugin source URL' }).fill(`file:///tmp/${installID}.zip`)
  await page.getByRole('textbox', { name: 'Plugin metadata' }).fill('team=ops')
  await page.getByRole('textbox', { name: 'Plugin allowed users' }).fill('alice\nbob')
  await page.getByRole('button', { name: 'Install from zip' }).click()

  await expect(page.getByText(`Installed Zip Plugin ${seedStamp}.`)).toBeVisible()
  await expect(page.getByText(`Zip Plugin ${seedStamp}`, { exact: true })).toBeVisible()

  await filterInput.fill(installID)
  await page.getByRole('button', { name: 'Update' }).click()
  await expect(page.getByText(`Updated Zip Plugin ${seedStamp} to 1.3.0.`)).toBeVisible()
  await expect(page.getByText('1.3.0', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText(`Removed Zip Plugin ${seedStamp}.`)).toBeVisible()
  await expect(page.getByText(`Zip Plugin ${seedStamp}`, { exact: true })).toHaveCount(0)
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

test('remote settings open shell creates a visible terminal panel in the active workspace', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const remoteToken = `phase5-open-shell-${seedStamp}`
  const saved = await saveRemoteProfileViaApi(request, {
    host: `${remoteToken}.example.test`,
    name: `Remote ${remoteToken}`,
    user: 'deploy',
  })

  const widgetId = 'term-remote-open-shell'
  const tabId = 'tab-remote-open-shell'
  await mockRemoteTerminalSurface(page, {
    connectionId: saved.profile.id,
    connectionName: `Remote ${remoteToken}`,
    widgetId,
  })
  await page.route(`**/api/v1/remote/profiles/${saved.profile.id}/session`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        connection_id: saved.profile.id,
        profile_id: saved.profile.id,
        reused: false,
        session_id: widgetId,
        tab_id: tabId,
        widget_id: widgetId,
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: /^Remote / }).click()
  await page.getByRole('textbox', { name: 'Filter remote profiles' }).fill(remoteToken)

  const savedProfileRow = page.locator('[data-runa-component="clear-box"]').filter({
    has: page.getByText(`Remote ${remoteToken}`),
  })

  await savedProfileRow.getByRole('button', { name: 'Open shell' }).click()
  await expect(page.getByText(`Opened remote shell for Remote ${remoteToken}.`)).toBeVisible()
  await expect(
    page
      .locator('[data-runa-component="terminal-status-header-title"]')
      .filter({ hasText: `Remote ${remoteToken}` }),
  ).toBeVisible()
  await expect(page.getByText('SSH', { exact: true })).toBeVisible()
})

test('remote settings resume discovered tmux session opens that session in the workspace', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const remoteToken = `phase5-resume-shell-${seedStamp}`
  const saved = await saveRemoteProfileViaApi(request, {
    host: `${remoteToken}.example.test`,
    launch_mode: 'tmux',
    name: `Remote ${remoteToken}`,
    tmux_session: 'prod-main',
    user: 'deploy',
  })

  const widgetId = 'term-remote-resume-shell'
  const tabId = 'tab-remote-resume-shell'
  await mockRemoteTerminalSurface(page, {
    connectionId: saved.profile.id,
    connectionName: `Remote ${remoteToken}`,
    widgetId,
    workingDir: `/tmux/${remoteToken}/prod-jobs`,
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
  await page.route(`**/api/v1/remote/profiles/${saved.profile.id}/session`, async (route) => {
    const payload = route.request().postDataJSON() as { tmux_session?: string } | null

    await route.fulfill({
      body: JSON.stringify({
        connection_id: saved.profile.id,
        profile_id: saved.profile.id,
        remote_session_name: payload?.tmux_session ?? 'prod-jobs',
        reused: false,
        session_id: widgetId,
        tab_id: tabId,
        widget_id: widgetId,
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: /^Remote / }).click()
  await page.getByRole('textbox', { name: 'Filter remote profiles' }).fill(remoteToken)

  const savedProfileRow = page.locator('[data-runa-component="clear-box"]').filter({
    has: page.getByText(`Remote ${remoteToken}`),
  })

  await savedProfileRow.getByRole('button', { name: 'Browse tmux' }).click()
  await expect(page.getByText('prod-jobs · detached · 1 windows')).toBeVisible()
  await savedProfileRow.getByRole('button', { name: 'Resume session' }).nth(1).click()

  await expect(page.getByText(`Opened Remote ${remoteToken} on tmux session prod-jobs.`)).toBeVisible()
  await expect(
    page.locator('[data-runa-component="terminal-status-header-title"]').filter({ hasText: 'prod-jobs' }),
  ).toBeVisible()
})

test('remote settings tmux manager opens a typed named session in the workspace', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const remoteToken = `phase5-manager-shell-${seedStamp}`
  const saved = await saveRemoteProfileViaApi(request, {
    host: `${remoteToken}.example.test`,
    launch_mode: 'tmux',
    name: `Remote ${remoteToken}`,
    tmux_session: 'prod-main',
    user: 'deploy',
  })

  const widgetId = 'term-remote-manager-shell'
  const tabId = 'tab-remote-manager-shell'
  await mockRemoteTerminalSurface(page, {
    connectionId: saved.profile.id,
    connectionName: `Remote ${remoteToken}`,
    widgetId,
    workingDir: `/tmux/${remoteToken}/prod-nightly`,
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
  await page.route(`**/api/v1/remote/profiles/${saved.profile.id}/session`, async (route) => {
    const payload = route.request().postDataJSON() as { tmux_session?: string } | null

    await route.fulfill({
      body: JSON.stringify({
        connection_id: saved.profile.id,
        profile_id: saved.profile.id,
        remote_session_name: payload?.tmux_session ?? 'prod-nightly',
        reused: false,
        session_id: widgetId,
        tab_id: tabId,
        widget_id: widgetId,
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: /^Remote / }).click()
  await page.getByRole('textbox', { name: 'Filter remote profiles' }).fill(remoteToken)

  const savedProfileRow = page.locator('[data-runa-component="clear-box"]').filter({
    has: page.getByText(`Remote ${remoteToken}`),
  })

  await savedProfileRow.getByRole('button', { name: 'Browse tmux' }).click()
  await expect(page.getByText('2 discovered · 1 attached · 1 detached')).toBeVisible()
  await page
    .getByRole('textbox', { name: `Named tmux session for Remote ${remoteToken}` })
    .fill('prod-nightly')
  await page.getByRole('button', { name: 'Open named session' }).click()

  await expect(page.getByText(`Opened Remote ${remoteToken} on tmux session prod-nightly.`)).toBeVisible()
  await expect(
    page.locator('[data-runa-component="terminal-status-header-title"]').filter({ hasText: 'prod-nightly' }),
  ).toBeVisible()
})

test('SSH-backed files and preview widgets keep connection-scoped fs requests', async ({ page, request }) => {
  await clearBrowserState(page)
  await page.goto('/')

  const seedStamp = Date.now()
  const remoteToken = `phase6-files-${seedStamp}`
  const saved = await saveRemoteProfileViaApi(request, {
    host: `${remoteToken}.example.test`,
    name: `Remote ${remoteToken}`,
    user: 'deploy',
  })
  const widgetId = 'term-remote-files'
  const tabId = 'tab-remote-files'

  await mockRemoteTerminalSurface(page, {
    connectionId: saved.profile.id,
    connectionName: `Remote ${remoteToken}`,
    widgetId,
    workingDir: '/remote/project',
  })
  await page.route(`**/api/v1/remote/profiles/${saved.profile.id}/session`, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        connection_id: saved.profile.id,
        profile_id: saved.profile.id,
        reused: false,
        session_id: widgetId,
        tab_id: tabId,
        widget_id: widgetId,
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  let seenListConnectionID = ''
  let seenReadConnectionID = ''

  await page.route('**/api/v1/fs/list?*', async (route) => {
    const requestURL = new URL(route.request().url())

    if (requestURL.searchParams.get('connection_id') !== saved.profile.id) {
      await route.fallback()
      return
    }

    seenListConnectionID = requestURL.searchParams.get('connection_id') ?? ''
    await route.fulfill({
      body: JSON.stringify({
        directories: [{ modified_time: 1_776_800_000, name: 'src', type: 'directory' }],
        files: [{ modified_time: 1_776_800_060, name: 'README.md', size: 2048, type: 'file' }],
        path: '/remote/project',
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.route('**/api/v1/fs/read?*', async (route) => {
    const requestURL = new URL(route.request().url())

    if (requestURL.searchParams.get('connection_id') !== saved.profile.id) {
      await route.fallback()
      return
    }

    seenReadConnectionID = requestURL.searchParams.get('connection_id') ?? ''
    await route.fulfill({
      body: JSON.stringify({
        path: '/remote/project/README.md',
        preview: '# Remote README',
        preview_available: true,
        preview_bytes: 15,
        preview_kind: 'text',
        size_bytes: 15,
        truncated: false,
      }),
      contentType: 'application/json',
      status: 200,
    })
  })

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: /^Remote / }).click()
  await page.getByRole('textbox', { name: 'Filter remote profiles' }).fill(remoteToken)

  const savedProfileRow = page.locator('[data-runa-component="clear-box"]').filter({
    has: page.getByText(`Remote ${remoteToken}`),
  })

  await savedProfileRow.getByRole('button', { name: 'Open shell' }).click()
  await expect(page.getByText(`Opened remote shell for Remote ${remoteToken}.`)).toBeVisible()
  await expect(
    page.locator('[data-runa-component="terminal-status-header-title"]').filter({
      hasText: `Remote ${remoteToken}`,
    }),
  ).toBeVisible()

  await openDirectoryWorkspaceWidgetViaApi(request, {
    connectionId: saved.profile.id,
    path: '/remote/project',
    targetWidgetId: widgetId,
  })

  await page.reload()
  await expect(
    page.locator('[data-runa-component="terminal-status-header-title"]').filter({
      hasText: `Remote ${remoteToken}`,
    }),
  ).toBeVisible()

  const filesPanelPath = page.locator('span[id*="files-panel-path"]')
  await expect(filesPanelPath).toHaveText('/remote/project')
  await expect(page.getByText('README.md', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Preview file README.md' }).click()
  await expect(page.locator('span[id*="preview-panel-path"]')).toHaveText('/remote/project/README.md')
  await expect(page.getByText('# Remote README')).toBeVisible()
  await expect.poll(() => seenListConnectionID).toBe(saved.profile.id)
  await expect.poll(() => seenReadConnectionID).toBe(saved.profile.id)
})
