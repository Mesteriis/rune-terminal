import type { AppLocale } from '@/shared/api/runtime'

export type AgentProviderSettingsWidgetCopy = {
  active: string
  activate: string
  actor: string
  addProvider: (label: string) => string
  allowedUsers: string
  allProviders: string
  allowedUsersHint: string
  averageLatency: string
  baseUrl: string
  chatEnabledModels: (count: number) => string
  chatVisibility: string
  chooseProvider: string
  clearRouteState: string
  command: string
  commandHint: (command: string) => string
  completed: string
  description: string
  descriptionEmbedded: string
  configuredProviders: string
  connection: string
  conversation: string
  createProvider: string
  createdUpdated: (createdBy: string, updatedBy: string) => string
  currentActor: (actor: string) => string
  currentStatus: string
  defaultModel: string
  delete: string
  disabled: string
  disabledProviderHint: string
  displayName: string
  displayNamePlaceholder: string
  errorClass: string
  firstResponse: string
  gatewaySignals: string
  gatewaySignalsDescription: string
  gatewayTelemetryUnavailable: (message: string) => string
  historySearch: string
  historySearchHint: string
  historySearchPlaceholder: string
  historyWindow: string
  kind: (label: string, active: boolean) => string
  loading: string
  loadingModels: string
  loadingProviderActivity: string
  lastError: string
  loadMoreHistory: string
  manualOnly: string
  model: string
  modelCodexHint: string
  modelClaudeHint: string
  modelHttpHint: string
  noModelsLoaded: string
  noProviderActivity: string
  noProviderSelected: string
  noDiscoveredModelsEnabled: string
  noProviders: string
  ownerHint: string
  ownerUsername: string
  prepareOnActivate: string
  prepareOnAppStart: string
  preparing: string
  prewarmPolicy: string
  prewarmSectionDescription: string
  private: string
  probeLatency: string
  probeProviderRoute: string
  probing: string
  provider: string
  providerActivityUnavailable: (message: string) => string
  providerScope: string
  providerStatus: string
  providerVisibility: string
  ready: string
  recentProviderActivity: string
  recentProviderActivityDescription: string
  refresh: string
  requestMode: string
  reset: string
  resolvedBinary: string
  resolvedRoute: string
  routeChecked: string
  routePolicy: string
  routeState: string
  runDiagnostics: string
  runDiagnosticsDescription: string
  runs: (count: number) => string
  saveChanges: string
  saving: string
  selectedProvider: string
  shared: string
  showingRuns: (visible: number, total: number, offset: number) => string
  started: string
  status: string
  statusFilter: string
  statuses: {
    all: string
    authRequired: string
    cancelled: string
    cancelledOnly: string
    disabled: string
    failedOnly: string
    failing: string
    healthy: string
    loginRequired: string
    modelUnavailable: string
    needsAttention: string
    noRuns: string
    ready: string
    routeReady: string
    succeededOnly: string
    unchecked: string
    unreachable: string
  }
  suggestedRecovery: (label: string) => string
  title: string
  titleEmbedded: string
  totalDuration: string
  unknown: string
  unknownUntilProbed: string
  warmPolicy: string
  routeStats: (succeeded: number, total: number, averageDuration: string) => string
  ttl: string
  warmTtl: string
  warmTtlHint: string
  warmWindowEnds: (value: string) => string
}

