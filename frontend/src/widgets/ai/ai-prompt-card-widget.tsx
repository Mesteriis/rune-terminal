import { Copy, FileText, RotateCcw, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'

import { RunaDomScopeProvider } from '@/shared/ui/dom-id'
import { IconButton } from '@/shared/ui/components'
import { Badge, Box, Surface, Text } from '@/shared/ui/primitives'

import type { AiPromptCardState } from '@/widgets/ai/ai-panel-widget.mock'
import {
  aiPromptApprovalCommandStyle,
  aiPromptApprovalListStyle,
  aiPromptApprovalMetaStyle,
  aiPromptApprovalRowStyle,
  aiPromptApprovalSectionStyle,
  aiPromptApprovalStatusBadgeStyle,
  aiPromptCardActionRowStyle,
  aiPromptCardActionStyle,
  aiPromptCardExpandedBodyStyle,
  aiPromptCardHeaderStyle,
  aiPromptCardPreviewStyle,
  aiPromptReasoningIndexStyle,
  aiPromptReasoningItemStyle,
  aiPromptReasoningSectionStyle,
  aiPromptReasoningListStyle,
  aiPromptReasoningTextStyle,
  aiPromptCardSectionLabelStyle,
  aiPromptCardSectionStyle,
  aiPromptCardSectionTextStyle,
  aiPromptCardTitleClusterStyle,
  aiPromptCardStyle,
  aiPromptPromptSectionStyle,
  aiPromptSubtitleStyle,
  aiPromptSectionHeaderStyle,
  aiPromptSummarySectionStyle,
  aiPromptTitleStyle,
} from '@/widgets/ai/ai-panel-widget.styles'

export type AiPromptCardWidgetProps = {
  prompt: AiPromptCardState
  defaultExpanded?: boolean
  forceExpanded?: boolean
}

export function AiPromptCardWidget({
  defaultExpanded = false,
  forceExpanded = false,
  prompt,
}: AiPromptCardWidgetProps) {
  const [isExpandedState, setIsExpandedState] = useState(defaultExpanded)
  const [isRollbackApplied, setIsRollbackApplied] = useState(false)

  const activeSnapshot = useMemo(() => {
    if (isRollbackApplied && prompt.rollback) {
      return prompt.rollback
    }

    return prompt.current
  }, [isRollbackApplied, prompt.current, prompt.rollback])
  const isExpanded = forceExpanded || isExpandedState

  const handleCopy = async (value: string) => {
    if (typeof navigator === 'undefined' || navigator.clipboard == null) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Keep this UI-only slice silent if clipboard access is unavailable.
    }
  }

  const handleToggleExpanded = () => {
    if (forceExpanded) {
      return
    }

    setIsExpandedState((value) => !value)
  }

  const handleToggleRollback = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (!prompt.rollback) {
      return
    }

    setIsRollbackApplied((value) => !value)
  }

  return (
    <RunaDomScopeProvider component={`ai-prompt-card-${prompt.id}`}>
      <Surface
      aria-expanded={isExpanded}
      role="button"
      runaComponent={`ai-prompt-card-${prompt.id}-surface`}
      style={aiPromptCardStyle}
      tabIndex={0}
      onClick={handleToggleExpanded}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleToggleExpanded()
        }
      }}
    >
      <Box runaComponent={`ai-prompt-card-${prompt.id}-header`} style={aiPromptCardHeaderStyle}>
        <Box runaComponent={`ai-prompt-card-${prompt.id}-title-cluster`} style={aiPromptCardTitleClusterStyle}>
          <Text runaComponent={`ai-prompt-card-${prompt.id}-title`} style={aiPromptTitleStyle}>{prompt.title}</Text>
          <Text runaComponent={`ai-prompt-card-${prompt.id}-subtitle`} style={aiPromptSubtitleStyle}>
            {isRollbackApplied ? 'Rollback snapshot' : 'Current snapshot'}
          </Text>
        </Box>
        <Box runaComponent={`ai-prompt-card-${prompt.id}-actions`} style={aiPromptCardActionRowStyle}>
          <IconButton
            aria-label={`Copy prompt for ${prompt.title}`}
            size="sm"
            runaComponent={`ai-prompt-card-${prompt.id}-copy-prompt`}
            style={aiPromptCardActionStyle}
            onClick={(event) => {
              event.stopPropagation()
              void handleCopy(activeSnapshot.prompt)
            }}
          >
            <Copy size={14} strokeWidth={1.8} />
          </IconButton>
          <IconButton
            aria-label={`Toggle rollback for ${prompt.title}`}
            size="sm"
            runaComponent={`ai-prompt-card-${prompt.id}-toggle-rollback`}
            style={aiPromptCardActionStyle}
            onClick={handleToggleRollback}
          >
            <RotateCcw size={14} strokeWidth={1.8} />
          </IconButton>
          <IconButton
            aria-label={`Copy summary for ${prompt.title}`}
            size="sm"
            runaComponent={`ai-prompt-card-${prompt.id}-copy-summary`}
            style={aiPromptCardActionStyle}
            onClick={(event) => {
              event.stopPropagation()
              void handleCopy(activeSnapshot.summary)
            }}
          >
            <FileText size={14} strokeWidth={1.8} />
          </IconButton>
        </Box>
      </Box>
      {!isExpanded ? (
        <Text runaComponent={`ai-prompt-card-${prompt.id}-preview`} style={aiPromptCardPreviewStyle}>{activeSnapshot.preview}</Text>
      ) : (
        <Box runaComponent={`ai-prompt-card-${prompt.id}-expanded-body`} style={aiPromptCardExpandedBodyStyle}>
          <Box runaComponent={`ai-prompt-card-${prompt.id}-prompt-section`} style={aiPromptPromptSectionStyle}>
            <Box runaComponent={`ai-prompt-card-${prompt.id}-prompt-section-header`} style={aiPromptSectionHeaderStyle}>
              <Text runaComponent={`ai-prompt-card-${prompt.id}-prompt-label`} style={aiPromptCardSectionLabelStyle}>Prompt</Text>
              <IconButton
                aria-label={`Copy prompt section for ${prompt.title}`}
                size="sm"
                runaComponent={`ai-prompt-card-${prompt.id}-prompt-copy`}
                style={aiPromptCardActionStyle}
                onClick={(event) => {
                  event.stopPropagation()
                  void handleCopy(activeSnapshot.prompt)
                }}
              >
                <Copy size={14} strokeWidth={1.8} />
              </IconButton>
            </Box>
            <Text runaComponent={`ai-prompt-card-${prompt.id}-prompt-text`} style={aiPromptCardSectionTextStyle}>{activeSnapshot.prompt}</Text>
          </Box>
          <Box runaComponent={`ai-prompt-card-${prompt.id}-reasoning-section`} style={aiPromptReasoningSectionStyle}>
            <Text runaComponent={`ai-prompt-card-${prompt.id}-reasoning-label`} style={aiPromptCardSectionLabelStyle}>Reasoning</Text>
            <Box runaComponent={`ai-prompt-card-${prompt.id}-reasoning-list`} style={aiPromptReasoningListStyle}>
              {activeSnapshot.reasoning.map((reasoningStep, index) => (
                <Box key={`${prompt.id}-reasoning-${index}`} runaComponent={`ai-prompt-card-${prompt.id}-reasoning-item-${index + 1}`} style={aiPromptReasoningItemStyle}>
                  <Badge runaComponent={`ai-prompt-card-${prompt.id}-reasoning-index-${index + 1}`} style={aiPromptReasoningIndexStyle}>{index + 1}</Badge>
                  <Text runaComponent={`ai-prompt-card-${prompt.id}-reasoning-text-${index + 1}`} style={aiPromptReasoningTextStyle}>{reasoningStep}</Text>
                </Box>
              ))}
            </Box>
          </Box>
          {activeSnapshot.approvals?.length ? (
            <Box runaComponent={`ai-prompt-card-${prompt.id}-approval-section`} style={aiPromptApprovalSectionStyle}>
              <Text runaComponent={`ai-prompt-card-${prompt.id}-approval-label`} style={aiPromptCardSectionLabelStyle}>Approval queue</Text>
              <Box runaComponent={`ai-prompt-card-${prompt.id}-approval-list`} style={aiPromptApprovalListStyle}>
                {activeSnapshot.approvals.map((approval) => (
                  <Box key={approval.id} runaComponent={`ai-prompt-card-${prompt.id}-approval-${approval.id}`} style={aiPromptApprovalRowStyle}>
                    <Box runaComponent={`ai-prompt-card-${prompt.id}-approval-${approval.id}-meta`} style={aiPromptApprovalMetaStyle}>
                      <Box runaComponent={`ai-prompt-card-${prompt.id}-approval-${approval.id}-title-wrap`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-sm)' }}>
                        <ShieldAlert size={14} strokeWidth={1.8} />
                        <Text runaComponent={`ai-prompt-card-${prompt.id}-approval-${approval.id}-title`} style={aiPromptCardSectionTextStyle}>{approval.title}</Text>
                      </Box>
                      <Badge runaComponent={`ai-prompt-card-${prompt.id}-approval-${approval.id}-status`} style={aiPromptApprovalStatusBadgeStyle}>{approval.status}</Badge>
                    </Box>
                    <Text runaComponent={`ai-prompt-card-${prompt.id}-approval-${approval.id}-command`} style={aiPromptApprovalCommandStyle}>{approval.command}</Text>
                    <Text runaComponent={`ai-prompt-card-${prompt.id}-approval-${approval.id}-scope`} style={aiPromptSubtitleStyle}>{approval.scope}</Text>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}
          <Box runaComponent={`ai-prompt-card-${prompt.id}-summary-section`} style={aiPromptSummarySectionStyle}>
            <Box runaComponent={`ai-prompt-card-${prompt.id}-summary-section-header`} style={aiPromptSectionHeaderStyle}>
              <Text runaComponent={`ai-prompt-card-${prompt.id}-summary-label`} style={aiPromptCardSectionLabelStyle}>Summary</Text>
              <IconButton
                aria-label={`Copy summary section for ${prompt.title}`}
                size="sm"
                runaComponent={`ai-prompt-card-${prompt.id}-summary-copy`}
                style={aiPromptCardActionStyle}
                onClick={(event) => {
                  event.stopPropagation()
                  void handleCopy(activeSnapshot.summary)
                }}
              >
                <Copy size={14} strokeWidth={1.8} />
              </IconButton>
            </Box>
            <Text runaComponent={`ai-prompt-card-${prompt.id}-summary-text`} style={aiPromptCardSectionTextStyle}>{activeSnapshot.summary}</Text>
          </Box>
        </Box>
      )}
      </Surface>
    </RunaDomScopeProvider>
  )
}
