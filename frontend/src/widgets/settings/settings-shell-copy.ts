import type { AppLocale } from '@/shared/api/runtime'

export type SettingsSectionID =
  | 'general'
  | 'ai-apps'
  | 'ai-models'
  | 'ai-composer'
  | 'ai-limits'
  | 'mcp'
  | 'plugins'
  | 'remote'
  | 'terminal'
  | 'commander'

export type SettingsSectionMeta = {
  navTitle: string
  navDescription: string
  shellTitle: string
  shellDescription: string
  groupLabel: string
}

export type SettingsShellCopy = {
  aiLimits: {
    activeBadge: string
    description: string
    loading: string
    noProviders: string
    routeActive: string
    routeAuthRequired: string
    routeConfiguredHttp: string
    routeDisabled: string
    routeDisabledHttp: string
    routeReady: string
    routeUnchecked: string
    routeUnknown: string
    title: string
  }
  aiModels: {
    availableModelsTitle: string
    countModels: (count: number) => string
    defaultBadge: string
    defaultModelDescription: string
    enabledModelDescription: string
    exposeModelAriaLabel: (model: string) => string
    loadingShort: string
    loadingProviders: string
    noDiscoveredModels: string
    noProviders: string
    providerAvailable: string
    providerActive: string
    refreshModels: string
    sectionDescription: string
    routeNotConfigured: string
    routeNotProbedClaude: string
    routeNotProbedCodex: string
    routeUnknown: string
  }
  aiParent: {
    description: string
    title: string
  }
  commander: {
    description: string
    notConnected: string
    planned: string
    preferencesTitle: string
    title: string
  }
  providerRouteStates: {
    authRequired: string
    disabled: string
    modelUnavailable: string
    needsAttention: string
    ready: string
    unchecked: string
    unreachable: string
  }
  sections: Record<SettingsSectionID, SettingsSectionMeta>
  sidebar: {
    description: string
    product: string
    settings: string
  }
}

