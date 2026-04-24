import { expect, test } from '@playwright/test'

import {
  clearBrowserState,
  fetchAgentConversation,
  fetchAgentProviderCatalog,
  fetchTerminalSnapshot,
  setActiveAgentProvider,
} from './runtime'

test('settings modal exposes AI provider, model, limits, terminal, and commander sections', async ({
  page,
}) => {
  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Open settings panel' }).click()

  await expect(page.getByText('Rune Terminal')).toBeVisible()
  await expect(page.getByText('Configured providers')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Codex CLI' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Claude Code CLI' })).toBeVisible()

  await page.getByRole('button', { name: 'Модели Список моделей, доступных в чате.' }).click()
  await expect(page.getByText('AI / Модели')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Refresh models' })).toBeVisible()

  await page.getByRole('button', { name: 'Лимиты Готовность и будущие quota surfaces.' }).click()
  await expect(page.getByText('AI / Лимиты')).toBeVisible()

  await page.getByRole('button', { name: 'Terminal Настройки терминального runtime.' }).click()
  await expect(page.getByText('Terminal preferences')).toBeVisible()

  await page.getByRole('button', { name: 'Commander Настройки file-manager surface.' }).click()
  await expect(page.getByText('Commander preferences')).toBeVisible()

  await page.getByRole('button', { name: 'Основные' }).click()
  await expect(page.getByText('Desktop watcher mode')).toBeVisible()
  await expect(page.getByText('Split browser dev loop', { exact: true })).toBeVisible()
})

test('AI sidebar runs a live Codex chat path and restores the transcript after reopen', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000)

  const providerCatalog = await fetchAgentProviderCatalog(request)
  const codexProvider =
    providerCatalog.providers.find((provider) => provider.id === 'codex-cli') ??
    providerCatalog.providers.find((provider) => provider.kind === 'codex') ??
    null

  test.skip(!codexProvider, 'Codex CLI provider is not available in the backend catalog.')

  if (providerCatalog.active_provider_id !== codexProvider.id) {
    await setActiveAgentProvider(request, codexProvider.id)
  }

  await clearBrowserState(page)
  await page.goto('/')

  const promptToken = `ui-ai-codex-${Date.now()}`
  const prompt = `Reply with exactly this token and nothing else: ${promptToken}`

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  await page.getByRole('button', { name: 'debug' }).click()
  await expect(page.getByRole('button', { name: 'debug' })).toHaveAttribute('aria-pressed', 'true')

  const composer = page.getByPlaceholder('Text Area')
  await expect(composer).toBeVisible()
  await composer.fill(prompt)
  await page.getByRole('button', { name: 'Send prompt' }).click()

  await expect
    .poll(
      async () => {
        const conversation = await fetchAgentConversation(request)
        const assistantMessage = [...conversation.messages]
          .reverse()
          .find((message) => message.role === 'assistant' && message.content.includes(promptToken))

        if (!assistantMessage) {
          return null
        }

        return {
          content: assistantMessage.content,
          provider: assistantMessage.provider,
          reasoning: assistantMessage.reasoning ?? '',
          status: assistantMessage.status,
        }
      },
      { timeout: 120_000 },
    )
    .toMatchObject({
      provider: 'codex',
      status: 'complete',
    })

  await expect(page.getByText(promptToken, { exact: true })).toBeVisible()
  await expect(page.getByText('Reasoning')).toBeVisible()
  await expect(page.getByText(/codex via CLI command/i)).toBeVisible()

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toHaveCount(0)

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()
  await expect(page.getByText(promptToken, { exact: true })).toBeVisible()
})

