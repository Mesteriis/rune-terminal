import { expect, test } from '@playwright/test'

import {
  clearBrowserState,
  fetchTerminalSettings,
  fetchTerminalSnapshot,
  sendTerminalInputViaApi,
  updateTerminalSettingsViaApi,
} from './runtime'

test('terminal settings persist font-size changes through the shell settings UI', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: 'Terminal Настройки терминального runtime.' }).click()

  await expect(page.getByText('Current terminal font size')).toBeVisible()
  await expect(page.getByText('13px', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Increase terminal font size' }).click()
  await expect(page.getByText('14px', { exact: true })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: 'Terminal Настройки терминального runtime.' }).click()

  await expect(page.getByText('14px', { exact: true })).toBeVisible()
  await expect.poll(async () => (await fetchTerminalSettings(request)).font_size).toBe(14)

  await updateTerminalSettingsViaApi(request, {
    font_size: 13,
    line_height: 1.25,
  })
})

test('terminal settings persist line-height changes through the shell settings UI', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: 'Terminal Настройки терминального runtime.' }).click()

  await expect(page.getByText('Current line height')).toBeVisible()
  await expect(page.getByText('1.25x', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Increase terminal line height' }).click()
  await expect(page.getByText('1.30x', { exact: true })).toBeVisible()

  await page.reload()
  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: 'Terminal Настройки терминального runtime.' }).click()

  await expect(page.getByText('1.30x', { exact: true })).toBeVisible()
  await expect.poll(async () => (await fetchTerminalSettings(request)).line_height).toBe(1.3)

  await updateTerminalSettingsViaApi(request, {
    font_size: 13,
    line_height: 1.25,
  })
})

test('terminal input from the shell writes to the live backend session', async ({ page, request }) => {
  await clearBrowserState(page)
  await page.goto('/')

  const marker = `terminal-e2e-${Date.now()}`
  const terminalInput = page.getByRole('textbox', { name: 'Terminal input' }).last()
  const searchToggle = page.getByRole('button', { name: 'Toggle terminal search' }).last()

  await expect(terminalInput).toBeVisible()
  await expect(searchToggle).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear terminal viewport' }).last()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Jump to latest terminal output' }).last()).toBeVisible()
  await searchToggle.click()
  await expect(page.getByRole('textbox', { name: 'Search terminal output' }).last()).toBeVisible()
  await page.getByRole('button', { name: 'Close terminal search' }).last().click()
  await expect
    .poll(async () => {
      const snapshot = await fetchTerminalSnapshot(request, 'term-side')
      return (
        snapshot.state.can_send_input === true &&
        snapshot.state.status === 'running' &&
        snapshot.next_seq > 0
      )
    })
    .toBe(true)

  const [mainBaseline, sideBaseline] = await Promise.all([
    fetchTerminalSnapshot(request, 'term-main'),
    fetchTerminalSnapshot(request, 'term-side'),
  ])

  await terminalInput.click()
  await expect(terminalInput).toBeFocused()
  await page.keyboard.type(`printf '${marker}\\n'`)
  await page.keyboard.press('Enter')

  await expect
    .poll(
      async () => {
        const [mainSnapshot, sideSnapshot] = await Promise.all([
          fetchTerminalSnapshot(request, 'term-main'),
          fetchTerminalSnapshot(request, 'term-side'),
        ])

        return (
          mainSnapshot.next_seq > mainBaseline.next_seq ||
          sideSnapshot.next_seq > sideBaseline.next_seq ||
          [mainSnapshot, sideSnapshot].some((snapshot) =>
            snapshot.chunks.some((chunk) => chunk.data.includes(marker)),
          )
        )
      },
      { timeout: 30_000 },
    )
    .toBe(true)

  await page.getByRole('button', { name: 'Clear terminal viewport' }).last().click()
  await page.getByRole('button', { name: 'Jump to latest terminal output' }).last().click()

  const postToolbarMarker = `terminal-post-toolbar-${Date.now()}`
  const postToolbarBaseline = await fetchTerminalSnapshot(request, 'term-side')
  await sendTerminalInputViaApi(request, 'term-side', `printf '${postToolbarMarker}\\n'`, true)

  await expect
    .poll(
      async () => {
        const snapshot = await fetchTerminalSnapshot(request, 'term-side')

        return (
          snapshot.next_seq > postToolbarBaseline.next_seq &&
          snapshot.chunks.some((chunk) => chunk.data.includes(postToolbarMarker))
        )
      },
      { timeout: 30_000 },
    )
    .toBe(true)
})