export const settingsShellCopy: Record<AppLocale, SettingsShellCopy> = {
  en: {
    aiLimits: {
      activeBadge: 'active',
      description:
        'This surface currently shows only route readiness for chat. Real quota and rate-limit behavior will arrive as a separate backend-owned step.',
      loading: 'Loading provider catalog…',
      noProviders: 'No providers yet.',
      routeActive: 'Active provider for the current chat runtime.',
      routeAuthRequired: 'Needs a local CLI login before the route can be used.',
      routeConfiguredHttp: 'HTTP source is configured. Use model refresh to validate the remote catalog.',
      routeDisabled: 'Disabled provider; chat will not route requests here.',
      routeDisabledHttp: 'Disabled HTTP source; chat will not route requests here.',
      routeReady: 'Backend-owned route is ready for chat traffic.',
      routeUnchecked: 'Route has not been probed yet.',
      routeUnknown: 'Unknown provider readiness.',
      title: 'Provider status',
    },
    aiModels: {
      availableModelsTitle: 'Available models',
      countModels: (count) => `${count} model${count === 1 ? '' : 's'}`,
      defaultBadge: 'default',
      defaultModelDescription: 'Base provider model. Always available in the main AI interface.',
      enabledModelDescription: 'Enable this model to expose it in the main AI chat dropdown.',
      exposeModelAriaLabel: (model) => `Expose ${model} in the main AI model selector`,
      loadingShort: 'Loading…',
      loadingProviders: 'Loading provider catalog…',
      noDiscoveredModels: 'The backend has not returned models for this provider yet.',
      noProviders:
        'No direct AI providers yet. Add a CLI or HTTP source first in the `Installed apps` section.',
      providerAvailable: 'Available for activation in the provider catalog.',
      providerActive: 'Active in the current runtime.',
      refreshModels: 'Refresh models',
      sectionDescription:
        'Switch provider to inspect the auto-discovered catalog available to the main chat model selector.',
      routeNotConfigured: 'OpenAI-compatible source URL is not configured.',
      routeNotProbedClaude: 'Claude Code CLI route has not been probed yet.',
      routeNotProbedCodex: 'Codex CLI route has not been probed yet.',
      routeUnknown: 'Unknown provider connection state.',
    },
    aiParent: {
      description: 'Providers, models, and chat limits.',
      title: 'AI',
    },
    commander: {
      description:
        'This section is reserved for commander-specific options once they leave widget-local state.',
      notConnected: 'A dedicated configuration surface for commander is not wired yet.',
      planned: 'Planned',
      preferencesTitle: 'Commander preferences',
      title: 'Section status',
    },
    providerRouteStates: {
      authRequired: 'Login required',
      disabled: 'Disabled',
      modelUnavailable: 'Model unavailable',
      needsAttention: 'Needs attention',
      ready: 'Ready',
      unchecked: 'Unchecked',
      unreachable: 'Unreachable',
    },
    sections: {
      general: {
        navTitle: 'General',
        navDescription: 'Runtime mode, shell language, and bootstrap context.',
        shellTitle: 'General',
        shellDescription:
          'Desktop runtime lifecycle, language selection, and current shell bootstrap context.',
        groupLabel: 'General',
      },
      'ai-apps': {
        navTitle: 'AI providers',
        navDescription: 'CLI and HTTP providers for the AI runtime.',
        shellTitle: 'AI / Providers',
        shellDescription:
          'Manage CLI and OpenAI-compatible HTTP providers, their runtime readiness, and connection parameters without leaving the shared settings shell.',
        groupLabel: 'AI',
      },
      'ai-models': {
        navTitle: 'Models',
        navDescription: 'Models exposed to the main chat.',
        shellTitle: 'AI / Models',
        shellDescription:
          'Catalog of models returned by the backend for active providers and their exposure in the main AI chat.',
        groupLabel: 'AI',
      },
      'ai-composer': {
        navTitle: 'Composer',
        navDescription: 'Enter / Shift+Enter chat behavior.',
        shellTitle: 'AI / Composer',
        shellDescription:
          'Runtime-backed keyboard behavior for the AI composer: send/newline shortcut selection stored in the shared settings contract.',
        groupLabel: 'AI',
      },
      'ai-limits': {
        navTitle: 'Limits',
        navDescription: 'Route readiness and future quota surfaces.',
        shellTitle: 'AI / Limits',
        shellDescription:
          'Current provider readiness surface. Full quota and rate-limit contracts will arrive as a separate backend step.',
        groupLabel: 'AI',
      },
      terminal: {
        navTitle: 'Terminal',
        navDescription: 'Terminal runtime preferences.',
        shellTitle: 'Terminal',
        shellDescription:
          'Dedicated entry point for terminal runtime and future terminal preferences, without mixing them into general or AI settings.',
        groupLabel: 'Runtime',
      },
      remote: {
        navTitle: 'Remote',
        navDescription: 'SSH profiles and config import.',
        shellTitle: 'Remote',
        shellDescription:
          'Backend-owned SSH profiles, narrow ~/.ssh/config import, and explicit limits around advanced remote topology.',
        groupLabel: 'Runtime',
      },
      mcp: {
        navTitle: 'MCP',
        navDescription: 'External server registration and lifecycle.',
        shellTitle: 'MCP',
        shellDescription:
          'Register remote MCP endpoints and control lifecycle through the backend-owned MCP runtime without implicit AI context injection.',
        groupLabel: 'Runtime',
      },
      plugins: {
        navTitle: 'Plugins',
        navDescription: 'Local catalog and install lifecycle.',
        shellTitle: 'Plugins',
        shellDescription:
          'Backend-owned local plugin catalog with explicit git/zip install sources, runtime-safe activation checks, and future-facing access metadata.',
        groupLabel: 'Runtime',
      },
      commander: {
        navTitle: 'Commander',
        navDescription: 'File-manager surface settings.',
        shellTitle: 'Commander',
        shellDescription:
          'Navigation surface for the file manager and dual-pane behavior. Commander-specific options will appear here as they move out of widget-local state.',
        groupLabel: 'Workspace',
      },
    },
    sidebar: {
      description:
        'Shared navigator for shell, AI runtime, terminal, remote, MCP, plugins, and commander surfaces.',
      product: 'Rune Terminal',
      settings: 'Settings',
    },
  },
  ru: {
    aiLimits: {
      activeBadge: 'активен',
      description:
        'Сейчас этот раздел показывает только готовность маршрутов для чата. Реальные квоты и лимиты запросов появятся отдельным backend-шагом.',
      loading: 'Загружаю каталог провайдеров…',
      noProviders: 'Провайдеров пока нет.',
      routeActive: 'Активный провайдер для текущего чата.',
      routeAuthRequired: 'Нужен локальный вход в CLI, прежде чем маршрут станет доступен.',
      routeConfiguredHttp: 'HTTP-источник настроен. Обнови модели, чтобы проверить удалённый каталог.',
      routeDisabled: 'Провайдер выключен; чат не будет отправлять сюда запросы.',
      routeDisabledHttp: 'HTTP-источник выключен; чат не будет отправлять сюда запросы.',
      routeReady: 'Маршрут backend готов принимать запросы чата.',
      routeUnchecked: 'Маршрут ещё не проверялся.',
      routeUnknown: 'Неизвестное состояние готовности провайдера.',
      title: 'Статус провайдеров',
    },
    aiModels: {
      availableModelsTitle: 'Доступные модели',
      countModels: (count) =>
        `${count} ${count === 1 ? 'модель' : count >= 2 && count <= 4 ? 'модели' : 'моделей'}`,
      defaultBadge: 'по умолчанию',
      defaultModelDescription: 'Базовая модель провайдера. Всегда доступна в основном AI-интерфейсе.',
      enabledModelDescription: 'Включи модель, чтобы она появилась в списке основного AI-чата.',
      exposeModelAriaLabel: (model) => `Показывать ${model} в основном селекторе AI-моделей`,
      loadingShort: 'Загрузка…',
      loadingProviders: 'Загружаю каталог провайдеров…',
      noDiscoveredModels: 'Backend пока не вернул модели для этого провайдера.',
      noProviders:
        'Прямых AI-провайдеров пока нет. Сначала добавь CLI или HTTP-источник в разделе «AI-провайдеры».',
      providerAvailable: 'Доступен для активации в каталоге провайдеров.',
      providerActive: 'Сейчас активен в рантайме.',
      refreshModels: 'Обновить модели',
      sectionDescription:
        'Переключай провайдера, чтобы посмотреть автоматически найденный каталог, доступный для выбора в основном чате.',
      routeNotConfigured: 'URL OpenAI-compatible источника ещё не настроен.',
      routeNotProbedClaude: 'Маршрут Claude Code CLI ещё не проверялся.',
      routeNotProbedCodex: 'Маршрут Codex CLI ещё не проверялся.',
      routeUnknown: 'Неизвестное состояние подключения провайдера.',
    },
    aiParent: {
      description: 'Провайдеры, модели и лимиты чата.',
      title: 'AI',
    },
    commander: {
      description:
        'Этот раздел зарезервирован для настроек Commander после переноса из локального состояния виджета.',
      notConnected: 'Отдельная поверхность настройки Commander ещё не подключена.',
      planned: 'Запланировано',
      preferencesTitle: 'Настройки Commander',
      title: 'Состояние раздела',
    },
    providerRouteStates: {
      authRequired: 'Нужен вход',
      disabled: 'Выключен',
      modelUnavailable: 'Модель недоступна',
      needsAttention: 'Нужно внимание',
      ready: 'Готов',
      unchecked: 'Не проверен',
      unreachable: 'Недоступен',
    },
    sections: {
      general: {
        navTitle: 'Основные',
        navDescription: 'Режим рантайма, язык оболочки и контекст запуска.',
        shellTitle: 'Основные',
        shellDescription: 'Жизненный цикл desktop-рантайма, выбор языка и текущий контекст запуска оболочки.',
        groupLabel: 'Основные',
      },
      'ai-apps': {
        navTitle: 'AI-провайдеры',
        navDescription: 'CLI и HTTP-провайдеры для AI-рантайма.',
        shellTitle: 'AI / Провайдеры',
        shellDescription:
          'Управление CLI и OpenAI-compatible HTTP-провайдерами, их готовностью в рантайме и параметрами подключения без выхода из общего окна настроек.',
        groupLabel: 'AI',
      },
      'ai-models': {
        navTitle: 'Модели',
        navDescription: 'Модели, доступные в основном чате.',
        shellTitle: 'AI / Модели',
        shellDescription:
          'Каталог моделей, которые backend вернул для активных провайдеров, и их доступность в основном AI-чате.',
        groupLabel: 'AI',
      },
      'ai-composer': {
        navTitle: 'Композер',
        navDescription: 'Поведение Enter / Shift+Enter в чате.',
        shellTitle: 'AI / Композер',
        shellDescription:
          'Поведение клавиатуры в AI-композере: выбор сочетания для отправки и новой строки хранится в общем контракте настроек.',
        groupLabel: 'AI',
      },
      'ai-limits': {
        navTitle: 'Лимиты',
        navDescription: 'Готовность маршрутов и будущие квоты.',
        shellTitle: 'AI / Лимиты',
        shellDescription:
          'Текущая поверхность готовности провайдеров. Полноценные контракты квот и лимитов запросов будут добавлены отдельным backend-шагом.',
        groupLabel: 'AI',
      },
      terminal: {
        navTitle: 'Терминал',
        navDescription: 'Настройки терминального рантайма.',
        shellTitle: 'Терминал',
        shellDescription:
          'Отдельная точка входа для терминального рантайма и будущих настроек терминала без смешения с общими или AI-настройками.',
        groupLabel: 'Рантайм',
      },
      remote: {
        navTitle: 'Удалённый доступ',
        navDescription: 'SSH-профили и импорт из конфига.',
        shellTitle: 'Удалённый доступ',
        shellDescription:
          'Backend-owned SSH-профили, узкий импорт из ~/.ssh/config и явные ограничения вокруг расширенной удалённой топологии.',
        groupLabel: 'Рантайм',
      },
      mcp: {
        navTitle: 'MCP',
        navDescription: 'Регистрация внешних серверов и жизненный цикл.',
        shellTitle: 'MCP',
        shellDescription:
          'Регистрируй удалённые MCP-endpoints и управляй жизненным циклом через backend-owned MCP-рантайм без неявной подстановки AI-контекста.',
        groupLabel: 'Рантайм',
      },
      plugins: {
        navTitle: 'Плагины',
        navDescription: 'Локальный каталог и установка.',
        shellTitle: 'Плагины',
        shellDescription:
          'Backend-owned локальный каталог плагинов с явными git/zip-источниками установки, безопасными runtime-проверками активации и будущими метаданными доступа.',
        groupLabel: 'Рантайм',
      },
      commander: {
        navTitle: 'Commander',
        navDescription: 'Настройки файлового менеджера.',
        shellTitle: 'Commander',
        shellDescription:
          'Навигационная поверхность файлового менеджера и двухпанельного поведения. Настройки Commander будут появляться здесь по мере вывода из локального состояния виджета.',
        groupLabel: 'Рабочая область',
      },
    },
    sidebar: {
      description:
        'Общий навигатор по оболочке, AI-рантайму, терминалу, удалённому доступу, MCP, плагинам и Commander.',
      product: 'Rune Terminal',
      settings: 'Настройки',
    },
  },
  'zh-CN': {
    aiLimits: {
      activeBadge: 'active',
      description: '当前这里只展示聊天路由是否可用。真正的配额和速率限制会作为单独的后端步骤加入。',
      loading: '正在加载 provider catalog…',
      noProviders: '还没有 provider。',
      routeActive: '当前聊天 runtime 的活动 provider。',
      routeAuthRequired: '在使用该路由前，需要先完成本地 CLI 登录。',
      routeConfiguredHttp: 'HTTP source 已配置。使用刷新模型来验证远端目录。',
      routeDisabled: '该 provider 已禁用；聊天不会把请求发送到这里。',
      routeDisabledHttp: '该 HTTP source 已禁用；聊天不会把请求发送到这里。',
      routeReady: 'backend-owned route 已可用于聊天流量。',
      routeUnchecked: '该 route 还没有执行 probe。',
      routeUnknown: '未知的 provider 就绪状态。',
      title: 'Provider 状态',
    },
    aiModels: {
      availableModelsTitle: '可用模型',
      countModels: (count) => `${count} 个模型`,
      defaultBadge: 'default',
      defaultModelDescription: 'Provider 的基础模型，始终会出现在主 AI 界面中。',
      enabledModelDescription: '启用后，该模型会出现在主 AI 聊天下拉框中。',
      exposeModelAriaLabel: (model) => `在主 AI 模型选择器中显示 ${model}`,
      loadingShort: '加载中…',
      loadingProviders: '正在加载 provider catalog…',
      noDiscoveredModels: '后端还没有为这个 provider 返回模型列表。',
      noProviders: '还没有直接 AI provider。请先在“已安装应用”中添加 CLI 或 HTTP source。',
      providerAvailable: '可在 provider catalog 中激活。',
      providerActive: '当前已在 runtime 中激活。',
      refreshModels: '刷新模型',
      sectionDescription: '切换 provider 以查看自动发现的模型目录，并暴露到主聊天模型选择器中。',
      routeNotConfigured: '尚未配置 OpenAI-compatible source URL。',
      routeNotProbedClaude: 'Claude Code CLI route 还没有执行 probe。',
      routeNotProbedCodex: 'Codex CLI route 还没有执行 probe。',
      routeUnknown: '未知的 provider 连接状态。',
    },
    aiParent: {
      description: 'Provider、模型与聊天限制。',
      title: 'AI',
    },
    commander: {
      description: '当 commander-specific 选项从 widget-local state 中抽离出来后，这个部分会承载它们。',
      notConnected: 'Commander 的独立配置界面还没有接入。',
      planned: 'Planned',
      preferencesTitle: 'Commander 偏好',
      title: '部分状态',
    },
    providerRouteStates: {
      authRequired: '需要登录',
      disabled: '已禁用',
      modelUnavailable: '模型不可用',
      needsAttention: '需要关注',
      ready: '就绪',
      unchecked: '未检查',
      unreachable: '不可达',
    },
    sections: {
      general: {
        navTitle: '常规',
        navDescription: 'runtime 模式、shell 语言与 bootstrap context。',
        shellTitle: '常规',
        shellDescription: '桌面 runtime 生命周期、语言选择和当前 shell bootstrap context。',
        groupLabel: 'General',
      },
      'ai-apps': {
        navTitle: 'AI providers',
        navDescription: '用于 AI runtime 的 CLI 和 HTTP providers。',
        shellTitle: 'AI / Providers',
        shellDescription:
          '管理 CLI 和 OpenAI-compatible HTTP providers、它们在 runtime 中的可用性，以及连接参数，而不离开共享 settings shell。',
        groupLabel: 'AI',
      },
      'ai-models': {
        navTitle: '模型',
        navDescription: '主聊天中可用的模型。',
        shellTitle: 'AI / 模型',
        shellDescription: '后端为活动 provider 返回的模型目录，以及它们在主 AI 聊天中的暴露方式。',
        groupLabel: 'AI',
      },
      'ai-composer': {
        navTitle: 'Composer',
        navDescription: '聊天中的 Enter / Shift+Enter 行为。',
        shellTitle: 'AI / Composer',
        shellDescription:
          'AI composer 的 runtime-backed 键盘行为：发送/换行快捷键保存在共享的 settings contract 中。',
        groupLabel: 'AI',
      },
      'ai-limits': {
        navTitle: '限制',
        navDescription: '路由就绪状态与未来的 quota surface。',
        shellTitle: 'AI / 限制',
        shellDescription:
          '当前 provider 的 readiness surface。完整的 quota 和 rate-limit contract 将由后端单独补上。',
        groupLabel: 'AI',
      },
      terminal: {
        navTitle: 'Terminal',
        navDescription: '终端 runtime 偏好。',
        shellTitle: 'Terminal',
        shellDescription: '终端 runtime 和未来终端偏好的专用入口，不与通用或 AI 设置混合。',
        groupLabel: 'Runtime',
      },
      remote: {
        navTitle: 'Remote',
        navDescription: 'SSH profiles 与 config 导入。',
        shellTitle: 'Remote',
        shellDescription:
          'backend-owned SSH profiles、精简的 ~/.ssh/config 导入，以及对高级远程拓扑的明确边界。',
        groupLabel: 'Runtime',
      },
      mcp: {
        navTitle: 'MCP',
        navDescription: '外部服务器注册与生命周期。',
        shellTitle: 'MCP',
        shellDescription:
          '注册远程 MCP endpoint，并通过 backend-owned MCP runtime 管理生命周期，而不引入隐式 AI context 注入。',
        groupLabel: 'Runtime',
      },
      plugins: {
        navTitle: 'Plugins',
        navDescription: '本地目录与安装生命周期。',
        shellTitle: 'Plugins',
        shellDescription:
          'backend-owned 本地 plugin catalog，使用明确的 git/zip 安装源、runtime-safe 激活检查以及面向未来的访问元数据。',
        groupLabel: 'Runtime',
      },
      commander: {
        navTitle: 'Commander',
        navDescription: '文件管理器界面设置。',
        shellTitle: 'Commander',
        shellDescription:
          '文件管理器和双栏行为的导航界面。Commander-specific 选项会随着脱离 widget-local state 而逐步出现在这里。',
        groupLabel: 'Workspace',
      },
    },
    sidebar: {
      description: 'shell、AI runtime、terminal、remote、MCP、plugins 与 commander 的统一导航器。',
      product: 'Rune Terminal',
      settings: '设置',
    },
  },
  es: {
    aiLimits: {
      activeBadge: 'active',
      description:
        'Esta superficie solo muestra la disponibilidad de las rutas para el chat. Las cuotas y límites reales llegarán en un paso backend separado.',
      loading: 'Cargando provider catalog…',
      noProviders: 'Todavía no hay providers.',
      routeActive: 'Provider activo para el runtime actual del chat.',
      routeAuthRequired: 'Necesita un login local del CLI antes de poder usar la ruta.',
      routeConfiguredHttp:
        'La fuente HTTP está configurada. Usa refresh models para validar el catálogo remoto.',
      routeDisabled: 'Provider deshabilitado; el chat no enviará solicitudes aquí.',
      routeDisabledHttp: 'Fuente HTTP deshabilitada; el chat no enviará solicitudes aquí.',
      routeReady: 'La backend-owned route está lista para tráfico de chat.',
      routeUnchecked: 'La route todavía no ha sido probada.',
      routeUnknown: 'Estado de disponibilidad del provider desconocido.',
      title: 'Estado de providers',
    },
    aiModels: {
      availableModelsTitle: 'Modelos disponibles',
      countModels: (count) => `${count} modelo${count === 1 ? '' : 's'}`,
      defaultBadge: 'default',
      defaultModelDescription:
        'Modelo base del provider. Siempre está disponible en la interfaz principal de AI.',
      enabledModelDescription: 'Actívalo para exponer el modelo en el desplegable principal del chat AI.',
      exposeModelAriaLabel: (model) => `Exponer ${model} en el selector principal de modelos AI`,
      loadingShort: 'Cargando…',
      loadingProviders: 'Cargando provider catalog…',
      noDiscoveredModels: 'El backend todavía no devolvió modelos para este provider.',
      noProviders:
        'Todavía no hay providers AI directos. Añade primero una fuente CLI o HTTP en la sección `Aplicaciones instaladas`.',
      providerAvailable: 'Disponible para activarse en el provider catalog.',
      providerActive: 'Activo ahora mismo en el runtime.',
      refreshModels: 'Actualizar modelos',
      sectionDescription:
        'Cambia de provider para inspeccionar el catálogo autodetectado disponible para el selector principal del chat.',
      routeNotConfigured: 'La URL de la fuente OpenAI-compatible no está configurada.',
      routeNotProbedClaude: 'La Claude Code CLI route todavía no ha sido probada.',
      routeNotProbedCodex: 'La Codex CLI route todavía no ha sido probada.',
      routeUnknown: 'Estado de conexión del provider desconocido.',
    },
    aiParent: {
      description: 'Providers, modelos y límites del chat.',
      title: 'AI',
    },
    commander: {
      description:
        'Esta sección queda reservada para opciones específicas de commander cuando salgan del widget-local state.',
      notConnected: 'La superficie de configuración dedicada para commander aún no está conectada.',
      planned: 'Planned',
      preferencesTitle: 'Preferencias de commander',
      title: 'Estado de la sección',
    },
    providerRouteStates: {
      authRequired: 'Login requerido',
      disabled: 'Deshabilitado',
      modelUnavailable: 'Modelo no disponible',
      needsAttention: 'Requiere atención',
      ready: 'Listo',
      unchecked: 'Sin probar',
      unreachable: 'Inalcanzable',
    },
    sections: {
      general: {
        navTitle: 'General',
        navDescription: 'Modo del runtime, idioma del shell y bootstrap context.',
        shellTitle: 'General',
        shellDescription:
          'Ciclo de vida del runtime de escritorio, selección de idioma y bootstrap context actual del shell.',
        groupLabel: 'General',
      },
      'ai-apps': {
        navTitle: 'AI providers',
        navDescription: 'CLI y HTTP providers para el AI runtime.',
        shellTitle: 'AI / Providers',
        shellDescription:
          'Gestiona providers CLI y OpenAI-compatible HTTP, su disponibilidad en runtime y sus parámetros de conexión sin salir del settings shell compartido.',
        groupLabel: 'AI',
      },
      'ai-models': {
        navTitle: 'Modelos',
        navDescription: 'Modelos expuestos al chat principal.',
        shellTitle: 'AI / Modelos',
        shellDescription:
          'Catálogo de modelos que el backend devolvió para los providers activos y su exposición en el chat principal de AI.',
        groupLabel: 'AI',
      },
      'ai-composer': {
        navTitle: 'Composer',
        navDescription: 'Comportamiento de Enter / Shift+Enter en el chat.',
        shellTitle: 'AI / Composer',
        shellDescription:
          'Comportamiento de teclado runtime-backed para el AI composer: la selección de enviar/salto de línea se guarda en el contrato compartido de settings.',
        groupLabel: 'AI',
      },
      'ai-limits': {
        navTitle: 'Límites',
        navDescription: 'Estado de las routes y futuras superficies de cuota.',
        shellTitle: 'AI / Límites',
        shellDescription:
          'Superficie actual de readiness de providers. Los contratos completos de quota y rate-limit llegarán en un paso backend aparte.',
        groupLabel: 'AI',
      },
      terminal: {
        navTitle: 'Terminal',
        navDescription: 'Preferencias del runtime terminal.',
        shellTitle: 'Terminal',
        shellDescription:
          'Punto de entrada dedicado para el runtime terminal y futuras preferencias del terminal, sin mezclarlo con settings generales o de AI.',
        groupLabel: 'Runtime',
      },
      remote: {
        navTitle: 'Remote',
        navDescription: 'Perfiles SSH e importación de config.',
        shellTitle: 'Remote',
        shellDescription:
          'Perfiles SSH backend-owned, importación estrecha de ~/.ssh/config y límites explícitos alrededor de la topología remota avanzada.',
        groupLabel: 'Runtime',
      },
      mcp: {
        navTitle: 'MCP',
        navDescription: 'Registro de servidores externos y ciclo de vida.',
        shellTitle: 'MCP',
        shellDescription:
          'Registra endpoints MCP remotos y controla su ciclo de vida mediante el runtime MCP backend-owned sin inyección implícita de contexto AI.',
        groupLabel: 'Runtime',
      },
      plugins: {
        navTitle: 'Plugins',
        navDescription: 'Catálogo local y ciclo de instalación.',
        shellTitle: 'Plugins',
        shellDescription:
          'Catálogo local de plugins backend-owned con fuentes explícitas git/zip, validaciones de activación seguras para el runtime y metadatos de acceso orientados al futuro.',
        groupLabel: 'Runtime',
      },
      commander: {
        navTitle: 'Commander',
        navDescription: 'Settings de la superficie del gestor de archivos.',
        shellTitle: 'Commander',
        shellDescription:
          'Superficie de navegación para el gestor de archivos y el comportamiento dual-pane. Las opciones específicas de commander aparecerán aquí cuando salgan del widget-local state.',
        groupLabel: 'Workspace',
      },
    },
    sidebar: {
      description: 'Navegador común para shell, AI runtime, terminal, remote, MCP, plugins y commander.',
      product: 'Rune Terminal',
      settings: 'Settings',
    },
  },
}
