import { expect, test } from '@playwright/test'

import {
  activateAgentConversation,
  clearBrowserState,
  createAgentConversation as createConversationViaApi,
  createAgentProvider,
  fetchAgentConversations,
  fetchAgentConversation,
  fetchAgentProviderCatalog,
  fetchTerminalSnapshot,
  renameAgentConversation as renameConversationViaApi,
  setActiveAgentProvider,
  updateAgentConversationContext,
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

  await page.getByRole('button', { name: 'Composer Поведение Enter / Shift+Enter в чате.' }).click()
  await expect(page.getByText('AI / Composer')).toBeVisible()
  await expect(
    page.getByRole('radio', {
      name: /^Enter sends Shift\+Enter inserts a new line\.$/,
    }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Лимиты Готовность и будущие quota surfaces.' }).click()
  await expect(page.getByText('AI / Лимиты')).toBeVisible()

  await page.getByRole('button', { name: 'Terminal Настройки терминального runtime.' }).click()
  await expect(page.getByText('Current terminal font size')).toBeVisible()

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

test('AI sidebar creates and switches backend conversations instead of keeping one flat transcript', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000)

  const initialConversations = await fetchAgentConversations(request)
  const originalConversationID =
    initialConversations.active_conversation_id || initialConversations.conversations[0]?.id || ''

  if (!originalConversationID) {
    const bootstrappedConversation = await createConversationViaApi(request)
    await activateAgentConversation(request, bootstrappedConversation.id)
  }

  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  const conversationMenuButton = page.getByRole('button', { name: 'Conversation menu' })
  await expect(conversationMenuButton).toBeVisible()
  const createConversationButton = page.getByRole('button', { name: 'Create conversation' })
  const conversationCountBefore = (await fetchAgentConversations(request)).conversations.length

  await conversationMenuButton.click()
  await createConversationButton.click()

  await expect
    .poll(async () => {
      const conversations = await fetchAgentConversations(request)
      return conversations.conversations.length
    })
    .toBe(conversationCountBefore + 1)

  const createdConversations = await fetchAgentConversations(request)
  const createdConversationID = createdConversations.active_conversation_id

  expect(createdConversationID).not.toBe('')

  await page.reload()
  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  const reopenedConversationMenuButton = page.getByRole('button', { name: 'Conversation menu' })
  await expect(reopenedConversationMenuButton).toBeVisible()
  await expect(reopenedConversationMenuButton).toContainText('New conversation')
  await expect
    .poll(async () => {
      const conversation = await fetchAgentConversation(request)
      return {
        id: conversation.id,
        messageCount: conversation.messages.length,
      }
    })
    .toMatchObject({
      id: createdConversationID,
      messageCount: 0,
    })

  if (originalConversationID) {
    const originalConversationTitle =
      initialConversations.conversations.find((conversation) => conversation.id === originalConversationID)?.title ||
      'New conversation'

    await reopenedConversationMenuButton.click()
    await page
      .getByRole('option', {
        name: `Open conversation ${originalConversationTitle}`,
      })
      .click()

    await expect
      .poll(async () => {
        const conversations = await fetchAgentConversations(request)
        return conversations.active_conversation_id
      })
      .toBe(originalConversationID)
  }

  expect(createdConversationID).not.toBe(originalConversationID)
})

test('AI conversation navigator renames the active backend conversation', async ({ page, request }) => {
  test.setTimeout(60_000)

  const createdConversation = await createConversationViaApi(request)
  await renameConversationViaApi(request, createdConversation.id, 'Rename target before UI')

  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  const conversationMenuButton = page.getByRole('button', { name: 'Conversation menu' })
  await conversationMenuButton.click()
  const activeConversationSummary = page.getByLabel('Active conversation summary')
  await expect(activeConversationSummary.getByText('Active thread')).toBeVisible()
  await expect(activeConversationSummary.getByText('Rename target before UI')).toBeVisible()
  await page.getByRole('button', { name: 'Rename conversation' }).click()
  await page.getByRole('textbox', { name: 'Conversation title' }).fill('Renamed from UI')
  await page.getByRole('button', { name: 'Save conversation title' }).click()

  await expect
    .poll(async () => {
      const conversation = await fetchAgentConversation(request)
      return conversation.title
    })
    .toBe('Renamed from UI')
})

test('AI conversation navigator deletes the active thread and promotes the next conversation', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000)

  const keepConversation = await createConversationViaApi(request)
  await renameConversationViaApi(request, keepConversation.id, 'Keep after delete')

  const deleteConversation = await createConversationViaApi(request)
  await renameConversationViaApi(request, deleteConversation.id, 'Delete from UI')
  await activateAgentConversation(request, deleteConversation.id)

  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  const conversationMenuButton = page.getByRole('button', { name: 'Conversation menu' })
  await conversationMenuButton.click()
  await page.getByRole('button', { name: 'Delete conversation' }).click()
  await expect(page.getByText('Delete active conversation')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm delete conversation' }).click()

  await expect
    .poll(async () => {
      const conversations = await fetchAgentConversations(request)
      return {
        active: conversations.active_conversation_id,
        ids: conversations.conversations.map((conversation) => conversation.id),
      }
    })
    .toMatchObject({
      active: keepConversation.id,
      ids: expect.not.arrayContaining([deleteConversation.id]),
    })

  await expect(conversationMenuButton).toContainText('Keep after delete')
  await conversationMenuButton.click()
  await expect(
    page.getByRole('option', {
      name: 'Open conversation Keep after delete',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('option', {
      name: 'Open conversation Delete from UI',
    }),
  ).toHaveCount(0)
})

test('AI conversation navigator archives the active thread and restores it from the archived group', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000)

  const keepConversation = await createConversationViaApi(request)
  await renameConversationViaApi(request, keepConversation.id, 'Keep in recent')

  const archiveConversation = await createConversationViaApi(request)
  await renameConversationViaApi(request, archiveConversation.id, 'Archive from UI')
  await activateAgentConversation(request, archiveConversation.id)

  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  const conversationMenuButton = page.getByRole('button', { name: 'Conversation menu' })
  await conversationMenuButton.click()
  await page.getByRole('button', { name: 'Archive conversation' }).click()

  await expect
    .poll(async () => {
      const conversations = await fetchAgentConversations(request)
      return {
        active: conversations.active_conversation_id,
        archivedAt:
          conversations.conversations.find((conversation) => conversation.id === archiveConversation.id)?.archived_at ??
          null,
      }
    })
    .toMatchObject({
      active: keepConversation.id,
      archivedAt: expect.any(String),
    })

  await expect(conversationMenuButton).toContainText('Keep in recent')
  await conversationMenuButton.click()
  await page.getByRole('button', { name: 'Show archived conversations' }).click()
  await expect(page.getByText('Archived threads')).toBeVisible()
  await page
    .getByRole('option', {
      name: 'Open conversation Archive from UI',
    })
    .click()
  await expect(conversationMenuButton).toContainText('Archive from UI')

  await conversationMenuButton.click()
  await page.getByRole('button', { name: 'Restore conversation' }).click()

  await expect
    .poll(async () => {
      const conversations = await fetchAgentConversations(request)
      return conversations.conversations.find((conversation) => conversation.id === archiveConversation.id)?.archived_at
    })
    .toBeUndefined()

  await conversationMenuButton.click()
  await expect(page.getByText('Open threads')).toBeVisible()
  await expect(
    page.getByRole('option', {
      name: 'Open conversation Archive from UI',
    }),
  ).toBeVisible()
})