test('AI sidebar routes through Claude provider and surfaces local auth state honestly', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000)

  const providerCatalog = await fetchAgentProviderCatalog(request)
  const claudeProvider =
    providerCatalog.providers.find((provider) => provider.id === 'claude-code-cli') ??
    providerCatalog.providers.find((provider) => provider.kind === 'claude') ??
    null

  test.skip(!claudeProvider, 'Claude Code CLI provider is not available in the backend catalog.')
  test.skip(
    claudeProvider.claude?.status_state === 'missing',
    'Claude Code CLI binary is not available in this environment.',
  )

  if (providerCatalog.active_provider_id !== claudeProvider.id) {
    await setActiveAgentProvider(request, claudeProvider.id)
  }

  await clearBrowserState(page)
  await page.goto('/')

  const promptToken = `ui-ai-claude-${Date.now()}`
  const prompt = `Reply with exactly this token and nothing else: ${promptToken}`

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  const composer = page.getByPlaceholder('Text Area')
  await expect(composer).toBeVisible()
  await composer.fill(prompt)
  await page.getByRole('button', { name: 'Send prompt' }).click()

  if (claudeProvider.claude?.status_state === 'ready') {
    await expect
      .poll(
        async () => {
          const conversation = await fetchAgentConversation(request)
          const assistantMessage = [...conversation.messages]
            .reverse()
            .find((message) => message.role === 'assistant' && message.content.includes(promptToken))

          if (!assistantMessage) {
            return null
          }

          return {
            content: assistantMessage.content,
            provider: assistantMessage.provider,
            status: assistantMessage.status,
          }
        },
        { timeout: 120_000 },
      )
      .toMatchObject({
        provider: 'claude',
        status: 'complete',
      })

    await expect(page.getByText(promptToken, { exact: true })).toBeVisible()
    return
  }

  await expect(page.getByText(/not logged in/i)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/please run \/login/i)).toBeVisible()
})

test('AI sidebar /run sends input into the active terminal instead of falling back to plain chat', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000)

  const providerCatalog = await fetchAgentProviderCatalog(request)
  const codexProvider =
    providerCatalog.providers.find((provider) => provider.id === 'codex-cli') ??
    providerCatalog.providers.find((provider) => provider.kind === 'codex') ??
    null

  test.skip(!codexProvider, 'Codex CLI provider is not available in the backend catalog.')

  if (providerCatalog.active_provider_id !== codexProvider.id) {
    await setActiveAgentProvider(request, codexProvider.id)
  }

  await clearBrowserState(page)

  const streamRequests: string[] = []
  const toolRequests: string[] = []
  const explainRequests: string[] = []
  const pageErrors: string[] = []

  page.on('request', (requestEvent) => {
    const requestUrl = requestEvent.url()

    if (requestUrl.endsWith('/api/v1/agent/conversation/messages/stream')) {
      streamRequests.push(requestUrl)
    }
    if (requestUrl.endsWith('/api/v1/tools/execute')) {
      toolRequests.push(requestUrl)
    }
    if (requestUrl.endsWith('/api/v1/agent/terminal-commands/explain')) {
      explainRequests.push(requestUrl)
    }
  })
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  await page.goto('/')

  await expect
    .poll(async () => {
      const snapshot = await fetchTerminalSnapshot(request, 'term-side')
      return snapshot.state.can_send_input === true && snapshot.state.status === 'running'
    })
    .toBe(true)

  const marker = `ai-run-e2e-${Date.now()}`
  const command = `printf '${marker}\\n'`
  const terminalInput = page.getByRole('textbox', { name: 'Terminal input' }).last()
  const baselineSnapshot = await fetchTerminalSnapshot(request, 'term-side')

  await terminalInput.click()
  await expect(terminalInput).toBeFocused()

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  const composer = page.getByPlaceholder('Text Area')
  await composer.fill(`/run ${command}`)
  await page.getByRole('button', { name: 'Send prompt' }).click()

  await expect
    .poll(
      async () => {
        const snapshot = await fetchTerminalSnapshot(request, 'term-side')

        return (
          snapshot.next_seq > baselineSnapshot.next_seq &&
          snapshot.chunks.some((chunk) => chunk.data.includes(marker))
        )
      },
      { timeout: 30_000 },
    )
    .toBe(true)

  await expect
    .poll(
      async () => {
        const conversation = await fetchAgentConversation(request)
        return conversation.messages.some(
          (message) => message.role === 'assistant' && message.content.includes(`Executed \`${command}\``),
        )
      },
      { timeout: 120_000 },
    )
    .toBe(true)

  expect(streamRequests).toEqual([])
  expect(toolRequests.length).toBeGreaterThan(0)
  expect(explainRequests.length).toBeGreaterThan(0)
  expect(pageErrors).toEqual([])
})
