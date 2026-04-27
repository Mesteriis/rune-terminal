import { describe, expect, it, vi } from 'vitest'

import {
  answerQuestionnaireForPanel,
  approvePendingPlanForPanel,
} from '@/features/agent/model/agent-panel-approval'

describe('agent panel approval helpers', () => {
  it('routes questionnaire answers back into chat execution when no tool plan is needed', async () => {
    const runBackendPrompt = vi.fn().mockResolvedValue(undefined)
    const clearPendingInteractionFlow = vi.fn()
    const setInteractionMessages = vi.fn((updater: (messages: any[]) => any[]) =>
      updater([
        {
          id: 'questionnaire-1',
          type: 'questionnaire',
        },
      ]),
    )

    await answerQuestionnaireForPanel(
      {
        answer: 'just explain it',
        clearPendingInteractionFlow,
        getPendingFlow: () =>
          ({
            flowID: 'flow-1',
            prompt: 'help',
            questionnaireMessageID: 'questionnaire-1',
            attachments: [{ id: 'att-1' }],
            tools: [],
          }) as never,
        hasTerminalExecutionContext: true,
        message: {
          id: 'questionnaire-1',
        } as never,
        nextLocalSortKey: vi.fn().mockReturnValue(10),
        runBackendPrompt,
        selectedModel: 'gpt-5',
        setInteractionMessages,
        setPendingFlow: vi.fn(),
        setPendingFlowRef: vi.fn(),
      },
      {
        classifyMessageIntent: vi.fn().mockReturnValue({ intent: 'chat' }),
        completeAuditEntries: vi.fn(),
        createApprovalMessage: vi.fn(),
        createAuditMessage: vi.fn(),
        createPlanMessage: vi.fn(),
        executeAgentTool: vi.fn(),
        failAuditEntries: vi.fn(),
        getApprovalToken: vi.fn(),
        getErrorMessage: vi.fn(),
        resolveRuntimeContext: vi.fn(),
        sortMessagesBySortKey: vi.fn((messages: any[]) => messages),
        updateApprovalMessageStatus: vi.fn(),
        updateQuestionnaireMessageAnswer: vi.fn().mockReturnValue({
          id: 'questionnaire-1',
          type: 'questionnaire',
          answer: 'just explain it',
        }),
      },
    )

    expect(setInteractionMessages).toHaveBeenCalledOnce()
    expect(clearPendingInteractionFlow).toHaveBeenCalledOnce()
    expect(runBackendPrompt).toHaveBeenCalledWith('help', {
      attachments: [{ id: 'att-1' }],
      model: 'gpt-5',
    })
  })

  it('builds a follow-up approval flow from questionnaire tool classification', async () => {
    const setPendingFlow = vi.fn()
    const setPendingFlowRef = vi.fn()

    await answerQuestionnaireForPanel(
      {
        answer: 'run diagnostics',
        clearPendingInteractionFlow: vi.fn(),
        getPendingFlow: () =>
          ({
            flowID: 'flow-1',
            prompt: 'help',
            questionnaireMessageID: 'questionnaire-1',
            attachments: [],
            tools: [],
          }) as never,
        hasTerminalExecutionContext: true,
        message: {
          id: 'questionnaire-1',
        } as never,
        nextLocalSortKey: vi.fn().mockReturnValue(10),
        runBackendPrompt: vi.fn(),
        setInteractionMessages: vi.fn((updater: (messages: any[]) => any[]) => updater([])),
        setPendingFlow,
        setPendingFlowRef,
      },
      {
        classifyMessageIntent: vi.fn().mockReturnValue({
          intent: 'tool_plan',
          tools: [{ name: 'execute_terminal', description: 'Run diagnostics' }],
        }),
        completeAuditEntries: vi.fn(),
        createApprovalMessage: vi.fn().mockReturnValue({ id: 'approval-1', type: 'approval' }),
        createAuditMessage: vi.fn(),
        createPlanMessage: vi.fn().mockReturnValue({ id: 'plan-1', type: 'plan' }),
        executeAgentTool: vi.fn(),
        failAuditEntries: vi.fn(),
        getApprovalToken: vi.fn(),
        getErrorMessage: vi.fn(),
        resolveRuntimeContext: vi.fn(),
        sortMessagesBySortKey: vi.fn((messages: any[]) => messages),
        updateApprovalMessageStatus: vi.fn(),
        updateQuestionnaireMessageAnswer: vi.fn().mockReturnValue({
          id: 'questionnaire-1',
          type: 'questionnaire',
          answer: 'run diagnostics',
        }),
      },
    )

    expect(setPendingFlowRef).toHaveBeenCalledOnce()
    expect(setPendingFlow).toHaveBeenCalledOnce()
  })

  it('confirms /run approvals before terminal execution and completes audit entries', async () => {
    const runApprovedTerminalPrompt = vi.fn().mockResolvedValue(undefined)
    const updateAuditMessageEntries = vi.fn()

    await approvePendingPlanForPanel(
      {
        blockAiWidget: vi.fn(),
        clearPendingInteractionFlow: vi.fn(),
        getPendingFlow: () =>
          ({
            flowID: 'flow-1',
            prompt: '/run df -h',
            tools: [{ name: 'term.send_input' }],
            runApproval: {
              approvalID: 'approval-1',
              targetWidgetID: 'term-main',
              repoRoot: '/repo',
              targetConnectionID: 'local',
              targetSession: 'local',
              baselineNextSeq: 5,
              command: 'df -h',
            },
          }) as never,
        hostId: 'ai-main',
        message: {
          id: 'approval-message-1',
          planId: 'flow-1',
        } as never,
        nextLocalSortKey: vi.fn().mockReturnValue(12),
        runApprovedExecutionPlan: vi.fn(),
        runApprovedTerminalPrompt,
        runBackendPrompt: vi.fn(),
        selectedModel: 'gpt-5',
        setInteractionMessages: vi.fn((updater: (messages: any[]) => any[]) => updater([])),
        setIsResponseCancellable: vi.fn(),
        setIsSubmitting: vi.fn(),
        setPendingFlow: vi.fn(),
        setPendingFlowRef: vi.fn(),
        setSubmitError: vi.fn(),
        unblockAiWidget: vi.fn(),
        updateAuditMessageEntries,
      },
      {
        classifyMessageIntent: vi.fn(),
        completeAuditEntries: vi.fn((entries: unknown[]) => [...entries, 'complete']),
        createApprovalMessage: vi.fn(),
        createAuditMessage: vi.fn().mockReturnValue({ id: 'audit-1', type: 'audit' }),
        createPlanMessage: vi.fn(),
        executeAgentTool: vi.fn().mockResolvedValue({
          status: 'ok',
          output: {
            approval_token: 'grant-1',
          },
        }),
        failAuditEntries: vi.fn((entries: unknown[]) => [...entries, 'failed']),
        getApprovalToken: vi.fn().mockReturnValue('grant-1'),
        getErrorMessage: vi.fn((error: unknown, fallback: string) =>
          error instanceof Error ? error.message : fallback,
        ),
        resolveRuntimeContext: vi.fn(),
        sortMessagesBySortKey: vi.fn((messages: any[]) => messages),
        updateApprovalMessageStatus: vi.fn().mockReturnValue({
          id: 'approval-message-1',
          type: 'approval',
          status: 'approved',
        }),
        updateQuestionnaireMessageAnswer: vi.fn(),
      },
    )

    expect(runApprovedTerminalPrompt).toHaveBeenCalledOnce()
    expect(updateAuditMessageEntries).toHaveBeenCalledOnce()
  })
})