test('newly added terminal streams live output without browser errors', async ({ page, request }) => {
  await clearBrowserState(page)

  const pageErrors: string[] = []
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await page.goto('/')
  const readRuntimeWidgetIds = async () =>
    page.evaluate(() => {
      const rawValue = localStorage.getItem('runa-terminal:dockview-workspaces:v1')

      if (!rawValue) {
        return [] as string[]
      }

      const parsedValue = JSON.parse(rawValue) as {
        activeWorkspaceId?: number
        workspaceTabs?: Array<{
          id: number
          snapshot?: {
            panels?: Record<string, { params?: { runtimeTabId?: string; widgetId?: string } }>
          } | null
        }>
      }
      const activeWorkspace = parsedValue.workspaceTabs?.find(
        (workspace) => workspace.id === parsedValue.activeWorkspaceId,
      )
      return Object.values(activeWorkspace?.snapshot?.panels ?? {})
        .filter(
          (panel) => typeof panel.params?.runtimeTabId === 'string' && typeof panel.params?.widgetId === 'string',
        )
        .map((panel) => panel.params!.widgetId!)
    })

  const baselineRuntimeWidgetIds = await readRuntimeWidgetIds()

  await page.getByRole('button', { name: 'Open utility panel' }).click()
  await page.getByRole('menuitem', { name: 'Create terminal widget' }).click()

  const readNewRuntimeWidgetId = async () =>
    page.evaluate((existingWidgetIds: string[]) => {
      const rawValue = localStorage.getItem('runa-terminal:dockview-workspaces:v1')

      if (!rawValue) {
        return null
      }

      const parsedValue = JSON.parse(rawValue) as {
        activeWorkspaceId?: number
        workspaceTabs?: Array<{
          id: number
          snapshot?: {
            panels?: Record<string, { params?: { runtimeTabId?: string; widgetId?: string } }>
          } | null
        }>
      }
      const activeWorkspace = parsedValue.workspaceTabs?.find(
        (workspace) => workspace.id === parsedValue.activeWorkspaceId,
      )
      const runtimePanels = Object.values(activeWorkspace?.snapshot?.panels ?? {}).filter(
        (panel) => typeof panel.params?.runtimeTabId === 'string' && typeof panel.params?.widgetId === 'string',
      )
      const newRuntimePanel = runtimePanels.find(
        (panel) => !existingWidgetIds.includes(panel.params?.widgetId ?? ''),
      )

      return newRuntimePanel?.params?.widgetId ?? null
    }, baselineRuntimeWidgetIds)

  await expect.poll(readNewRuntimeWidgetId).not.toBeNull()

  const runtimeWidgetId = await readNewRuntimeWidgetId()
  if (!runtimeWidgetId) {
    throw new Error('new terminal widget id was not persisted to localStorage')
  }

  await expect
    .poll(async () => {
      const snapshot = await fetchTerminalSnapshot(request, runtimeWidgetId)
      return snapshot.state.can_send_input === true && snapshot.state.status === 'running'
    })
    .toBe(true)

  await page.waitForTimeout(250)

  const terminalInput = page.getByRole('textbox', { name: 'Terminal input' }).last()
  const marker = `added-terminal-e2e-${Date.now()}`
  const baselineSnapshot = await fetchTerminalSnapshot(request, runtimeWidgetId)

  await terminalInput.click()
  await expect(terminalInput).toBeFocused()
  await sendTerminalInputViaApi(request, runtimeWidgetId, `printf '${marker}\\n'`, true)

  await expect
    .poll(
      async () => {
        const snapshot = await fetchTerminalSnapshot(request, runtimeWidgetId)

        return (
          snapshot.next_seq > baselineSnapshot.next_seq &&
          snapshot.chunks.some((chunk) => chunk.data.includes(marker))
        )
      },
      { timeout: 30_000 },
    )
    .toBe(true)

  expect(pageErrors).toEqual([])
})

