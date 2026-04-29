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
  explainAndFixPromptIntro: string
  explainAndFixTitle: string
  explainAndFixUnavailableTitle: string
  explainLatestCommandPromptIntro: string
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
  responseLanguageInstruction: string
  resumeSession: string
  runningCommand: string
  sessionLabel: (index: number) => string
  terminalSource: string
  terminalCommandApprovalInstruction: string
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
  explainAndFixPromptIntro: 'Review and help explain and fix the latest error in this terminal.',
  explainAndFixTitle: 'Open AI and explain/fix the latest visible terminal issue',
  explainAndFixUnavailableTitle: 'No terminal issue or output is available yet',
  explainLatestCommandPromptIntro:
    'Explain the result of the latest terminal command and suggest the next practical step.',
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
  responseLanguageInstruction: 'Respond in English.',
  resumeSession: 'Resume session',
  runningCommand: 'Running...',
  sessionLabel: (index) => `Session ${index}`,
  terminalSource: 'Terminal',
  terminalCommandApprovalInstruction:
    'If fixing requires commands, plan them first and run them only in this terminal after approval.',
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
  explainAndFixPromptIntro: 'Проверь и помоги объяснить и исправить последнюю ошибку в этом терминале.',
  explainAndFixTitle: 'Открыть AI и разобрать последнюю видимую проблему терминала',
  explainAndFixUnavailableTitle: 'В терминале пока нет проблемы или вывода',
  explainLatestCommandPromptIntro:
    'Объясни результат последней terminal command и предложи следующий практический шаг.',
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
  responseLanguageInstruction: 'Отвечай на русском.',
  resumeSession: 'Возобновить сессию',
  runningCommand: 'Запуск...',
  sessionLabel: (index) => `Сессия ${index}`,
  terminalSource: 'Терминал',
  terminalCommandApprovalInstruction:
    'Если для исправления нужны команды, сначала спланируй их и выполняй только в этом терминале после approval.',
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

