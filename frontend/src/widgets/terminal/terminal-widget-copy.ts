import type { LocalizedCopy } from '@/features/i18n/model/localized-copy'
import type { TerminalToolbarCopy } from '@/shared/ui/components/terminal-toolbar'

export type TerminalWidgetCopy = {
  activeSession: string
  aiLinked: string
  browseSessions: string
  browseSessionsAria: (title: string) => string
  browseSessionsTitle: string
  closeSession: string
  closeSessionAria: (index: number, title: string) => string
  connectionLocal: string
  connectionSSH: string
  createSessionAria: (title: string) => string
  createSessionTitle: string
  creatingSession: string
  explainAndFix: string
  explainAndFixAria: (title: string) => string
  explainAndFixLoading: string
  explainAndFixTitle: string
  explainAndFixUnavailableTitle: string
  explainCommand: string
  explainCommandAria: (title: string) => string
  explainingCommand: string
  filterSessionsAria: string
  filterSessionsPlaceholder: string
  focusSession: string
  focusSessionAria: (index: number, title: string) => string
  focusSessionFromBrowserAria: (index: number, title: string) => string
  hideSessions: string
  interruptAria: (title: string) => string
  interruptTitle: string
  interruptingTitle: string
  lastExplain: (summary: string) => string
  latestCommand: string
  latestCommandLoadError: string
  noCommandObserved: string
  noSessionsMatch: string
  newSession: string
  reconnectShell: string
  reconnectStream: string
  recoverLocalTitle: string
  recoverSessionAria: (title: string) => string
  recoverSSHTitle: string
  recoverStreamTitle: string
  refreshing: string
  rerun: string
  rerunCommandAria: (title: string) => string
  rerunLatestCommandError: string
  restartAria: (title: string) => string
  restartShell: string
  restartTitle: string
  restartingTitle: string
  resumeSession: string
  runningCommand: string
  sessionLabel: (index: number) => string
  terminalSource: string
  toolbar: TerminalToolbarCopy
}

const terminalWidgetCopyEn: TerminalWidgetCopy = {
  activeSession: 'active',
  aiLinked: 'AI-linked',
  browseSessions: 'Browse sessions',
  browseSessionsAria: (title) => `Browse grouped terminal sessions for ${title}`,
  browseSessionsTitle: 'Inspect, filter, focus, or close grouped sessions in this terminal widget',
  closeSession: 'Close',
  closeSessionAria: (index, title) => `Close terminal session ${index} for ${title}`,
  connectionLocal: 'Local',
  connectionSSH: 'SSH',
  createSessionAria: (title) => `Create another terminal session for ${title}`,
  createSessionTitle: 'Create a new backend-owned session inside this terminal widget',
  creatingSession: 'Creating...',
  explainAndFix: 'Explain & fix',
  explainAndFixAria: (title) => `Explain and fix the latest terminal issue for ${title}`,
  explainAndFixLoading: 'Loading...',
  explainAndFixTitle: 'Open AI and explain/fix the latest visible terminal issue',
  explainAndFixUnavailableTitle: 'No terminal issue or output is available yet',
  explainCommand: 'Explain command',
  explainCommandAria: (title) => `Explain the latest command for ${title}`,
  explainingCommand: 'Explaining...',
  filterSessionsAria: 'Filter grouped terminal sessions',
  filterSessionsPlaceholder: 'Filter sessions by cwd, shell, or tmux target',
  focusSession: 'Focus',
  focusSessionAria: (index, title) => `Focus terminal session ${index} for ${title}`,
  focusSessionFromBrowserAria: (index, title) => `Focus terminal session ${index} from browser for ${title}`,
  hideSessions: 'Hide sessions',
  interruptAria: (title) => `Interrupt terminal for ${title}`,
  interruptTitle: 'Interrupt terminal',
  interruptingTitle: 'Interrupting terminal...',
  lastExplain: (summary) => `Last explain: ${summary}`,
  latestCommand: 'Latest command',
  latestCommandLoadError: 'Unable to load the latest terminal command.',
  noCommandObserved: 'No submitted command has been observed in this terminal session yet.',
  noSessionsMatch: 'No grouped sessions match the current filter.',
  newSession: 'New session',
  reconnectShell: 'Reconnect shell',
  reconnectStream: 'Reconnect stream',
  recoverLocalTitle: 'Recover the current local shell session',
  recoverSessionAria: (title) => `Recover terminal session for ${title}`,
  recoverSSHTitle: 'Recover the current SSH-backed shell against the same terminal target',
  recoverStreamTitle: 'Reconnect the live terminal output stream without restarting the shell',
  refreshing: 'Refreshing...',
  rerun: 'Re-run',
  rerunCommandAria: (title) => `Re-run the latest command for ${title}`,
  rerunLatestCommandError: 'Unable to rerun the latest terminal command.',
  restartAria: (title) => `Restart terminal for ${title}`,
  restartShell: 'Restart shell',
  restartTitle: 'Restart terminal',
  restartingTitle: 'Restarting terminal...',
  resumeSession: 'Resume session',
  runningCommand: 'Running...',
  sessionLabel: (index) => `Session ${index}`,
  terminalSource: 'Terminal',
  toolbar: {
    clearViewportAria: 'Clear terminal viewport',
    closeSearchAria: 'Close terminal search',
    copySelectionAria: 'Copy selection',
    findNextAria: 'Find next match',
    findNextTitle: 'Next match (Enter / F3 / Ctrl+G)',
    findPreviousAria: 'Find previous match',
    findPreviousTitle: 'Previous match (Shift+Enter / Shift+F3 / Shift+Ctrl+G)',
    jumpToLatestAria: 'Jump to latest terminal output',
    noMatches: 'No matches',
    pasteFromClipboardAria: 'Paste from clipboard',
    rendererDefault: 'Default',
    rendererWebgl: 'WebGL',
    searchInputAria: 'Search terminal output',
    searchInputPlaceholder: 'Search output',
    searchResultsAria: 'Terminal search results',
    searchShortcutHint: 'Enter / F3',
    toggleSearchAria: 'Toggle terminal search',
    typeQuery: 'Type query',
  },
}

