import { describe, expect, it, vi } from 'vitest'

import {
  resolveTerminalExecutionTargetForPanel,
  runApprovedExecutionPlanForPanel,
  runTerminalPromptForPanel,
} from '@/features/agent/model/agent-panel-execution'

describe('agent panel execution helpers', () => {
  it('resolves the execution target from selected context widgets', async () => {
    await expect(
      resolveTerminalExecutionTargetForPanel(
        {
          activeWidgetHostId: 'ai-main',
          contextWidgetOptions: [{ value: 'term-pve', label: 'PVE Shell' }],
          hasLoadedContextWidgets: true,
          isWidgetContextEnabled: true,
          loadContextWidgets: vi.fn(),
          resolveCurrentContextWidgetID: vi.fn().mockReturnValue('term-pve'),
          storedContextWidgetIDs: ['term-pve'],
          terminalPanelBindings: {
            host: {
              runtimeWidgetId: 'term-local',
              preset: 'main',
            },
          } as never,
          workspaceActiveWidgetID: 'term-pve',
          workspaceWidgets: [
            {
              id: 'term-pve',
              kind: 'terminal',
              title: 'PVE Shell',
            },
          ] as never,
        },
        {
          createApprovalMessage: vi.fn(),
          createPlanMessage: vi.fn(),
          deduplicateWidgetIDs: vi.fn((ids: string[]) => [...new Set(ids.filter(Boolean))]),
          executeAgentTool: vi.fn(),
          explainTerminalCommand: vi.fn(),
          fetchTerminalSnapshot: vi.fn().mockResolvedValue({
            state: {
              connection_kind: 'ssh',
              connection_id: 'conn-pve',
            },
            next_seq: 12,
          }),
          filterContextWidgetSelection: vi.fn((ids: string[]) => ids),
          getApprovalToken: vi.fn(),
          getRunCommand: vi.fn(),
          planTerminalCommand: vi.fn(),
          resolveContextTerminalWidget: vi.fn().mockReturnValue({
            id: 'term-pve',
            title: 'PVE Shell',
          }),
          resolveTerminalPanelBinding: vi.fn().mockReturnValue({
            runtimeWidgetId: 'term-local',
            preset: 'main',
          }),
          sortMessagesBySortKey: vi.fn(),
          targetSessionForConnectionKind: vi.fn().mockReturnValue('remote'),
          waitForTerminalOutput: vi.fn(),
        },
      ),
    ).resolves.toEqual({
      baselineNextSeq: 12,
      targetConnectionID: 'conn-pve',
      targetSession: 'remote',
      targetWidgetID: 'term-pve',
    })
  })

  it('queues approval flow for /run prompts that require confirmation', async () => {
    const setInteractionMessages = vi.fn((updater: (messages: unknown[]) => unknown[]) => updater([]))
    const setPendingFlow = vi.fn()
    const setPendingFlowRef = vi.fn()

    await expect(
      runTerminalPromptForPanel(
        {
          applyConversationSnapshot: vi.fn(),
          createConversationContext: vi.fn(),
          hostId: 'ai-main',
          nextFlowSequence: () => 3,
          nextLocalSortKey: vi.fn().mockReturnValue(101),
          prompt: '/run df -h',
          refreshConversationList: vi.fn(),
          repoRoot: '/repo',
          resolveTerminalExecutionTarget: vi.fn().mockResolvedValue({
            baselineNextSeq: 12,
            targetConnectionID: 'local',
            targetSession: 'local',
            targetWidgetID: 'term-main',
          }),
          setInteractionMessages,
          setPendingFlow,
          setPendingFlowRef,
          setSubmitError: vi.fn(),
        },
        {
          createApprovalMessage: vi
            .fn()
            .mockReturnValue({ id: 'approval-1', sortKey: 102, type: 'approval' }),
          createPlanMessage: vi.fn().mockReturnValue({ id: 'plan-1', sortKey: 101, type: 'plan' }),
          deduplicateWidgetIDs: vi.fn(),
          executeAgentTool: vi.fn().mockResolvedValue({
            status: 'requires_confirmation',
            pending_approval: {
              id: 'approve-1',
              summary: 'Run df -h',
            },
          }),
          explainTerminalCommand: vi.fn(),
          fetchTerminalSnapshot: vi.fn(),
          filterContextWidgetSelection: vi.fn(),
          getApprovalToken: vi.fn(),
          getRunCommand: vi.fn().mockReturnValue('df -h'),
          planTerminalCommand: vi.fn(),
          resolveContextTerminalWidget: vi.fn(),
          resolveTerminalPanelBinding: vi.fn(),
          sortMessagesBySortKey: vi.fn((messages: unknown[]) => messages),
          targetSessionForConnectionKind: vi.fn(),
          waitForTerminalOutput: vi.fn(),
        },
      ),
    ).resolves.toBe(true)

    expect(setPendingFlowRef).toHaveBeenCalledOnce()
    expect(setPendingFlow).toHaveBeenCalledOnce()
    expect(setInteractionMessages).toHaveBeenCalledOnce()
  })

  it('confirms and executes planned terminal commands before explanation', async () => {
    const executeAgentTool = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'requires_confirmation',
        pending_approval: {
          id: 'approval-1',
        },
      })
      .mockResolvedValueOnce({
        status: 'ok',
        output: {
          approval_token: 'grant-1',
        },
      })
      .mockResolvedValueOnce({
        status: 'ok',
      })
    const applyConversationSnapshot = vi.fn()
    const refreshConversationList = vi.fn().mockResolvedValue(null)
    const setSubmitError = vi.fn()

    await runApprovedExecutionPlanForPanel(
      {
        applyConversationSnapshot,
        createConversationContext: vi.fn().mockReturnValue({
          action_source: 'frontend.ai.sidebar.execute',
          active_widget_id: 'term-main',
          repo_root: '/repo',
          widget_context_enabled: true,
        }),
        createToolExecutionContext: vi.fn().mockReturnValue({
          action_source: 'frontend.ai.sidebar.execute',
          active_widget_id: 'term-main',
          repo_root: '/repo',
        }),
        prompt: 'check disk usage',
        refreshConversationList,
        repoRoot: '/repo',
        resolveTerminalExecutionTarget: vi.fn().mockResolvedValue({
          baselineNextSeq: 5,
          targetConnectionID: 'local',
          targetSession: 'local',
          targetWidgetID: 'term-main',
        }),
        setSubmitError,
      },
      {
        createApprovalMessage: vi.fn(),
        createPlanMessage: vi.fn(),
        deduplicateWidgetIDs: vi.fn(),
        executeAgentTool,
        explainTerminalCommand: vi.fn().mockResolvedValue({
          conversation: {
            id: 'conv-1',
          },
          provider_error: '',
        }),
        fetchTerminalSnapshot: vi.fn(),
        filterContextWidgetSelection: vi.fn(),
        getApprovalToken: vi.fn().mockReturnValue('grant-1'),
        getRunCommand: vi.fn(),
        planTerminalCommand: vi.fn().mockResolvedValue({
          command: 'df -h',
        }),
        resolveContextTerminalWidget: vi.fn(),
        resolveTerminalPanelBinding: vi.fn(),
        sortMessagesBySortKey: vi.fn(),
        targetSessionForConnectionKind: vi.fn(),
        waitForTerminalOutput: vi.fn().mockResolvedValue(undefined),
      },
    )

    expect(executeAgentTool).toHaveBeenCalledTimes(3)
    expect(applyConversationSnapshot).toHaveBeenCalledWith({ id: 'conv-1' })
    expect(refreshConversationList).toHaveBeenCalledOnce()
    expect(setSubmitError).not.toHaveBeenCalled()
  })

  it('reports terminal input policy denial with an actionable message', async () => {
    const executeAgentTool = vi.fn().mockResolvedValue({
      error: 'capability_denied',
      error_code: 'policy_denied',
      operation: {
        required_capabilities: ['terminal:input'],
      },
      status: 'error',
      tool: {
        metadata: {
          capabilities: ['terminal:input'],
        },
      },
    })
    const explainTerminalCommand = vi.fn()

    await expect(
      runApprovedExecutionPlanForPanel(
        {
          applyConversationSnapshot: vi.fn(),
          createConversationContext: vi.fn().mockReturnValue({
            action_source: 'frontend.ai.sidebar.execute',
            active_widget_id: 'term-main',
            repo_root: '/repo',
            widget_context_enabled: true,
          }),
          createToolExecutionContext: vi.fn().mockReturnValue({
            action_source: 'frontend.ai.sidebar.execute',
            active_widget_id: 'term-main',
            repo_root: '/repo',
          }),
          prompt: 'check disk usage',
          refreshConversationList: vi.fn(),
          repoRoot: '/repo',
          resolveTerminalExecutionTarget: vi.fn().mockResolvedValue({
            baselineNextSeq: 5,
            targetConnectionID: 'local',
            targetSession: 'local',
            targetWidgetID: 'term-main',
          }),
          setSubmitError: vi.fn(),
        },
        {
          createApprovalMessage: vi.fn(),
          createPlanMessage: vi.fn(),
          deduplicateWidgetIDs: vi.fn(),
          executeAgentTool,
          explainTerminalCommand,
          fetchTerminalSnapshot: vi.fn(),
          filterContextWidgetSelection: vi.fn(),
          getApprovalToken: vi.fn(),
          getRunCommand: vi.fn(),
          planTerminalCommand: vi.fn().mockResolvedValue({
            command: 'df -h',
          }),
          resolveContextTerminalWidget: vi.fn(),
          resolveTerminalPanelBinding: vi.fn(),
          sortMessagesBySortKey: vi.fn(),
          targetSessionForConnectionKind: vi.fn(),
          waitForTerminalOutput: vi.fn(),
        },
      ),
    ).rejects.toThrow('terminal:input')

    expect(executeAgentTool).toHaveBeenCalledOnce()
    expect(explainTerminalCommand).not.toHaveBeenCalled()
  })
})