test('AI conversation navigator supports keyboard navigation through filtered thread options', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000)

  const token = `keyboard-${Date.now()}`
  const firstConversation = await createConversationViaApi(request)
  const secondConversation = await createConversationViaApi(request)
  const thirdConversation = await createConversationViaApi(request)

  await renameConversationViaApi(request, firstConversation.id, `${token} first thread`)
  await renameConversationViaApi(request, secondConversation.id, `${token} second thread`)
  await renameConversationViaApi(request, thirdConversation.id, `${token} third thread`)
  await activateAgentConversation(request, thirdConversation.id)

  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()

  const conversationMenuButton = page.getByRole('button', { name: 'Conversation menu' })
  await conversationMenuButton.click()
  const searchInput = page.getByRole('textbox', { name: 'Search conversations' })
  await searchInput.fill(token)

  const filteredOptions = page
    .getByRole('option')
    .filter({ hasText: token })

  await expect(filteredOptions).toHaveCount(3)

  const optionCount = await filteredOptions.count()
  const orderedOptionIDs: string[] = []
  const orderedOptionNames: string[] = []

  for (let index = 0; index < optionCount; index += 1) {
    const option = filteredOptions.nth(index)
    orderedOptionIDs.push((await option.getAttribute('id')) ?? '')
    orderedOptionNames.push((await option.textContent())?.trim() ?? '')
  }

  await expect(searchInput).toHaveAttribute('aria-activedescendant', orderedOptionIDs[0] ?? '')

  await searchInput.press('ArrowDown')
  await expect(searchInput).toHaveAttribute('aria-activedescendant', orderedOptionIDs[1] ?? '')

  await searchInput.press('End')
  await expect(searchInput).toHaveAttribute('aria-activedescendant', orderedOptionIDs[2] ?? '')

  await searchInput.press('Home')
  await expect(searchInput).toHaveAttribute('aria-activedescendant', orderedOptionIDs[0] ?? '')

  await searchInput.press('Enter')
  await expect(conversationMenuButton).toContainText(orderedOptionNames[0] ?? '')
})

