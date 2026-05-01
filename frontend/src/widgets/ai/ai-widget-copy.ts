import type { AppLocale } from '@/shared/api/runtime'
import type { AiAgentSelectionOption, ChatMode } from '@/features/agent/model/types'

type AiWidgetCopy = {
  chatModeLabels: Record<ChatMode, string>
  collapsed: {
    activeThread: string
    collapseAriaLabel: string
    expandAriaLabel: string
    modePrefix: string
    newConversation: string
    noMessagesYet: string
    noRoute: string
    open: string
    panelAriaLabel: string
    unchecked: string
    title: string
  }
  composer: {
    allWidgets: string
    attachments: string
    cancelResponseAriaLabel: string
    composerOptionsAriaLabel: string
    contextBadge: (count: number) => string
    contextBadgeOff: string
    contextOff: string
    contextWidgets: string
    contextWidgetsDialog: string
    current: string
    currentPrefix: string
    deleteStoredAttachmentAriaLabel: (name: string) => string
    excludedFromRequest: string
    missingSavedWidgets: (count: number) => string
    noActiveWidget: string
    noWidgetsSelected: string
    onlyCurrent: string
    recentAttachments: string
    recentAttachmentsLoading: string
    removeAttachmentAriaLabel: (name: string) => string
    removeContextAriaLabel: (name: string) => string
    requestContext: string
    reuseAttachmentAriaLabel: (name: string) => string
    saveCleanedContext: string
    searchWidgetsPlaceholder: string
    selected: string
    selectedCount: (count: number) => string
    selectedForRequest: string
    sendPromptAriaLabel: string
    tuneAriaLabel: string
    tuneDescription: string
    tuneFallback: string
    useCurrent: string
    useCurrentWidgetHint: string
    useDefault: string
    useWidgetContextDescription: string
    useWidgetContextLabel: string
    widgetCount: (count: number) => string
    widgetsLabel: string
    providerAriaLabel: string
    modelAriaLabel: string
    profileAriaLabel: string
    roleAriaLabel: string
    modeAriaLabel: string
  }
  conversation: {
    activeSummaryAriaLabel: string
    activeThread: string
    allScopeLabel: (count: number) => string
    allScopeAriaLabel: string
    archivedAtPrefix: string
    archivedBadge: string
    archivedScopeLabel: (count: number) => string
    archivedScopeAriaLabel: string
    archivedSection: string
    archivedThreadsSection: string
    archive: string
    archiveConversationAriaLabel: string
    archiveConversationTitle: string
    archiveRowAriaLabel: (title: string) => string
    cancel: string
    cancelDeleteAriaLabel: string
    cancelRenameAriaLabel: string
    confirmDeleteAriaLabel: string
    conversationLabel: string
    conversationListAriaLabel: string
    conversationMenuAriaLabel: string
    conversationNavigatorAriaLabel: string
    conversationTitleAriaLabel: string
    conversationsTitle: string
    createConversationAriaLabel: string
    delete: string
    deleteConversationAriaLabel: string
    deleteConversationDescription: string
    deleteConversationTitle: string
    deleteRowAriaLabel: (title: string) => string
    loadingConversations: string
    messageCount: (count: number) => string
    new: string
    newConversation: string
    noMatches: string
    openBadge: string
    openConversationAriaLabel: (title: string) => string
    openConversationDetailAriaLabel: (title: string, messageCount: string, updatedAt: string) => string
    openThreadsSection: string
    recentScopeLabel: (count: number) => string
    recentScopeAriaLabel: string
    recentThreadList: string
    recentSection: string
    rename: string
    renameActiveConversationTitle: string
    renameConversationAriaLabel: string
    restore: string
    restoreConversationAriaLabel: string
    restoreConversationTitle: string
    restoreRowAriaLabel: (title: string) => string
    save: string
    saveConversationTitleAriaLabel: string
    searchConversationsAriaLabel: string
    searchConversationsPlaceholder: string
    shownCount: (count: number) => string
    threadCount: (count: number) => string
    unknownActivity: string
  }
  agentModeLabels: Record<string, string>
  route: {
    firstLatency: (ms: number) => string
    noTelemetry: string
    prepare: string
    prepareLatency: (ms: number) => string
    prepared: string
    probeLatency: (ms: number) => string
    ready: string
    refresh: string
    routeActionAriaLabel: string
    unchecked: string
  }
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
      collapseAriaLabel: 'Collapse AI panel',
      expandAriaLabel: 'Expand AI panel',
      modePrefix: 'Mode',
      newConversation: 'New conversation',
      noMessagesYet: 'No messages yet',
      noRoute: 'No route',
      open: 'Open',
      panelAriaLabel: 'AI work panel',
      unchecked: 'Unchecked',
      title: 'AI work panel',
    },
    composer: {
      allWidgets: 'All widgets',
      attachments: 'Attachments',
      cancelResponseAriaLabel: 'Cancel response',
      composerOptionsAriaLabel: 'Composer options',
      contextBadge: (count) => `${count} ctx`,
      contextBadgeOff: 'ctx off',
      contextOff: 'Context off',
      contextWidgets: 'Context widgets',
      contextWidgetsDialog: 'Context widgets',
      current: 'Current',
      currentPrefix: 'Current:',
      deleteStoredAttachmentAriaLabel: (name) => `Delete stored attachment ${name}`,
      excludedFromRequest: 'Excluded from request',
      missingSavedWidgets: (count) =>
        count === 1
          ? '1 saved widget is no longer available in this workspace.'
          : `${count} saved widgets are no longer available in this workspace.`,
      noActiveWidget: 'No active widget',
      noWidgetsSelected: 'No widgets selected',
      onlyCurrent: 'Only current',
      recentAttachments: 'Recent attachments',
      recentAttachmentsLoading: 'Recent attachments · loading',
      removeAttachmentAriaLabel: (name) => `Remove attachment ${name}`,
      removeContextAriaLabel: (name) => `Remove ${name} from request context`,
      requestContext: 'Request context',
      reuseAttachmentAriaLabel: (name) => `Reuse attachment ${name}`,
      saveCleanedContext: 'Save cleaned context',
      searchWidgetsPlaceholder: 'Search widgets',
      selected: 'Selected',
      selectedCount: (count) => `${count} widget${count === 1 ? '' : 's'} selected`,
      selectedForRequest: 'Selected for this request',
      sendPromptAriaLabel: 'Send prompt',
      tuneAriaLabel: 'Agent tuning',
      tuneDescription: 'Profile, role, and mode stay available without consuming the whole toolbar row.',
      tuneFallback: 'Tune',
      useCurrent: 'Use current',
      useCurrentWidgetHint: 'Use current widget or pick specific widgets',
      useDefault: 'Use default',
      useWidgetContextDescription: 'Include selected workspace widgets in the AI request context.',
      useWidgetContextLabel: 'Use widget context',
      widgetCount: (count) => (count === 1 ? '1 widget' : `${count} widgets`),
      widgetsLabel: 'Widgets',
      providerAriaLabel: 'AI provider',
      modelAriaLabel: 'AI model',
      profileAriaLabel: 'Agent profile',
      roleAriaLabel: 'Agent role',
      modeAriaLabel: 'Agent mode',
    },
    conversation: {
      activeSummaryAriaLabel: 'Active conversation summary',
      activeThread: 'Active thread',
      allScopeLabel: (count) => `All ${count}`,
      allScopeAriaLabel: 'Show all conversations',
      archivedAtPrefix: 'Archived',
      archivedBadge: 'Archived',
      archivedScopeLabel: (count) => `Archived ${count}`,
      archivedScopeAriaLabel: 'Show archived conversations',
      archivedSection: 'Archived',
      archivedThreadsSection: 'Archived threads',
      archive: 'Archive',
      archiveConversationAriaLabel: 'Archive conversation',
      archiveConversationTitle: 'Archive conversation',
      archiveRowAriaLabel: (title) => `Archive conversation ${title}`,
      cancel: 'Cancel',
      cancelDeleteAriaLabel: 'Cancel delete',
      cancelRenameAriaLabel: 'Cancel rename',
      confirmDeleteAriaLabel: 'Confirm delete conversation',
      conversationLabel: 'Conversation',
      conversationListAriaLabel: 'Conversation list',
      conversationMenuAriaLabel: 'Conversation menu',
      conversationNavigatorAriaLabel: 'Conversation navigator',
      conversationTitleAriaLabel: 'Conversation title',
      conversationsTitle: 'Conversations',
      createConversationAriaLabel: 'Create conversation',
      delete: 'Delete',
      deleteConversationAriaLabel: 'Delete conversation',
      deleteConversationDescription:
        'This removes the thread from the database and switches the panel to the next available conversation.',
      deleteConversationTitle: 'Delete conversation',
      deleteRowAriaLabel: (title) => `Delete conversation ${title}`,
      loadingConversations: 'Loading conversations',
      messageCount: (count) => (count === 1 ? '1 msg' : `${count} msgs`),
      new: 'New',
      newConversation: 'New conversation',
      noMatches: 'No conversations match this filter.',
      openBadge: 'Open',
      openConversationAriaLabel: (title) => `Open conversation ${title}`,
      openConversationDetailAriaLabel: (title, messageCount, updatedAt) =>
        `Open conversation ${title} · ${messageCount} · ${updatedAt}`,
      openThreadsSection: 'Open threads',
      recentScopeLabel: (count) => `Open ${count}`,
      recentScopeAriaLabel: 'Show recent conversations',
      recentThreadList: 'Recent thread list',
      recentSection: 'Recent',
      rename: 'Rename',
      renameActiveConversationTitle: 'Rename active conversation',
      renameConversationAriaLabel: 'Rename conversation',
      restore: 'Restore',
      restoreConversationAriaLabel: 'Restore conversation',
      restoreConversationTitle: 'Restore conversation',
      restoreRowAriaLabel: (title) => `Restore conversation ${title}`,
      save: 'Save',
      saveConversationTitleAriaLabel: 'Save conversation title',
      searchConversationsAriaLabel: 'Search conversations',
      searchConversationsPlaceholder: 'Search conversations',
      shownCount: (count) => `${count} shown`,
      threadCount: (count) => (count === 1 ? '1 thread' : `${count} threads`),
      unknownActivity: 'Unknown activity',
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
    route: {
      firstLatency: (ms) => `first ${ms}ms`,
      noTelemetry: 'No route telemetry yet',
      prepare: 'Prepare',
      prepareLatency: (ms) => `prepare ${ms}ms`,
      prepared: 'Prepared',
      probeLatency: (ms) => `probe ${ms}ms`,
      ready: 'Ready',
      refresh: 'Refresh',
      routeActionAriaLabel: 'Route action',
      unchecked: 'Unchecked',
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
      collapseAriaLabel: 'Свернуть AI-панель',
      expandAriaLabel: 'Развернуть AI-панель',
      modePrefix: 'Режим',
      newConversation: 'Новый диалог',
      noMessagesYet: 'Сообщений пока нет',
      noRoute: 'Маршрут не выбран',
      open: 'Открыть',
      panelAriaLabel: 'Рабочая AI-панель',
      unchecked: 'Не проверено',
      title: 'Рабочая AI-панель',
    },
    composer: {
      allWidgets: 'Все виджеты',
      attachments: 'Вложения',
      cancelResponseAriaLabel: 'Отменить ответ',
      composerOptionsAriaLabel: 'Параметры composer',
      contextBadge: (count) => `${count} конт.`,
      contextBadgeOff: 'конт. выкл.',
      contextOff: 'Контекст выключен',
      contextWidgets: 'Виджеты контекста',
      contextWidgetsDialog: 'Виджеты контекста',
      current: 'Текущий',
      currentPrefix: 'Текущий:',
      deleteStoredAttachmentAriaLabel: (name) => `Удалить сохраненное вложение ${name}`,
      excludedFromRequest: 'Не включается в запрос',
      missingSavedWidgets: (count) =>
        count === 1
          ? '1 сохраненный виджет больше недоступен в этом workspace.'
          : `${count} сохраненных виджетов больше недоступны в этом workspace.`,
      noActiveWidget: 'Нет активного виджета',
      noWidgetsSelected: 'Виджеты не выбраны',
      onlyCurrent: 'Только текущий',
      recentAttachments: 'Недавние вложения',
      recentAttachmentsLoading: 'Недавние вложения · загрузка',
      removeAttachmentAriaLabel: (name) => `Удалить вложение ${name}`,
      removeContextAriaLabel: (name) => `Убрать ${name} из контекста запроса`,
      requestContext: 'Контекст запроса',
      reuseAttachmentAriaLabel: (name) => `Использовать вложение ${name} повторно`,
      saveCleanedContext: 'Сохранить очищенный контекст',
      searchWidgetsPlaceholder: 'Поиск виджетов',
      selected: 'Выбрано',
      selectedCount: (count) => `${count} виджет${count === 1 ? '' : 'ов'} выбрано`,
      selectedForRequest: 'Выбрано для этого запроса',
      sendPromptAriaLabel: 'Отправить prompt',
      tuneAriaLabel: 'Настройка агента',
      tuneDescription: 'Профиль, роль и режим доступны без растягивания всей панели инструментов.',
      tuneFallback: 'Настройка',
      useCurrent: 'Использовать текущий',
      useCurrentWidgetHint: 'Используйте текущий виджет или выберите конкретные виджеты',
      useDefault: 'По умолчанию',
      useWidgetContextDescription: 'Включать выбранные workspace-виджеты в контекст AI-запроса.',
      useWidgetContextLabel: 'Использовать контекст виджетов',
      widgetCount: (count) => (count === 1 ? '1 виджет' : `${count} виджетов`),
      widgetsLabel: 'Виджеты',
      providerAriaLabel: 'AI-провайдер',
      modelAriaLabel: 'AI-модель',
      profileAriaLabel: 'Профиль агента',
      roleAriaLabel: 'Роль агента',
      modeAriaLabel: 'Режим агента',
    },
    conversation: {
      activeSummaryAriaLabel: 'Сводка активного диалога',
      activeThread: 'Активный диалог',
      allScopeLabel: (count) => `Все ${count}`,
      allScopeAriaLabel: 'Показать все диалоги',
      archivedAtPrefix: 'В архиве',
      archivedBadge: 'В архиве',
      archivedScopeLabel: (count) => `Архив ${count}`,
      archivedScopeAriaLabel: 'Показать архивные диалоги',
      archivedSection: 'Архив',
      archivedThreadsSection: 'Архивные диалоги',
      archive: 'В архив',
      archiveConversationAriaLabel: 'Архивировать диалог',
      archiveConversationTitle: 'Архивировать диалог',
      archiveRowAriaLabel: (title) => `Архивировать диалог ${title}`,
      cancel: 'Отмена',
      cancelDeleteAriaLabel: 'Отменить удаление',
      cancelRenameAriaLabel: 'Отменить переименование',
      confirmDeleteAriaLabel: 'Подтвердить удаление диалога',
      conversationLabel: 'Диалог',
      conversationListAriaLabel: 'Список диалогов',
      conversationMenuAriaLabel: 'Меню диалогов',
      conversationNavigatorAriaLabel: 'Навигатор диалогов',
      conversationTitleAriaLabel: 'Название диалога',
      conversationsTitle: 'Диалоги',
      createConversationAriaLabel: 'Создать диалог',
      delete: 'Удалить',
      deleteConversationAriaLabel: 'Удалить диалог',
      deleteConversationDescription:
        'Диалог будет удален из базы данных, а панель переключится на следующий доступный диалог.',
      deleteConversationTitle: 'Удалить диалог',
      deleteRowAriaLabel: (title) => `Удалить диалог ${title}`,
      loadingConversations: 'Загрузка диалогов',
      messageCount: (count) => (count === 1 ? '1 сообщение' : `${count} сообщений`),
      new: 'Новый',
      newConversation: 'Новый диалог',
      noMatches: 'Нет диалогов по этому фильтру.',
      openBadge: 'Открыт',
      openConversationAriaLabel: (title) => `Открыть диалог ${title}`,
      openConversationDetailAriaLabel: (title, messageCount, updatedAt) =>
        `Открыть диалог ${title} · ${messageCount} · ${updatedAt}`,
      openThreadsSection: 'Открытые диалоги',
      recentScopeLabel: (count) => `Открыто ${count}`,
      recentScopeAriaLabel: 'Показать недавние диалоги',
      recentThreadList: 'Список недавних диалогов',
      recentSection: 'Недавние',
      rename: 'Переименовать',
      renameActiveConversationTitle: 'Переименовать активный диалог',
      renameConversationAriaLabel: 'Переименовать диалог',
      restore: 'Восстановить',
      restoreConversationAriaLabel: 'Восстановить диалог',
      restoreConversationTitle: 'Восстановить диалог',
      restoreRowAriaLabel: (title) => `Восстановить диалог ${title}`,
      save: 'Сохранить',
      saveConversationTitleAriaLabel: 'Сохранить название диалога',
      searchConversationsAriaLabel: 'Поиск диалогов',
      searchConversationsPlaceholder: 'Поиск диалогов',
      shownCount: (count) => `показано ${count}`,
      threadCount: (count) => (count === 1 ? '1 диалог' : `${count} диалогов`),
      unknownActivity: 'Активность неизвестна',
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
    route: {
      firstLatency: (ms) => `первый ответ ${ms} мс`,
      noTelemetry: 'Телеметрии маршрута пока нет',
      prepare: 'Подготовить',
      prepareLatency: (ms) => `подготовка ${ms} мс`,
      prepared: 'Подготовлен',
      probeLatency: (ms) => `проверка ${ms} мс`,
      ready: 'Готов',
      refresh: 'Обновить',
      routeActionAriaLabel: 'Действие маршрута',
      unchecked: 'Не проверено',
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
      collapseAriaLabel: '折叠 AI 面板',
      expandAriaLabel: '展开 AI 面板',
      modePrefix: '模式',
      newConversation: '新会话',
      noMessagesYet: '还没有消息',
      noRoute: '未选择路由',
      open: '打开',
      panelAriaLabel: 'AI 工作面板',
      unchecked: '未检查',
      title: 'AI 工作面板',
    },
    composer: {
      allWidgets: '全部部件',
      attachments: '附件',
      cancelResponseAriaLabel: '取消响应',
      composerOptionsAriaLabel: '编写器选项',
      contextBadge: (count) => `${count} 上下文`,
      contextBadgeOff: '上下文关闭',
      contextOff: '上下文关闭',
      contextWidgets: '上下文部件',
      contextWidgetsDialog: '上下文部件',
      current: '当前',
      currentPrefix: '当前：',
      deleteStoredAttachmentAriaLabel: (name) => `删除已保存附件 ${name}`,
      excludedFromRequest: '不包含在请求中',
      missingSavedWidgets: (count) => `${count} 个已保存部件在此工作区中不再可用。`,
      noActiveWidget: '没有活动部件',
      noWidgetsSelected: '未选择部件',
      onlyCurrent: '仅当前',
      recentAttachments: '最近附件',
      recentAttachmentsLoading: '最近附件 · 加载中',
      removeAttachmentAriaLabel: (name) => `移除附件 ${name}`,
      removeContextAriaLabel: (name) => `从请求上下文中移除 ${name}`,
      requestContext: '请求上下文',
      reuseAttachmentAriaLabel: (name) => `复用附件 ${name}`,
      saveCleanedContext: '保存清理后的上下文',
      searchWidgetsPlaceholder: '搜索部件',
      selected: '已选择',
      selectedCount: (count) => `已选择 ${count} 个部件`,
      selectedForRequest: '已为此请求选择',
      sendPromptAriaLabel: '发送提示',
      tuneAriaLabel: '代理调优',
      tuneDescription: '配置文件、角色和模式保持可用，不占满整行工具栏。',
      tuneFallback: '调优',
      useCurrent: '使用当前',
      useCurrentWidgetHint: '使用当前部件或选择特定部件',
      useDefault: '使用默认值',
      useWidgetContextDescription: '在 AI 请求上下文中包含所选工作区部件。',
      useWidgetContextLabel: '使用部件上下文',
      widgetCount: (count) => `${count} 个部件`,
      widgetsLabel: '部件',
      providerAriaLabel: 'AI 提供方',
      modelAriaLabel: 'AI 模型',
      profileAriaLabel: '代理配置',
      roleAriaLabel: '代理角色',
      modeAriaLabel: '代理模式',
    },
    conversation: {
      activeSummaryAriaLabel: '活动会话摘要',
      activeThread: '活动会话',
      allScopeLabel: (count) => `全部 ${count}`,
      allScopeAriaLabel: '显示全部会话',
      archivedAtPrefix: '已归档',
      archivedBadge: '已归档',
      archivedScopeLabel: (count) => `已归档 ${count}`,
      archivedScopeAriaLabel: '显示已归档会话',
      archivedSection: '已归档',
      archivedThreadsSection: '已归档会话',
      archive: '归档',
      archiveConversationAriaLabel: '归档会话',
      archiveConversationTitle: '归档会话',
      archiveRowAriaLabel: (title) => `归档会话 ${title}`,
      cancel: '取消',
      cancelDeleteAriaLabel: '取消删除',
      cancelRenameAriaLabel: '取消重命名',
      confirmDeleteAriaLabel: '确认删除会话',
      conversationLabel: '会话',
      conversationListAriaLabel: '会话列表',
      conversationMenuAriaLabel: '会话菜单',
      conversationNavigatorAriaLabel: '会话导航器',
      conversationTitleAriaLabel: '会话标题',
      conversationsTitle: '会话',
      createConversationAriaLabel: '创建会话',
      delete: '删除',
      deleteConversationAriaLabel: '删除会话',
      deleteConversationDescription: '这会从数据库中移除此会话，并将面板切换到下一个可用会话。',
      deleteConversationTitle: '删除会话',
      deleteRowAriaLabel: (title) => `删除会话 ${title}`,
      loadingConversations: '正在加载会话',
      messageCount: (count) => `${count} 条消息`,
      new: '新建',
      newConversation: '新会话',
      noMatches: '没有匹配此筛选条件的会话。',
      openBadge: '打开',
      openConversationAriaLabel: (title) => `打开会话 ${title}`,
      openConversationDetailAriaLabel: (title, messageCount, updatedAt) =>
        `打开会话 ${title} · ${messageCount} · ${updatedAt}`,
      openThreadsSection: '打开的会话',
      recentScopeLabel: (count) => `打开 ${count}`,
      recentScopeAriaLabel: '显示最近会话',
      recentThreadList: '最近会话列表',
      recentSection: '最近',
      rename: '重命名',
      renameActiveConversationTitle: '重命名活动会话',
      renameConversationAriaLabel: '重命名会话',
      restore: '恢复',
      restoreConversationAriaLabel: '恢复会话',
      restoreConversationTitle: '恢复会话',
      restoreRowAriaLabel: (title) => `恢复会话 ${title}`,
      save: '保存',
      saveConversationTitleAriaLabel: '保存会话标题',
      searchConversationsAriaLabel: '搜索会话',
      searchConversationsPlaceholder: '搜索会话',
      shownCount: (count) => `显示 ${count}`,
      threadCount: (count) => `${count} 个会话`,
      unknownActivity: '未知活动',
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
    route: {
      firstLatency: (ms) => `首响应 ${ms} 毫秒`,
      noTelemetry: '暂无路由遥测',
      prepare: '准备',
      prepareLatency: (ms) => `准备 ${ms} 毫秒`,
      prepared: '已准备',
      probeLatency: (ms) => `探测 ${ms} 毫秒`,
      ready: '就绪',
      refresh: '刷新',
      routeActionAriaLabel: '路由操作',
      unchecked: '未检查',
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
      collapseAriaLabel: 'Contraer panel de IA',
      expandAriaLabel: 'Expandir panel de IA',
      modePrefix: 'Modo',
      newConversation: 'Nueva conversación',
      noMessagesYet: 'Sin mensajes todavía',
      noRoute: 'Sin ruta',
      open: 'Abrir',
      panelAriaLabel: 'Panel de trabajo IA',
      unchecked: 'Sin comprobar',
      title: 'Panel de trabajo IA',
    },
    composer: {
      allWidgets: 'Todos los widgets',
      attachments: 'Adjuntos',
      cancelResponseAriaLabel: 'Cancelar respuesta',
      composerOptionsAriaLabel: 'Opciones del composer',
      contextBadge: (count) => `${count} ctx`,
      contextBadgeOff: 'ctx desact.',
      contextOff: 'Contexto desactivado',
      contextWidgets: 'Widgets de contexto',
      contextWidgetsDialog: 'Widgets de contexto',
      current: 'Actual',
      currentPrefix: 'Actual:',
      deleteStoredAttachmentAriaLabel: (name) => `Eliminar adjunto guardado ${name}`,
      excludedFromRequest: 'Excluido de la solicitud',
      missingSavedWidgets: (count) =>
        count === 1
          ? '1 widget guardado ya no esta disponible en este workspace.'
          : `${count} widgets guardados ya no estan disponibles en este workspace.`,
      noActiveWidget: 'Sin widget activo',
      noWidgetsSelected: 'No hay widgets seleccionados',
      onlyCurrent: 'Solo actual',
      recentAttachments: 'Adjuntos recientes',
      recentAttachmentsLoading: 'Adjuntos recientes · cargando',
      removeAttachmentAriaLabel: (name) => `Quitar adjunto ${name}`,
      removeContextAriaLabel: (name) => `Quitar ${name} del contexto de la solicitud`,
      requestContext: 'Contexto de solicitud',
      reuseAttachmentAriaLabel: (name) => `Reutilizar adjunto ${name}`,
      saveCleanedContext: 'Guardar contexto limpio',
      searchWidgetsPlaceholder: 'Buscar widgets',
      selected: 'Seleccionado',
      selectedCount: (count) => `${count} widget${count === 1 ? '' : 's'} seleccionados`,
      selectedForRequest: 'Seleccionado para esta solicitud',
      sendPromptAriaLabel: 'Enviar prompt',
      tuneAriaLabel: 'Ajustes del agente',
      tuneDescription: 'El perfil, el rol y el modo siguen disponibles sin ocupar toda la fila.',
      tuneFallback: 'Ajustes',
      useCurrent: 'Usar actual',
      useCurrentWidgetHint: 'Usa el widget actual o elige widgets especificos',
      useDefault: 'Usar predeterminado',
      useWidgetContextDescription: 'Incluye widgets seleccionados del workspace en el contexto de IA.',
      useWidgetContextLabel: 'Usar contexto de widgets',
      widgetCount: (count) => (count === 1 ? '1 widget' : `${count} widgets`),
      widgetsLabel: 'Widgets',
      providerAriaLabel: 'Proveedor de IA',
      modelAriaLabel: 'Modelo de IA',
      profileAriaLabel: 'Perfil del agente',
      roleAriaLabel: 'Rol del agente',
      modeAriaLabel: 'Modo del agente',
    },
    conversation: {
      activeSummaryAriaLabel: 'Resumen de conversacion activa',
      activeThread: 'Conversación activa',
      allScopeLabel: (count) => `Todas ${count}`,
      allScopeAriaLabel: 'Mostrar todas las conversaciones',
      archivedAtPrefix: 'Archivada',
      archivedBadge: 'Archivada',
      archivedScopeLabel: (count) => `Archivadas ${count}`,
      archivedScopeAriaLabel: 'Mostrar conversaciones archivadas',
      archivedSection: 'Archivadas',
      archivedThreadsSection: 'Conversaciones archivadas',
      archive: 'Archivar',
      archiveConversationAriaLabel: 'Archivar conversación',
      archiveConversationTitle: 'Archivar conversación',
      archiveRowAriaLabel: (title) => `Archivar conversación ${title}`,
      cancel: 'Cancelar',
      cancelDeleteAriaLabel: 'Cancelar eliminacion',
      cancelRenameAriaLabel: 'Cancelar cambio de nombre',
      confirmDeleteAriaLabel: 'Confirmar eliminacion de conversacion',
      conversationLabel: 'Conversación',
      conversationListAriaLabel: 'Lista de conversaciones',
      conversationMenuAriaLabel: 'Menú de conversaciones',
      conversationNavigatorAriaLabel: 'Navegador de conversaciones',
      conversationTitleAriaLabel: 'Titulo de conversacion',
      conversationsTitle: 'Conversaciones',
      createConversationAriaLabel: 'Crear conversación',
      delete: 'Eliminar',
      deleteConversationAriaLabel: 'Eliminar conversación',
      deleteConversationDescription:
        'Esto elimina la conversacion de la base de datos y cambia el panel a la siguiente disponible.',
      deleteConversationTitle: 'Eliminar conversación',
      deleteRowAriaLabel: (title) => `Eliminar conversación ${title}`,
      loadingConversations: 'Cargando conversaciones',
      messageCount: (count) => (count === 1 ? '1 mensaje' : `${count} mensajes`),
      new: 'Nueva',
      newConversation: 'Nueva conversación',
      noMatches: 'Ninguna conversación coincide con este filtro.',
      openBadge: 'Abierta',
      openConversationAriaLabel: (title) => `Abrir conversación ${title}`,
      openConversationDetailAriaLabel: (title, messageCount, updatedAt) =>
        `Abrir conversación ${title} · ${messageCount} · ${updatedAt}`,
      openThreadsSection: 'Conversaciones abiertas',
      recentScopeLabel: (count) => `Abiertas ${count}`,
      recentScopeAriaLabel: 'Mostrar conversaciones recientes',
      recentThreadList: 'Lista de conversaciones recientes',
      recentSection: 'Recientes',
      rename: 'Renombrar',
      renameActiveConversationTitle: 'Renombrar conversación activa',
      renameConversationAriaLabel: 'Renombrar conversación',
      restore: 'Restaurar',
      restoreConversationAriaLabel: 'Restaurar conversación',
      restoreConversationTitle: 'Restaurar conversación',
      restoreRowAriaLabel: (title) => `Restaurar conversación ${title}`,
      save: 'Guardar',
      saveConversationTitleAriaLabel: 'Guardar titulo de conversacion',
      searchConversationsAriaLabel: 'Buscar conversaciones',
      searchConversationsPlaceholder: 'Buscar conversaciones',
      shownCount: (count) => `${count} visibles`,
      threadCount: (count) => (count === 1 ? '1 conversación' : `${count} conversaciones`),
      unknownActivity: 'Actividad desconocida',
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
    route: {
      firstLatency: (ms) => `primer ${ms} ms`,
      noTelemetry: 'Aún no hay telemetría de ruta',
      prepare: 'Preparar',
      prepareLatency: (ms) => `preparar ${ms} ms`,
      prepared: 'Preparada',
      probeLatency: (ms) => `probar ${ms} ms`,
      ready: 'Lista',
      refresh: 'Actualizar',
      routeActionAriaLabel: 'Acción de ruta',
      unchecked: 'Sin comprobar',
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