export const agentProviderSettingsWidgetCopy: Record<AppLocale, AgentProviderSettingsWidgetCopy> = {
  en: {
    active: 'Active',
    activate: 'Activate',
    actor: 'Actor',
    addProvider: (label) => `Add ${label}`,
    allowedUsers: 'Allowed users',
    allProviders: 'All providers',
    allowedUsersHint: 'Comma-separated usernames for future shared-provider access control.',
    averageLatency: 'Average latency',
    baseUrl: 'Base URL',
    chatEnabledModels: (count) => `${count} models enabled for the chat toolbar.`,
    chatVisibility: 'Chat visibility',
    chooseProvider: 'Choose an existing provider on the left or create a new one.',
    clearRouteState: 'Clear route state',
    command: 'Command',
    commandHint: (command) => `Command name or absolute path. Defaults to ${command}.`,
    completed: 'Completed',
    description: 'Manage local Codex CLI and Claude Code CLI routing without leaving the shell modal.',
    descriptionEmbedded:
      'Connect CLI providers for chat and manage the active runtime without leaving settings sections.',
    configuredProviders: 'Configured providers',
    connection: 'Connection',
    conversation: 'Conversation',
    createProvider: 'Create provider',
    createdUpdated: (createdBy, updatedBy) => `Created by ${createdBy} · updated by ${updatedBy}`,
    currentActor: (actor) => `Current actor: ${actor}`,
    currentStatus: 'Current status',
    defaultModel: 'default model',
    delete: 'Delete',
    disabled: 'Disabled',
    disabledProviderHint: 'Disabled providers stay in the catalog but cannot become active.',
    displayName: 'Display name',
    displayNamePlaceholder: 'Provider display name',
    errorClass: 'Error class',
    firstResponse: 'First response',
    gatewaySignals: 'Gateway signals',
    gatewaySignalsDescription:
      'Backend-owned recent run history and health signals for the active provider route.',
    gatewayTelemetryUnavailable: (message) => `Gateway telemetry is unavailable: ${message}`,
    historySearch: 'History search',
    historySearchHint: 'Filter by provider, model, request mode, error, or conversation id.',
    historySearchPlaceholder: 'Search recent runs',
    historyWindow: 'History window',
    kind: (label, active) => `Kind: ${label}${active ? ' · currently active' : ''}`,
    loading: 'Loading provider catalog…',
    loadingModels: 'Loading…',
    loadingProviderActivity: 'Loading provider activity…',
    lastError: 'Last error',
    loadMoreHistory: 'Load more history',
    manualOnly: 'Manual only',
    model: 'Model',
    modelCodexHint: 'CLI model aliases are resolved by the local Codex CLI.',
    modelClaudeHint: 'Common Claude Code aliases are exposed locally; the CLI resolves exact model support.',
    modelHttpHint:
      'The backend reads `/v1/models` from this source and exposes enabled models in the chat toolbar.',
    noModelsLoaded: 'No models loaded',
    noProviderActivity: 'No provider activity matches the current backend filters.',
    noProviderSelected: 'No provider selected',
    noDiscoveredModelsEnabled: 'No discovered models are enabled yet.',
    noProviders: 'No providers are available yet. Create one from the toolbar above.',
    ownerHint: 'Future-ready ownership metadata for provider governance.',
    ownerUsername: 'Owner username',
    prepareOnActivate: 'Prepare on activate',
    prepareOnAppStart: 'Prepare on app start',
    preparing: 'Preparing…',
    prewarmPolicy: 'Prewarm policy',
    prewarmSectionDescription: 'Backend-owned prewarm behavior and warm TTL for the selected provider route.',
    private: 'Private',
    probeLatency: 'Probe latency',
    probeProviderRoute: 'Probe provider route',
    probing: 'Probing…',
    provider: 'Provider',
    providerActivityUnavailable: (message) => `Provider run history is unavailable: ${message}`,
    providerScope: 'Provider scope',
    providerStatus: 'Provider status',
    providerVisibility: 'Provider visibility',
    ready: 'Ready',
    recentProviderActivity: 'Recent provider activity',
    recentProviderActivityDescription:
      'Filtered persisted gateway history over the same backend-owned provider route.',
    refresh: 'Refresh',
    requestMode: 'Request mode',
    reset: 'Reset',
    resolvedBinary: 'Resolved binary',
    resolvedRoute: 'Resolved route',
    routeChecked: 'Route checked',
    routePolicy: 'Route policy',
    routeState: 'Route state',
    runDiagnostics: 'Run diagnostics',
    runDiagnosticsDescription: 'Detailed operator view for the selected persisted provider run.',
    runs: (count) => `${count} runs`,
    saveChanges: 'Save changes',
    saving: 'Saving…',
    selectedProvider: 'Selected provider',
    shared: 'Shared',
    showingRuns: (visible, total, offset) =>
      `Showing ${visible} of ${total} persisted runs${offset > 0 ? ` from offset ${offset}` : ''}.`,
    started: 'Started',
    status: 'Status',
    statusFilter: 'Status filter',
    statuses: {
      all: 'All statuses',
      authRequired: 'Login required',
      cancelled: 'Cancelled',
      cancelledOnly: 'Cancelled only',
      disabled: 'Disabled',
      failedOnly: 'Failed only',
      failing: 'Failing',
      healthy: 'Healthy',
      loginRequired: 'Login required',
      modelUnavailable: 'Model unavailable',
      needsAttention: 'Needs attention',
      noRuns: 'No runs yet',
      ready: 'Ready',
      routeReady: 'Route ready',
      succeededOnly: 'Succeeded only',
      unchecked: 'Unchecked',
      unreachable: 'Unreachable',
    },
    suggestedRecovery: (label) => `Suggested recovery: ${label}`,
    title: 'AI provider routing',
    titleEmbedded: 'AI / Providers',
    totalDuration: 'Total duration',
    unknown: 'unknown',
    unknownUntilProbed: 'Unknown until probed',
    warmPolicy: 'Warm policy',
    routeStats: (succeeded, total, averageDuration) => `${succeeded}/${total} ok · avg ${averageDuration}`,
    ttl: 'ttl',
    warmTtl: 'Warm TTL (seconds)',
    warmTtlHint: 'How long a prepared route is treated as warm before the shell marks it stale.',
    warmWindowEnds: (value) => `Warm window ends ${value}`,
  },
  ru: {
    active: 'Активен',
    activate: 'Активировать',
    actor: 'Актор',
    addProvider: (label) => `Добавить ${label}`,
    allowedUsers: 'Разрешенные пользователи',
    allProviders: 'Все провайдеры',
    allowedUsersHint: 'Имена пользователей через запятую для будущего общего доступа к провайдеру.',
    averageLatency: 'Средняя задержка',
    baseUrl: 'Base URL',
    chatEnabledModels: (count) => `${count} моделей включено для панели чата.`,
    chatVisibility: 'Видимость в чате',
    chooseProvider: 'Выберите существующего провайдера слева или создайте нового.',
    clearRouteState: 'Очистить состояние маршрута',
    command: 'Команда',
    commandHint: (command) => `Имя команды или абсолютный путь. По умолчанию ${command}.`,
    completed: 'Завершено',
    description:
      'Управляйте маршрутизацией локальных Codex CLI и Claude Code CLI прямо в модальном окне shell.',
    descriptionEmbedded:
      'Подключайте CLI-провайдеры для чата и управляйте активным runtime без переходов между settings sections.',
    configuredProviders: 'Настроенные провайдеры',
    connection: 'Подключение',
    conversation: 'Conversation',
    createProvider: 'Создать провайдера',
    createdUpdated: (createdBy, updatedBy) => `Создал ${createdBy} · обновил ${updatedBy}`,
    currentActor: (actor) => `Текущий актор: ${actor}`,
    currentStatus: 'Текущий статус',
    defaultModel: 'модель по умолчанию',
    delete: 'Удалить',
    disabled: 'Отключен',
    disabledProviderHint: 'Отключенные провайдеры остаются в каталоге, но не могут стать активными.',
    displayName: 'Отображаемое имя',
    displayNamePlaceholder: 'Отображаемое имя провайдера',
    errorClass: 'Класс ошибки',
    firstResponse: 'Первый ответ',
    gatewaySignals: 'Сигналы gateway',
    gatewaySignalsDescription: 'История последних запусков и сигналы здоровья маршрута активного провайдера.',
    gatewayTelemetryUnavailable: (message) => `Телеметрия gateway недоступна: ${message}`,
    historySearch: 'Поиск истории',
    historySearchHint: 'Фильтр по провайдеру, модели, режиму запроса, ошибке или conversation id.',
    historySearchPlaceholder: 'Искать последние запуски',
    historyWindow: 'Окно истории',
    kind: (label, active) => `Тип: ${label}${active ? ' · сейчас активен' : ''}`,
    loading: 'Загрузка каталога провайдеров…',
    loadingModels: 'Загрузка…',
    loadingProviderActivity: 'Загрузка активности провайдера…',
    lastError: 'Последняя ошибка',
    loadMoreHistory: 'Загрузить еще историю',
    manualOnly: 'Только вручную',
    model: 'Модель',
    modelCodexHint: 'CLI aliases моделей разрешаются локальным Codex CLI.',
    modelClaudeHint: 'Общие Claude Code aliases доступны локально; точную поддержку моделей определяет CLI.',
    modelHttpHint:
      'Backend читает `/v1/models` из этого источника и показывает включенные модели в панели чата.',
    noModelsLoaded: 'Модели не загружены',
    noProviderActivity: 'Активность провайдера не найдена для текущих backend-фильтров.',
    noProviderSelected: 'Провайдер не выбран',
    noDiscoveredModelsEnabled: 'Обнаруженные модели пока не включены.',
    noProviders: 'Провайдеров пока нет. Создайте провайдера на панели выше.',
    ownerHint: 'Метаданные владельца для будущего управления провайдерами.',
    ownerUsername: 'Имя владельца',
    prepareOnActivate: 'Подготовить при активации',
    prepareOnAppStart: 'Подготовить при старте приложения',
    preparing: 'Подготовка…',
    prewarmPolicy: 'Политика prewarm',
    prewarmSectionDescription: 'Поведение prewarm и warm TTL выбранного маршрута провайдера.',
    private: 'Приватный',
    probeLatency: 'Задержка проверки',
    probeProviderRoute: 'Проверить маршрут провайдера',
    probing: 'Проверка…',
    provider: 'Провайдер',
    providerActivityUnavailable: (message) => `История запусков провайдера недоступна: ${message}`,
    providerScope: 'Область провайдера',
    providerStatus: 'Статус провайдера',
    providerVisibility: 'Видимость провайдера',
    ready: 'Готов',
    recentProviderActivity: 'Недавняя активность провайдера',
    recentProviderActivityDescription: 'Сохраненная история gateway для того же backend-маршрута провайдера.',
    refresh: 'Обновить',
    requestMode: 'Режим запроса',
    reset: 'Сбросить',
    resolvedBinary: 'Найденный бинарь',
    resolvedRoute: 'Resolved route',
    routeChecked: 'Маршрут проверен',
    routePolicy: 'Политика маршрута',
    routeState: 'Состояние маршрута',
    runDiagnostics: 'Диагностика запуска',
    runDiagnosticsDescription: 'Подробный операторский вид выбранного сохраненного запуска провайдера.',
    runs: (count) => `${count} запусков`,
    saveChanges: 'Сохранить изменения',
    saving: 'Сохранение…',
    selectedProvider: 'Выбранный провайдер',
    shared: 'Общий',
    showingRuns: (visible, total, offset) =>
      `Показано ${visible} из ${total} сохраненных запусков${offset > 0 ? ` со смещения ${offset}` : ''}.`,
    started: 'Начато',
    status: 'Статус',
    statusFilter: 'Фильтр статуса',
    statuses: {
      all: 'Все статусы',
      authRequired: 'Нужен логин',
      cancelled: 'Отменен',
      cancelledOnly: 'Только отмененные',
      disabled: 'Отключен',
      failedOnly: 'Только ошибки',
      failing: 'С ошибками',
      healthy: 'Здоров',
      loginRequired: 'Нужен логин',
      modelUnavailable: 'Модель недоступна',
      needsAttention: 'Требует внимания',
      noRuns: 'Запусков еще нет',
      ready: 'Готов',
      routeReady: 'Маршрут готов',
      succeededOnly: 'Только успешные',
      unchecked: 'Не проверен',
      unreachable: 'Недоступен',
    },
    suggestedRecovery: (label) => `Рекомендуемое восстановление: ${label}`,
    title: 'Маршрутизация AI провайдеров',
    titleEmbedded: 'AI / Провайдеры',
    totalDuration: 'Общая длительность',
    unknown: 'неизвестно',
    unknownUntilProbed: 'Неизвестно до проверки',
    warmPolicy: 'Политика warm',
    routeStats: (succeeded, total, averageDuration) =>
      `${succeeded}/${total} ok · среднее ${averageDuration}`,
    ttl: 'ttl',
    warmTtl: 'Warm TTL (секунды)',
    warmTtlHint: 'Как долго подготовленный маршрут считается warm до отметки stale.',
    warmWindowEnds: (value) => `Warm окно закончится ${value}`,
  },
  'zh-CN': {} as AgentProviderSettingsWidgetCopy,
  es: {} as AgentProviderSettingsWidgetCopy,
}