const terminalWidgetCopyEs: TerminalWidgetCopy = {
  activeSession: 'activa',
  aiLinked: 'Vinculado con IA',
  browseSessions: 'Sesiones',
  browseSessionsAria: (title) => `Abrir sesiones agrupadas del terminal para ${title}`,
  browseSessionsTitle: 'Revisar, filtrar, enfocar o cerrar sesiones agrupadas',
  closeSession: 'Cerrar',
  closeSessionAria: (index, title) => `Cerrar la sesión de terminal ${index} para ${title}`,
  connectionLocal: 'Local',
  connectionSSH: 'SSH',
  createSessionAria: (title) => `Crear otra sesión de terminal para ${title}`,
  createSessionTitle: 'Crear una nueva sesión gestionada por el backend en este widget de terminal',
  creatingSession: 'Creando...',
  explainAndFix: 'Explicar',
  explainAndFixAria: (title) => `Explicar y corregir el último problema del terminal para ${title}`,
  explainAndFixLoading: 'Cargando...',
  explainAndFixPromptIntro: 'Revisa y ayuda a explicar y corregir el último error en este terminal.',
  explainAndFixTitle: 'Abrir IA y explicar/corregir el último problema visible del terminal',
  explainAndFixUnavailableTitle: 'Todavía no hay problemas ni salida disponible en el terminal',
  explainLatestCommandPromptIntro:
    'Explica el resultado del último comando del terminal y sugiere el siguiente paso práctico.',
  explainCommand: 'Explicar comando',
  explainCommandAria: (title) => `Explicar el último comando para ${title}`,
  explainingCommand: 'Explicando...',
  filterSessionsAria: 'Filtrar sesiones agrupadas del terminal',
  filterSessionsPlaceholder: 'Filtrar por cwd, shell o destino tmux',
  focusSession: 'Enfocar',
  focusSessionAria: (index, title) => `Enfocar la sesión de terminal ${index} para ${title}`,
  focusSessionFromBrowserAria: (index, title) =>
    `Enfocar la sesión de terminal ${index} desde la lista para ${title}`,
  hideSessions: 'Ocultar sesiones',
  interruptAria: (title) => `Interrumpir terminal para ${title}`,
  interruptTitle: 'Interrumpir terminal',
  interruptingTitle: 'Interrumpiendo terminal...',
  lastExplain: (summary) => `Última explicación: ${summary}`,
  latestCommand: 'Último comando',
  latestCommandLoadError: 'No se pudo cargar el último comando del terminal.',
  noCommandObserved: 'Todavía no se ha detectado ningún comando enviado en esta sesión de terminal.',
  noSessionsMatch: 'Ninguna sesión agrupada coincide con el filtro actual.',
  newSession: 'Nueva sesión',
  reconnectShell: 'Reconectar shell',
  reconnectStream: 'Reconectar stream',
  recoverLocalTitle: 'Recuperar la sesión de shell local actual',
  recoverSessionAria: (title) => `Recuperar sesión de terminal para ${title}`,
  recoverSSHTitle: 'Recuperar la shell SSH actual contra el mismo destino de terminal',
  recoverStreamTitle: 'Reconectar el stream vivo del terminal sin reiniciar la shell',
  refreshing: 'Actualizando...',
  rerun: 'Repetir',
  rerunCommandAria: (title) => `Repetir el último comando para ${title}`,
  rerunLatestCommandError: 'No se pudo repetir el último comando del terminal.',
  restartAria: (title) => `Reiniciar terminal para ${title}`,
  restartShell: 'Reiniciar shell',
  restartTitle: 'Reiniciar terminal',
  restartingTitle: 'Reiniciando terminal...',
  responseLanguageInstruction: 'Responde en español.',
  resumeSession: 'Reanudar sesión',
  runningCommand: 'Ejecutando...',
  sessionLabel: (index) => `Sesión ${index}`,
  terminalSource: 'Terminal',
  terminalCommandApprovalInstruction:
    'Si la corrección requiere comandos, planéalos primero y ejecútalos solo en este terminal después de la aprobación.',
  toolbar: {
    clearViewportAria: 'Limpiar área del terminal',
    closeSearchAria: 'Cerrar búsqueda en terminal',
    copySelectionAria: 'Copiar selección',
    findNextAria: 'Buscar siguiente coincidencia',
    findNextTitle: 'Siguiente coincidencia (Enter / F3 / Ctrl+G)',
    findPreviousAria: 'Buscar coincidencia anterior',
    findPreviousTitle: 'Coincidencia anterior (Shift+Enter / Shift+F3 / Shift+Ctrl+G)',
    jumpToLatestAria: 'Ir a la salida más reciente del terminal',
    noMatches: 'Sin coincidencias',
    pasteFromClipboardAria: 'Pegar desde el portapapeles',
    rendererDefault: 'Predeterminado',
    rendererWebgl: 'WebGL',
    searchInputAria: 'Buscar en la salida del terminal',
    searchInputPlaceholder: 'Buscar en la salida',
    searchResultsAria: 'Resultados de búsqueda del terminal',
    searchShortcutHint: 'Enter / F3',
    toggleSearchAria: 'Alternar búsqueda en terminal',
    typeQuery: 'Escribe una consulta',
  },
}