test('terminal restart action restarts the live backend session and keeps input working', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  await expect
    .poll(async () => {
      const snapshot = await fetchTerminalSnapshot(request, 'term-side')
      return snapshot.state.can_send_input === true && snapshot.state.status === 'running'
    })
    .toBe(true)

  const baselineSnapshot = await fetchTerminalSnapshot(request, 'term-side')

  await page.getByRole('button', { name: 'Restart terminal for Workspace shell' }).last().click()

  await expect
    .poll(
      async () => {
        const snapshot = await fetchTerminalSnapshot(request, 'term-side')
        return (
          snapshot.state.status === 'running' &&
          snapshot.state.can_send_input === true &&
          snapshot.state.started_at !== baselineSnapshot.state.started_at
        )
      },
      { timeout: 30_000 },
    )
    .toBe(true)

  const marker = `restart-terminal-e2e-${Date.now()}`
  const restartedSnapshot = await fetchTerminalSnapshot(request, 'term-side')

  await sendTerminalInputViaApi(request, 'term-side', `printf '${marker}\\n'`, true)

  await expect
    .poll(
      async () => {
        const snapshot = await fetchTerminalSnapshot(request, 'term-side')

        return (
          snapshot.next_seq > restartedSnapshot.next_seq &&
          snapshot.chunks.some((chunk) => chunk.data.includes(marker))
        )
      },
      { timeout: 30_000 },
    )
    .toBe(true)
})

test('terminal interrupt action signals the live backend session without breaking the stream', async ({
  page,
  request,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  await expect
    .poll(async () => {
      const snapshot = await fetchTerminalSnapshot(request, 'term-side')
      return snapshot.state.can_send_input === true && snapshot.state.can_interrupt === true
    })
    .toBe(true)

  const baselineSnapshot = await fetchTerminalSnapshot(request, 'term-side')
  const interruptResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/v1/terminal/term-side/interrupt') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Interrupt terminal for Workspace shell' }).last().click()
  const interruptResponse = await interruptResponsePromise
  expect(interruptResponse.ok()).toBeTruthy()

  await expect
    .poll(
      async () => {
        const snapshot = await fetchTerminalSnapshot(request, 'term-side')
        return snapshot.state.widget_id === 'term-side' && snapshot.state.started_at === baselineSnapshot.state.started_at
      },
      { timeout: 10_000 },
    )
    .toBe(true)

  const marker = `interrupt-terminal-e2e-${Date.now()}`
  const afterInterruptSnapshot = await fetchTerminalSnapshot(request, 'term-side')

  await sendTerminalInputViaApi(request, 'term-side', `printf '${marker}\\n'`, true)

  await expect
    .poll(
      async () => {
        const snapshot = await fetchTerminalSnapshot(request, 'term-side')
        return (
          snapshot.next_seq > afterInterruptSnapshot.next_seq &&
          snapshot.chunks.some((chunk) => chunk.data.includes(marker))
        )
      },
      { timeout: 30_000 },
    )
    .toBe(true)
})

test('terminal tab overflow uses the compact overflow trigger and dropdown path', async ({ page }) => {
  await clearBrowserState(page)
  await page.setViewportSize({ width: 900, height: 900 })
  await page.goto('/')

  const addButton = page.getByRole('button', { name: 'Add terminal tab for Workspace shell' }).last()

  await expect(addButton).toBeVisible()

  for (let index = 0; index < 6; index += 1) {
    await addButton.click()
  }

  const overflowTrigger = page.locator('.dv-tabs-overflow-dropdown-default').last()
  await expect(overflowTrigger).toBeVisible()
  await expect(overflowTrigger).toHaveCSS('min-height', '28px')

  await overflowTrigger.click()

  const overflowContainer = page.locator('.dv-tabs-overflow-container').last()
  await expect(overflowContainer).toBeVisible()
  await expect
    .poll(async () => overflowContainer.locator('.dv-tab').count())
    .toBeGreaterThanOrEqual(3)
})