test('AI conversation navigator filters recent threads locally', async ({ page, request }) => {
  test.setTimeout(60_000)

  const terminalConversation = await createConversationViaApi(request)
  await renameConversationViaApi(request, terminalConversation.id, 'Terminal runtime notes')

  const backendConversation = await createConversationViaApi(request)
  await renameConversationViaApi(request, backendConversation.id, 'Backend audit notes')
  await activateAgentConversation(request, backendConversation.id)

  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  await page.getByRole('button', { name: 'Conversation menu' }).click()

  const searchInput = page.getByRole('textbox', { name: 'Search conversations' })
  await searchInput.fill('terminal')

  await expect(
    page.getByRole('option', {
      name: 'Open conversation Terminal runtime notes',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('option', {
      name: 'Open conversation Backend audit notes',
    }),
  ).toHaveCount(0)

  await searchInput.fill('missing')
  await expect(page.getByText('No conversations match this filter.')).toBeVisible()
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

test('AI sidebar lets the operator bulk-select widgets for a request', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000)

  const conversation = await createConversationViaApi(request)
  await updateAgentConversationContext(request, conversation.id, {
    widget_context_enabled: true,
    widget_ids: [],
  })
  await activateAgentConversation(request, conversation.id)

  let capturedStreamBody: Record<string, unknown> | null = null
  const contextSelectorAssistantMessage = {
    id: 'msg_context',
    role: 'assistant',
    content: 'context-selector-ok',
    status: 'complete',
    provider: 'stub',
    model: 'stub-model',
    created_at: '2026-04-24T10:00:01Z',
  }

  await page.route('**/api/v1/agent/conversation', async (route) => {
    if (route.request().method() !== 'GET' || capturedStreamBody == null) {
      await route.continue()
      return
    }

    const response = await route.fetch()
    const payload = (await response.json()) as {
      conversation?: { messages?: Array<Record<string, unknown>> }
    }
    const conversation = payload.conversation ?? {}
    const messages = Array.isArray(conversation.messages) ? [...conversation.messages] : []
    const hasContextSelectorMessage = messages.some(
      (message) => typeof message.content === 'string' && message.content.includes('context-selector-ok'),
    )

    if (!hasContextSelectorMessage) {
      messages.push(contextSelectorAssistantMessage)
    }

    await route.fulfill({
      response,
      json: {
        ...payload,
        conversation: {
          ...conversation,
          messages,
        },
      },
    })
  })

  await page.route('**/api/v1/agent/conversation/messages/stream', async (route) => {
    capturedStreamBody = route.request().postDataJSON() as Record<string, unknown>

    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
      },
      body: [
        'event: message-start\ndata: {"type":"message-start","message_id":"msg_context","message":{"id":"msg_context","role":"assistant","content":"","status":"streaming","provider":"stub","model":"stub-model","created_at":"2026-04-24T10:00:00Z"}}\n\n',
        `event: message-complete\ndata: ${JSON.stringify({
          type: 'message-complete',
          message_id: 'msg_context',
          message: contextSelectorAssistantMessage,
        })}\n\n`,
      ].join(''),
    })
  })

  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  await page.getByRole('button', { name: 'Composer options' }).click()
  await expect(page.getByRole('dialog', { name: 'Context widgets' })).toBeVisible()
  await page.getByRole('button', { name: 'Only current' }).click()
  await page.keyboard.press('Escape')
  await expect
    .poll(async () => {
      const activeConversation = await fetchAgentConversation(request)
      return activeConversation.context_preferences.widget_ids
    })
    .toHaveLength(1)

  await page.getByRole('button', { name: 'Composer options' }).click()
  await page.getByRole('button', { name: 'All widgets' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Composer options' })).toContainText('2 widgets')
  await expect(page.getByText('Request context')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove Main Shell from request context' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove Ops Shell from request context' })).toBeVisible()

  await page.getByPlaceholder('Text Area').fill('context selector smoke')
  await page.getByRole('button', { name: 'Send prompt' }).click()

  await expect.poll(() => capturedStreamBody, { timeout: 15_000 }).not.toBeNull()
  expect(capturedStreamBody).toMatchObject({
    prompt: 'context selector smoke',
    context: {
      action_source: 'frontend.ai.sidebar',
      active_widget_id: 'term-main',
      repo_root: '/Users/avm/projects/Personal/tideterm/runa-terminal',
      widget_context_enabled: true,
      widget_ids: ['term-main', 'term-side'],
    },
  })

  await expect(page.getByText('context-selector-ok')).toBeVisible()
})