const terminalWidgetCopyZhCN: TerminalWidgetCopy = {
  activeSession: '活动',
  aiLinked: '已关联 AI',
  browseSessions: '会话',
  browseSessionsAria: (title) => `打开 ${title} 的分组终端会话`,
  browseSessionsTitle: '查看、筛选、聚焦或关闭分组会话',
  closeSession: '关闭',
  closeSessionAria: (index, title) => `关闭 ${title} 的终端会话 ${index}`,
  connectionLocal: '本地',
  connectionSSH: 'SSH',
  createSessionAria: (title) => `为 ${title} 创建另一个终端会话`,
  createSessionTitle: '在此终端 widget 中创建新的后端会话',
  creatingSession: '正在创建...',
  explainAndFix: '解释',
  explainAndFixAria: (title) => `解释并修复 ${title} 的最新终端问题`,
  explainAndFixLoading: '正在加载...',
  explainAndFixPromptIntro: '检查并帮助解释和修复此终端中的最新错误。',
  explainAndFixTitle: '打开 AI 并解释/修复最新可见终端问题',
  explainAndFixUnavailableTitle: '终端尚无可用问题或输出',
  explainLatestCommandPromptIntro: '解释最新终端命令的结果，并建议下一个实际步骤。',
  explainCommand: '解释命令',
  explainCommandAria: (title) => `解释 ${title} 的最新命令`,
  explainingCommand: '正在解释...',
  filterSessionsAria: '筛选分组终端会话',
  filterSessionsPlaceholder: '按 cwd、shell 或 tmux 目标筛选',
  focusSession: '聚焦',
  focusSessionAria: (index, title) => `聚焦 ${title} 的终端会话 ${index}`,
  focusSessionFromBrowserAria: (index, title) => `从列表聚焦 ${title} 的终端会话 ${index}`,
  hideSessions: '隐藏会话',
  interruptAria: (title) => `中断 ${title} 的终端`,
  interruptTitle: '中断终端',
  interruptingTitle: '正在中断终端...',
  lastExplain: (summary) => `上次解释: ${summary}`,
  latestCommand: '最新命令',
  latestCommandLoadError: '无法加载最新终端命令。',
  noCommandObserved: '此终端会话尚未检测到已提交的命令。',
  noSessionsMatch: '没有分组会话匹配当前筛选。',
  newSession: '新建会话',
  reconnectShell: '重新连接 shell',
  reconnectStream: '重新连接 stream',
  recoverLocalTitle: '恢复当前本地 shell 会话',
  recoverSessionAria: (title) => `恢复 ${title} 的终端会话`,
  recoverSSHTitle: '针对同一终端目标恢复当前 SSH shell',
  recoverStreamTitle: '不重启 shell，重新连接实时终端 stream',
  refreshing: '正在刷新...',
  rerun: '重新运行',
  rerunCommandAria: (title) => `重新运行 ${title} 的最新命令`,
  rerunLatestCommandError: '无法重新运行最新终端命令。',
  restartAria: (title) => `重启 ${title} 的终端`,
  restartShell: '重启 shell',
  restartTitle: '重启终端',
  restartingTitle: '正在重启终端...',
  responseLanguageInstruction: '请用简体中文回答。',
  resumeSession: '恢复会话',
  runningCommand: '正在运行...',
  sessionLabel: (index) => `会话 ${index}`,
  terminalSource: '终端',
  terminalCommandApprovalInstruction: '如果修复需要命令，请先规划，并在获得批准后只在此终端中执行。',
  toolbar: {
    clearViewportAria: '清空终端视图',
    closeSearchAria: '关闭终端搜索',
    copySelectionAria: '复制选中内容',
    findNextAria: '查找下一个匹配项',
    findNextTitle: '下一个匹配项 (Enter / F3 / Ctrl+G)',
    findPreviousAria: '查找上一个匹配项',
    findPreviousTitle: '上一个匹配项 (Shift+Enter / Shift+F3 / Shift+Ctrl+G)',
    jumpToLatestAria: '跳转到最新终端输出',
    noMatches: '没有匹配项',
    pasteFromClipboardAria: '从剪贴板粘贴',
    rendererDefault: '默认',
    rendererWebgl: 'WebGL',
    searchInputAria: '搜索终端输出',
    searchInputPlaceholder: '搜索输出',
    searchResultsAria: '终端搜索结果',
    searchShortcutHint: 'Enter / F3',
    toggleSearchAria: '切换终端搜索',
    typeQuery: '输入查询',
  },
}

export const terminalWidgetCopy: LocalizedCopy<TerminalWidgetCopy> = {
  en: terminalWidgetCopyEn,
  ru: terminalWidgetCopyRu,
  es: terminalWidgetCopyEs,
  'zh-CN': terminalWidgetCopyZhCN,
}
