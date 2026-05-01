import type { AppLocale } from '@/shared/api/runtime'
import type { AiAgentSelectionOption, ChatMode } from '@/features/agent/model/types'

type AiWidgetCopy = {
  chatModeLabels: Record<ChatMode, string>
  collapsed: {
    activeThread: string
    expandAriaLabel: string
    modePrefix: string
    noMessagesYet: string
    open: string
    panelAriaLabel: string
    title: string
  }
  agentModeLabels: Record<string, string>
}

const aiWidgetCopy: Record<AppLocale, AiWidgetCopy> = {
  en: {
    chatModeLabels: {
      chat: 'chat',
      dev: 'dev',
      debug: 'debug',
    },
    collapsed: {
      activeThread: 'Active thread',
      expandAriaLabel: 'Expand AI panel',
      modePrefix: 'Mode',
      noMessagesYet: 'No messages yet',
      open: 'Open',
      panelAriaLabel: 'AI work panel',
      title: 'AI work panel',
    },
    agentModeLabels: {
      debug: 'Debug',
      explore: 'Explore',
      implement: 'Implement',
      incident: 'Incident',
      ops: 'Ops',
      release: 'Release',
      review: 'Review',
      secure: 'Secure',
    },
  },
  ru: {
    chatModeLabels: {
      chat: 'чат',
      dev: 'разработка',
      debug: 'отладка',
    },
    collapsed: {
      activeThread: 'Активный диалог',
      expandAriaLabel: 'Развернуть AI-панель',
      modePrefix: 'Режим',
      noMessagesYet: 'Сообщений пока нет',
      open: 'Открыть',
      panelAriaLabel: 'Рабочая AI-панель',
      title: 'Рабочая AI-панель',
    },
    agentModeLabels: {
      debug: 'Отладка',
      explore: 'Исследование',
      implement: 'Реализация',
      incident: 'Инцидент',
      ops: 'Операции',
      release: 'Релиз',
      review: 'Ревью',
      secure: 'Безопасный',
    },
  },
  'zh-CN': {
    chatModeLabels: {
      chat: '聊天',
      dev: '开发',
      debug: '调试',
    },
    collapsed: {
      activeThread: '活动会话',
      expandAriaLabel: '展开 AI 面板',
      modePrefix: '模式',
      noMessagesYet: '还没有消息',
      open: '打开',
      panelAriaLabel: 'AI 工作面板',
      title: 'AI 工作面板',
    },
    agentModeLabels: {
      debug: '调试',
      explore: '探索',
      implement: '实现',
      incident: '事件',
      ops: '运维',
      release: '发布',
      review: '审查',
      secure: '安全',
    },
  },
  es: {
    chatModeLabels: {
      chat: 'chat',
      dev: 'desarrollo',
      debug: 'depurar',
    },
    collapsed: {
      activeThread: 'Conversación activa',
      expandAriaLabel: 'Expandir panel de IA',
      modePrefix: 'Modo',
      noMessagesYet: 'Sin mensajes todavía',
      open: 'Abrir',
      panelAriaLabel: 'Panel de trabajo IA',
      title: 'Panel de trabajo IA',
    },
    agentModeLabels: {
      debug: 'Depurar',
      explore: 'Explorar',
      implement: 'Implementar',
      incident: 'Incidente',
      ops: 'Operaciones',
      release: 'Lanzamiento',
      review: 'Revisión',
      secure: 'Seguro',
    },
  },
}

export function getAiWidgetCopy(locale: AppLocale) {
  return aiWidgetCopy[locale]
}

export function formatAiChatModeLabel(mode: ChatMode, locale: AppLocale) {
  return getAiWidgetCopy(locale).chatModeLabels[mode] ?? mode
}

export function localizeAiAgentModeOption(option: AiAgentSelectionOption, locale: AppLocale) {
  return {
    ...option,
    label: getAiWidgetCopy(locale).agentModeLabels[option.value] ?? option.label,
  }
}