test('AI sidebar restores persisted widget context per conversation', async ({ page, request }) => {
  test.setTimeout(90_000)

  const threadOneTitle = `Context Thread One ${Date.now()}`
  const threadTwoTitle = `Context Thread Two ${Date.now()}`
  const initialConversations = await fetchAgentConversations(request)
  const threadOneID = initialConversations.active_conversation_id || initialConversations.conversations[0]?.id || ''

  if (!threadOneID) {
    throw new Error('Expected an active conversation before context persistence test.')
  }

  await renameConversationViaApi(request, threadOneID, threadOneTitle)
  await updateAgentConversationContext(request, threadOneID, {
    widget_context_enabled: true,
    widget_ids: ['term-main'],
  })

  await clearBrowserState(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  await page.getByRole('button', { name: 'Conversation menu' }).click()
  await page.getByRole('button', { name: 'Create conversation' }).click()

  await expect
    .poll(async () => {
      const conversations = await fetchAgentConversations(request)
      return conversations.active_conversation_id !== threadOneID ? conversations.active_conversation_id : ''
    })
    .not.toBe('')

  const activeConversationID = (await fetchAgentConversations(request)).active_conversation_id
  await renameConversationViaApi(request, activeConversationID, threadTwoTitle)
  await updateAgentConversationContext(request, activeConversationID, {
    widget_context_enabled: false,
    widget_ids: [],
  })

  await page.reload()
  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByRole('button', { name: 'Conversation menu' })).toContainText(threadTwoTitle)

  await expect
    .poll(async () => {
      const conversation = await fetchAgentConversation(request)
      return conversation.context_preferences
    })
    .toMatchObject({
      widget_context_enabled: false,
      widget_ids: [],
    })
  await expect(page.getByRole('button', { name: 'Composer options' })).toContainText('Context off')

  await activateAgentConversation(request, threadOneID)
  await page.reload()
  await page.getByRole('button', { name: 'Toggle AI panel' }).click()

  await expect
    .poll(async () => {
      const conversation = await fetchAgentConversation(request)
      return {
        id: conversation.id,
        preferences: conversation.context_preferences,
      }
    })
    .toMatchObject({
      id: threadOneID,
      preferences: {
        widget_context_enabled: true,
        widget_ids: ['term-main'],
      },
    })
  await expect(page.getByRole('button', { name: 'Composer options' })).toContainText('1 widget')
  await page.getByRole('button', { name: 'Composer options' }).click()
  await expect(
    page.getByRole('option', {
      name: /Main Shell/,
    }),
  ).toBeVisible()

  await activateAgentConversation(request, activeConversationID)
  await page.reload()
  await page.getByRole('button', { name: 'Toggle AI panel' }).click()

  await expect
    .poll(async () => {
      const conversation = await fetchAgentConversation(request)
      return {
        id: conversation.id,
        preferences: conversation.context_preferences,
      }
    })
    .toMatchObject({
      id: activeConversationID,
      preferences: {
        widget_context_enabled: false,
        widget_ids: [],
      },
    })
  await expect(page.getByRole('button', { name: 'Composer options' })).toContainText('Context off')
})