const terminalWidgetCopyRu: TerminalWidgetCopy = {
  ...terminalWidgetCopyEn,
  activeSession: 'активна',
  aiLinked: 'Связано с AI',
  browseSessions: 'Сессии',
  browseSessionsAria: (title) => `Открыть список сгруппированных сессий терминала для ${title}`,
  browseSessionsTitle: 'Просмотреть, отфильтровать, сфокусировать или закрыть сгруппированные сессии',
  closeSession: 'Закрыть',
  closeSessionAria: (index, title) => `Закрыть сессию терминала ${index} для ${title}`,
  connectionLocal: 'Локально',
  createSessionAria: (title) => `Создать ещё одну сессию терминала для ${title}`,
  createSessionTitle: 'Создать новую backend-owned сессию в этом terminal widget',
  creatingSession: 'Создание...',
  explainAndFix: 'Объяснить',
  explainAndFixAria: (title) => `Объяснить и исправить последнюю проблему терминала для ${title}`,
  explainAndFixLoading: 'Загрузка...',
  explainAndFixTitle: 'Открыть AI и разобрать последнюю видимую проблему терминала',
  explainAndFixUnavailableTitle: 'В терминале пока нет проблемы или вывода',
  explainCommand: 'Объяснить команду',
  explainCommandAria: (title) => `Объяснить последнюю команду для ${title}`,
  explainingCommand: 'Объяснение...',
  filterSessionsAria: 'Фильтр сгруппированных сессий терминала',
  filterSessionsPlaceholder: 'Фильтр по cwd, shell или tmux target',
  focusSession: 'Фокус',
  focusSessionAria: (index, title) => `Сфокусировать сессию терминала ${index} для ${title}`,
  focusSessionFromBrowserAria: (index, title) =>
    `Сфокусировать сессию терминала ${index} из списка для ${title}`,
  hideSessions: 'Скрыть сессии',
  interruptAria: (title) => `Прервать терминал для ${title}`,
  interruptTitle: 'Прервать терминал',
  interruptingTitle: 'Прерывание терминала...',
  lastExplain: (summary) => `Последнее объяснение: ${summary}`,
  latestCommand: 'Последняя команда',
  latestCommandLoadError: 'Не удалось загрузить последнюю команду терминала.',
  noCommandObserved: 'В этой сессии терминала пока не обнаружена отправленная команда.',
  noSessionsMatch: 'Нет сгруппированных сессий под текущий фильтр.',
  newSession: 'Новая сессия',
  reconnectShell: 'Переподключить shell',
  reconnectStream: 'Переподключить stream',
  recoverLocalTitle: 'Восстановить текущую локальную shell session',
  recoverSessionAria: (title) => `Восстановить сессию терминала для ${title}`,
  recoverSSHTitle: 'Восстановить текущую SSH-backed shell для той же terminal target',
  recoverStreamTitle: 'Переподключить живой stream терминала без перезапуска shell',
  refreshing: 'Обновление...',
  rerun: 'Повторить',
  rerunCommandAria: (title) => `Повторить последнюю команду для ${title}`,
  rerunLatestCommandError: 'Не удалось повторить последнюю команду терминала.',
  restartAria: (title) => `Перезапустить терминал для ${title}`,
  restartShell: 'Перезапустить shell',
  restartTitle: 'Перезапустить терминал',
  restartingTitle: 'Перезапуск терминала...',
  resumeSession: 'Возобновить сессию',
  runningCommand: 'Запуск...',
  sessionLabel: (index) => `Сессия ${index}`,
  terminalSource: 'Терминал',
  toolbar: {
    clearViewportAria: 'Очистить область терминала',
    closeSearchAria: 'Закрыть поиск в терминале',
    copySelectionAria: 'Скопировать выделение',
    findNextAria: 'Найти следующее совпадение',
    findNextTitle: 'Следующее совпадение (Enter / F3 / Ctrl+G)',
    findPreviousAria: 'Найти предыдущее совпадение',
    findPreviousTitle: 'Предыдущее совпадение (Shift+Enter / Shift+F3 / Shift+Ctrl+G)',
    jumpToLatestAria: 'Перейти к последнему выводу терминала',
    noMatches: 'Нет совпадений',
    pasteFromClipboardAria: 'Вставить из буфера обмена',
    rendererDefault: 'Default',
    rendererWebgl: 'WebGL',
    searchInputAria: 'Поиск в выводе терминала',
    searchInputPlaceholder: 'Искать в выводе',
    searchResultsAria: 'Результаты поиска в терминале',
    searchShortcutHint: 'Enter / F3',
    toggleSearchAria: 'Переключить поиск в терминале',
    typeQuery: 'Введите запрос',
  },
}

export const terminalWidgetCopy: LocalizedCopy<TerminalWidgetCopy> = {
  en: terminalWidgetCopyEn,
  ru: terminalWidgetCopyRu,
  es: terminalWidgetCopyEn,
  'zh-CN': terminalWidgetCopyEn,
}