agentProviderSettingsWidgetCopy['zh-CN'] = {
  ...agentProviderSettingsWidgetCopy.en,
  active: '活动',
  activate: '激活',
  actor: '操作者',
  addProvider: (label) => `添加 ${label}`,
  allowedUsers: '允许的用户',
  allProviders: '所有 providers',
  allowedUsersHint: '用逗号分隔用户名，用于未来的共享 provider 访问控制。',
  averageLatency: '平均延迟',
  chatEnabledModels: (count) => `${count} 个模型已在聊天工具栏启用。`,
  chatVisibility: '聊天可见性',
  chooseProvider: '选择左侧已有 provider，或创建新的 provider。',
  clearRouteState: '清除路由状态',
  command: '命令',
  commandHint: (command) => `命令名或绝对路径。默认是 ${command}。`,
  completed: '完成时间',
  configuredProviders: '已配置 providers',
  connection: '连接',
  createProvider: '创建 provider',
  createdUpdated: (createdBy, updatedBy) => `创建者 ${createdBy} · 更新者 ${updatedBy}`,
  currentActor: (actor) => `当前操作者：${actor}`,
  currentStatus: '当前状态',
  defaultModel: '默认模型',
  delete: '删除',
  description: '在 shell 弹窗中管理本地 Codex CLI 和 Claude Code CLI 路由。',
  descriptionEmbedded: '连接聊天 CLI providers，并在 settings sections 内管理活动 runtime。',
  disabled: '已禁用',
  disabledProviderHint: '禁用的 providers 会保留在目录中，但不能设为活动。',
  displayName: '显示名称',
  displayNamePlaceholder: 'Provider 显示名称',
  errorClass: '错误类别',
  firstResponse: '首次响应',
  gatewaySignals: 'Gateway 信号',
  gatewaySignalsDescription: '活动 provider 路由的 backend 运行历史和健康信号。',
  gatewayTelemetryUnavailable: (message) => `Gateway 遥测不可用：${message}`,
  historySearch: '历史搜索',
  historySearchHint: '按 provider、模型、请求模式、错误或 conversation id 过滤。',
  historySearchPlaceholder: '搜索最近运行',
  historyWindow: '历史窗口',
  kind: (label, active) => `类型：${label}${active ? ' · 当前活动' : ''}`,
  loading: '正在加载 provider 目录…',
  loadingModels: '正在加载…',
  loadingProviderActivity: '正在加载 provider 活动…',
  lastError: '最后错误',
  loadMoreHistory: '加载更多历史',
  manualOnly: '仅手动',
  model: '模型',
  noDiscoveredModelsEnabled: '尚未启用已发现模型。',
  noModelsLoaded: '没有加载模型',
  noProviderActivity: '当前 backend 过滤器没有匹配的 provider 活动。',
  noProviderSelected: '未选择 provider',
  noProviders: '还没有 providers。请从上方工具栏创建一个。',
  ownerHint: '用于未来 provider 治理的所有者元数据。',
  ownerUsername: '所有者用户名',
  prepareOnActivate: '激活时准备',
  prepareOnAppStart: '应用启动时准备',
  preparing: '正在准备…',
  prewarmPolicy: 'Prewarm 策略',
  prewarmSectionDescription: '所选 provider 路由的 backend prewarm 行为和 warm TTL。',
  private: '私有',
  probeLatency: '检查延迟',
  probeProviderRoute: '检查 provider 路由',
  probing: '正在检查…',
  provider: 'Provider',
  providerActivityUnavailable: (message) => `Provider 运行历史不可用：${message}`,
  providerScope: 'Provider 范围',
  providerStatus: 'Provider 状态',
  providerVisibility: 'Provider 可见性',
  ready: '就绪',
  recentProviderActivity: '最近 provider 活动',
  recentProviderActivityDescription: '同一 backend provider 路由的持久化 gateway 历史。',
  refresh: '刷新',
  requestMode: '请求模式',
  reset: '重置',
  resolvedBinary: '已解析二进制',
  resolvedRoute: '已解析路由',
  routeChecked: '路由检查时间',
  routePolicy: '路由策略',
  routeState: '路由状态',
  runDiagnostics: '运行诊断',
  runDiagnosticsDescription: '所选持久化 provider 运行的详细操作视图。',
  runs: (count) => `${count} 次运行`,
  saveChanges: '保存更改',
  saving: '正在保存…',
  selectedProvider: '所选 provider',
  shared: '共享',
  showingRuns: (visible, total, offset) =>
    `显示 ${visible} / ${total} 次持久化运行${offset > 0 ? `，偏移 ${offset}` : ''}。`,
  started: '开始时间',
  status: '状态',
  statusFilter: '状态过滤',
  statuses: {
    all: '所有状态',
    authRequired: '需要登录',
    cancelled: '已取消',
    cancelledOnly: '仅已取消',
    disabled: '已禁用',
    failedOnly: '仅失败',
    failing: '失败中',
    healthy: '健康',
    loginRequired: '需要登录',
    modelUnavailable: '模型不可用',
    needsAttention: '需要注意',
    noRuns: '尚无运行',
    ready: '就绪',
    routeReady: '路由就绪',
    succeededOnly: '仅成功',
    unchecked: '未检查',
    unreachable: '不可达',
  },
  suggestedRecovery: (label) => `建议恢复：${label}`,
  title: 'AI provider 路由',
  titleEmbedded: 'AI / Providers',
  totalDuration: '总耗时',
  unknown: '未知',
  unknownUntilProbed: '检查前未知',
  warmPolicy: 'Warm 策略',
  routeStats: (succeeded, total, averageDuration) => `${succeeded}/${total} 正常 · 平均 ${averageDuration}`,
  ttl: 'ttl',
  warmTtl: 'Warm TTL（秒）',
  warmTtlHint: '准备好的路由在 shell 标记为 stale 前保持 warm 的时长。',
  warmWindowEnds: (value) => `Warm 窗口结束于 ${value}`,
}

