import { expect, test } from '@playwright/test'

import {
  clearBrowserState,
  createAgentProvider,
  fetchAgentConversation,
  fetchAgentProviderCatalog,
  fetchTerminalSnapshot,
  setActiveAgentProvider,
  updateAgentProvider,
} from './runtime'

async function ensureLanSourceProvider(request: Parameters<typeof fetchAgentProviderCatalog>[0]) {
  const providerCatalog = await fetchAgentProviderCatalog(request)
  const existingProvider =
    providerCatalog.providers.find(
      (provider) =>
        provider.kind === 'openai-compatible' &&
        provider.openai_compatible?.base_url === 'http://192.168.1.8:8317',
    ) ?? null

  if (existingProvider) {
    await updateAgentProvider(request, existingProvider.id, {
      display_name: 'LAN OpenAI Source',
      enabled: true,
      openai_compatible: {
        model: 'gpt-5.4',
        chat_models: ['gpt-5.4', 'claude-sonnet-4-6', 'gemini-3-pro-low'],
      },
    })
    return existingProvider.id
  }

  const created = await createAgentProvider(request, {
    kind: 'openai-compatible',
    display_name: 'LAN OpenAI Source',
    enabled: true,
    openai_compatible: {
      base_url: 'http://192.168.1.8:8317',
      model: 'gpt-5.4',
      chat_models: ['gpt-5.4', 'claude-sonnet-4-6', 'gemini-3-pro-low'],
    },
  })

  return created.provider.id
}

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
  await expect(page.getByRole('button', { name: 'Add OpenAI-Compatible HTTP' })).toBeVisible()

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

test('AI sidebar switches to the LAN HTTP source from the toolbar and sends a real request', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000)

  const providerID = await ensureLanSourceProvider(request)

  await clearBrowserState(page)
  await page.goto('/')

  const promptToken = `ui-ai-source-${Date.now()}`
  const prompt = `Reply with exactly this token and nothing else: ${promptToken}`

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  const providerSelect = page.getByRole('combobox', { name: 'AI provider' })
  await providerSelect.selectOption(providerID)
  await expect(providerSelect).toHaveValue(providerID)

  const modelSelect = page.getByRole('combobox', { name: 'AI model' })
  await modelSelect.selectOption('gpt-5.4')
  await expect(modelSelect).toHaveValue('gpt-5.4')

  const composer = page.getByPlaceholder('Text Area')
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
          model: assistantMessage.model,
          provider: assistantMessage.provider,
          status: assistantMessage.status,
        }
      },
      { timeout: 120_000 },
    )
    .toMatchObject({
      content: promptToken,
      model: 'gpt-5.4',
      provider: 'openai-compatible',
      status: 'complete',
    })

  await expect(page.getByText(promptToken, { exact: true })).toBeVisible()
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

  const codexAssistantMessage = page
    .locator('[data-runa-chat-role="assistant"]')
    .filter({ has: page.getByText(promptToken, { exact: true }) })
    .last()

  await expect(codexAssistantMessage).toBeVisible()
  await expect(codexAssistantMessage.getByText('Reasoning')).toBeVisible()
  await expect(codexAssistantMessage.getByText(/codex via CLI command/i)).toBeVisible()

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toHaveCount(0)

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()
  await expect(page.getByText(promptToken, { exact: true })).toBeVisible()
})

test('AI sidebar lets the operator select multiple widget contexts for a request', async ({
  page,
}) => {
  test.setTimeout(60_000)

  let capturedStreamBody: Record<string, unknown> | null = null

  await page.route('**/api/v1/agent/conversation/messages/stream', async (route) => {
    capturedStreamBody = route.request().postDataJSON() as Record<string, unknown>

    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
      },
      body: [
        'event: message-start\ndata: {"type":"message-start","message_id":"msg_context","message":{"id":"msg_context","role":"assistant","content":"","status":"streaming","provider":"stub","model":"stub-model","created_at":"2026-04-24T10:00:00Z"}}\n\n',
        'event: message-complete\ndata: {"type":"message-complete","message_id":"msg_context","message":{"id":"msg_context","role":"assistant","content":"context-selector-ok","status":"complete","provider":"stub","model":"stub-model","created_at":"2026-04-24T10:00:01Z"}}\n\n',
      ].join(''),
    })
  })

  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  await page.getByRole('button', { name: 'Composer options' }).click()
  await expect(page.getByRole('dialog', { name: 'Context widgets' })).toBeVisible()
  const opsShellOption = page.getByRole('option', { name: /Ops Shell/ })
  const mainShellOption = page.getByRole('option', { name: /Main Shell/ })

  await expect(opsShellOption).toBeVisible()
  await expect(mainShellOption).toBeVisible()

  if ((await opsShellOption.getAttribute('aria-selected')) !== 'true') {
    await opsShellOption.click()
  }
  if ((await mainShellOption.getAttribute('aria-selected')) !== 'true') {
    await mainShellOption.click()
  }

  await expect(opsShellOption).toHaveAttribute('aria-selected', 'true')
  await expect(mainShellOption).toHaveAttribute('aria-selected', 'true')

  await page.getByPlaceholder('Text Area').fill('context selector smoke')
  await page.getByRole('button', { name: 'Send prompt' }).click()

  await expect.poll(() => capturedStreamBody, { timeout: 15_000 }).not.toBeNull()
  expect(capturedStreamBody).toMatchObject({
    prompt: 'context selector smoke',
    context: {
      action_source: 'frontend.ai.sidebar',
      active_widget_id: 'term-side',
      repo_root: '/Users/avm/projects/Personal/tideterm/runa-terminal',
      widget_context_enabled: true,
      widget_ids: ['term-side', 'term-main'],
    },
  })

  await expect(page.getByText('context-selector-ok')).toBeVisible()
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