test('AI sidebar repairs stale persisted widget context selections', async ({ page, request }) => {
  test.setTimeout(90_000)

  const conversation = await createConversationViaApi(request)
  await updateAgentConversationContext(request, conversation.id, {
    widget_context_enabled: true,
    widget_ids: ['term-main', 'missing-widget-a', 'missing-widget-b'],
  })
  await activateAgentConversation(request, conversation.id)

  await clearBrowserState(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Toggle AI panel' }).click({ force: true })
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()
  await expect(
    page.getByText('2 saved widgets are no longer available in this workspace.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Save cleaned context' }).click()

  await page.getByRole('button', { name: 'Composer options' }).click()
  await expect(page.getByRole('dialog', { name: 'Context widgets' })).toBeVisible()
  await expect(
    page.getByText('2 saved widgets are no longer available in this workspace.'),
  ).toHaveCount(0)

  await expect
    .poll(async () => {
      const activeConversation = await fetchAgentConversation(request)
      return activeConversation.context_preferences.widget_ids
    })
    .toEqual(['term-main'])
  await expect(page.getByText('2 saved widgets are no longer available in this workspace.')).toHaveCount(0)
})

test('AI composer submit shortcut can be changed from settings', async ({ page }) => {
  test.setTimeout(60_000)

  const capturedStreamBodies: Array<Record<string, unknown>> = []
  const shortcutAssistantMessage = {
    id: 'msg_shortcuts',
    role: 'assistant',
    content: 'shortcut-mode-ok',
    status: 'complete',
    provider: 'stub',
    model: 'stub-model',
    created_at: '2026-04-24T10:05:01Z',
  }

  await page.route('**/api/v1/agent/conversation', async (route) => {
    if (route.request().method() !== 'GET' || capturedStreamBodies.length === 0) {
      await route.continue()
      return
    }

    const response = await route.fetch()
    const payload = (await response.json()) as {
      conversation?: { messages?: Array<Record<string, unknown>> }
    }
    const conversation = payload.conversation ?? {}
    const messages = Array.isArray(conversation.messages) ? [...conversation.messages] : []
    const hasShortcutMessage = messages.some(
      (message) => typeof message.content === 'string' && message.content.includes('shortcut-mode-ok'),
    )

    if (!hasShortcutMessage) {
      messages.push(shortcutAssistantMessage)
    }

    await route.fulfill({
      response,
      json: {
        ...payload,
        conversation: {
          ...conversation,
          messages,
        },
      },
    })
  })

  await page.route('**/api/v1/agent/conversation/messages/stream', async (route) => {
    capturedStreamBodies.push(route.request().postDataJSON() as Record<string, unknown>)

    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
      },
      body: [
        'event: message-start\ndata: {"type":"message-start","message_id":"msg_shortcuts","message":{"id":"msg_shortcuts","role":"assistant","content":"","status":"streaming","provider":"stub","model":"stub-model","created_at":"2026-04-24T10:05:00Z"}}\n\n',
        `event: message-complete\ndata: ${JSON.stringify({
          type: 'message-complete',
          message_id: 'msg_shortcuts',
          message: shortcutAssistantMessage,
        })}\n\n`,
      ].join(''),
    })
  })

  await clearBrowserState(page)
  await page.goto('/')

  await page.getByRole('button', { name: 'Open settings panel' }).click()
  await page.getByRole('button', { name: 'Composer Поведение Enter / Shift+Enter в чате.' }).click()
  await page
    .getByRole('radio', {
      name: /^Ctrl\/Cmd\+Enter sends Plain Enter inserts a new line\.$/,
    })
    .check()
  await page.getByRole('button', { name: 'Close Settings' }).click()

  await page.getByRole('button', { name: 'Toggle AI panel' }).click()
  await expect(page.getByText('AI Rune Assistant')).toBeVisible()

  const composer = page.getByPlaceholder('Text Area')
  await composer.fill('shortcut setting smoke')
  await composer.evaluate((element) => {
    const textarea = element as HTMLTextAreaElement
    const cursor = textarea.value.length
    textarea.setSelectionRange(cursor, cursor)
  })
  await composer.press('Enter')

  await expect.poll(() => capturedStreamBodies.length).toBe(0)
  await expect(composer).toHaveValue('shortcut setting smoke\n')
  await composer.pressSequentially('second line')
  await expect(composer).toHaveValue('shortcut setting smoke\nsecond line')

  await composer.press('Control+Enter')

  await expect.poll(() => capturedStreamBodies.length, { timeout: 15_000 }).toBe(1)
  expect(capturedStreamBodies[0]).toMatchObject({
    prompt: 'shortcut setting smoke\nsecond line',
  })

  await expect(page.getByText('shortcut-mode-ok')).toBeVisible({ timeout: 15_000 })
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

  const claudeConversation = await createConversationViaApi(request)
  await activateAgentConversation(request, claudeConversation.id)

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