agentProviderSettingsWidgetCopy.es = {
  ...agentProviderSettingsWidgetCopy.en,
  active: 'Activo',
  activate: 'Activar',
  actor: 'Actor',
  addProvider: (label) => `Agregar ${label}`,
  allowedUsers: 'Usuarios permitidos',
  allProviders: 'Todos los proveedores',
  allowedUsersHint: 'Usuarios separados por comas para futuro control de acceso compartido.',
  averageLatency: 'Latencia media',
  chatEnabledModels: (count) => `${count} modelos habilitados para la barra de chat.`,
  chatVisibility: 'Visibilidad en chat',
  chooseProvider: 'Elige un proveedor existente a la izquierda o crea uno nuevo.',
  clearRouteState: 'Limpiar estado de ruta',
  command: 'Comando',
  commandHint: (command) => `Nombre de comando o ruta absoluta. Predeterminado: ${command}.`,
  completed: 'Completado',
  configuredProviders: 'Proveedores configurados',
  connection: 'Conexion',
  createProvider: 'Crear proveedor',
  createdUpdated: (createdBy, updatedBy) => `Creado por ${createdBy} · actualizado por ${updatedBy}`,
  currentActor: (actor) => `Actor actual: ${actor}`,
  currentStatus: 'Estado actual',
  defaultModel: 'modelo predeterminado',
  delete: 'Eliminar',
  description: 'Gestiona rutas locales de Codex CLI y Claude Code CLI sin salir del modal de shell.',
  descriptionEmbedded:
    'Conecta proveedores CLI para chat y gestiona el runtime activo sin salir de las settings sections.',
  disabled: 'Deshabilitado',
  disabledProviderHint: 'Los proveedores deshabilitados quedan en el catalogo, pero no pueden activarse.',
  displayName: 'Nombre visible',
  displayNamePlaceholder: 'Nombre visible del proveedor',
  errorClass: 'Clase de error',
  firstResponse: 'Primera respuesta',
  gatewaySignals: 'Senales de gateway',
  gatewaySignalsDescription: 'Historial reciente y senales de salud de la ruta activa del proveedor.',
  gatewayTelemetryUnavailable: (message) => `La telemetria de gateway no esta disponible: ${message}`,
  historySearch: 'Buscar historial',
  historySearchHint: 'Filtra por proveedor, modelo, modo de solicitud, error o conversation id.',
  historySearchPlaceholder: 'Buscar ejecuciones recientes',
  historyWindow: 'Ventana de historial',
  kind: (label, active) => `Tipo: ${label}${active ? ' · activo ahora' : ''}`,
  loading: 'Cargando catalogo de proveedores…',
  loadingModels: 'Cargando…',
  loadingProviderActivity: 'Cargando actividad del proveedor…',
  lastError: 'Ultimo error',
  loadMoreHistory: 'Cargar mas historial',
  manualOnly: 'Solo manual',
  model: 'Modelo',
  noDiscoveredModelsEnabled: 'Todavia no hay modelos descubiertos habilitados.',
  noModelsLoaded: 'No hay modelos cargados',
  noProviderActivity: 'No hay actividad del proveedor para los filtros actuales.',
  noProviderSelected: 'No hay proveedor seleccionado',
  noProviders: 'Todavia no hay proveedores. Crea uno desde la barra superior.',
  ownerHint: 'Metadatos de propietario para futura gobernanza de proveedores.',
  ownerUsername: 'Usuario propietario',
  prepareOnActivate: 'Preparar al activar',
  prepareOnAppStart: 'Preparar al iniciar la app',
  preparing: 'Preparando…',
  prewarmPolicy: 'Politica prewarm',
  prewarmSectionDescription: 'Comportamiento prewarm y warm TTL de la ruta seleccionada del proveedor.',
  private: 'Privado',
  probeLatency: 'Latencia de prueba',
  probeProviderRoute: 'Probar ruta del proveedor',
  probing: 'Probando…',
  provider: 'Proveedor',
  providerActivityUnavailable: (message) => `El historial de ejecuciones no esta disponible: ${message}`,
  providerScope: 'Alcance del proveedor',
  providerStatus: 'Estado del proveedor',
  providerVisibility: 'Visibilidad del proveedor',
  ready: 'Listo',
  recentProviderActivity: 'Actividad reciente del proveedor',
  recentProviderActivityDescription: 'Historial gateway persistido para la misma ruta backend del proveedor.',
  refresh: 'Actualizar',
  requestMode: 'Modo de solicitud',
  reset: 'Restablecer',
  resolvedBinary: 'Binario resuelto',
  resolvedRoute: 'Ruta resuelta',
  routeChecked: 'Ruta comprobada',
  routePolicy: 'Politica de ruta',
  routeState: 'Estado de ruta',
  runDiagnostics: 'Diagnostico de ejecucion',
  runDiagnosticsDescription: 'Vista operativa detallada de la ejecucion persistida seleccionada.',
  runs: (count) => `${count} ejecuciones`,
  saveChanges: 'Guardar cambios',
  saving: 'Guardando…',
  selectedProvider: 'Proveedor seleccionado',
  shared: 'Compartido',
  showingRuns: (visible, total, offset) =>
    `Mostrando ${visible} de ${total} ejecuciones persistidas${offset > 0 ? ` desde offset ${offset}` : ''}.`,
  started: 'Iniciado',
  status: 'Estado',
  statusFilter: 'Filtro de estado',
  statuses: {
    all: 'Todos los estados',
    authRequired: 'Login requerido',
    cancelled: 'Cancelado',
    cancelledOnly: 'Solo cancelados',
    disabled: 'Deshabilitado',
    failedOnly: 'Solo fallidas',
    failing: 'Con fallos',
    healthy: 'Saludable',
    loginRequired: 'Login requerido',
    modelUnavailable: 'Modelo no disponible',
    needsAttention: 'Requiere atencion',
    noRuns: 'Sin ejecuciones aun',
    ready: 'Listo',
    routeReady: 'Ruta lista',
    succeededOnly: 'Solo exitosas',
    unchecked: 'Sin comprobar',
    unreachable: 'Inalcanzable',
  },
  suggestedRecovery: (label) => `Recuperacion sugerida: ${label}`,
  title: 'Rutas de proveedores AI',
  titleEmbedded: 'AI / Proveedores',
  totalDuration: 'Duracion total',
  unknown: 'desconocido',
  unknownUntilProbed: 'Desconocido hasta probar',
  warmPolicy: 'Politica warm',
  routeStats: (succeeded, total, averageDuration) => `${succeeded}/${total} ok · media ${averageDuration}`,
  ttl: 'ttl',
  warmTtl: 'Warm TTL (segundos)',
  warmTtlHint: 'Tiempo que una ruta preparada se considera warm antes de marcarla stale.',
  warmWindowEnds: (value) => `La ventana warm termina ${value}`,
}
