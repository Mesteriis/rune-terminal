import type { AppLocale } from '@/shared/api/runtime'

type RightActionRailWidgetCopy = {
  catalogUnavailable: string
  createWidget: (label: string) => string
  createWidgetMenu: string
  createWorkspace: string
  frontendLocal: string
  loadingCatalog: string
  needsFilePath: string
  notReportedByBackend: string
  openSettingsPanel: string
  openUtilityPanel: string
  planned: string
  rightActionRail: string
  settingsDescription: string
  settingsTitle: string
  unavailable: string
  unavailableWidget: (label: string, reason: string) => string
  workspaceTitle: string
}

export const rightActionRailWidgetCopy: Record<AppLocale, RightActionRailWidgetCopy> = {
  en: {
    catalogUnavailable: 'Catalog unavailable',
    createWidget: (label) => `Create ${label} widget`,
    createWidgetMenu: 'Create widget menu',
    createWorkspace: 'Create workspace',
    frontendLocal: 'Frontend-local',
    loadingCatalog: 'Loading catalog',
    needsFilePath: 'Needs file path',
    notReportedByBackend: 'Not reported by backend',
    openSettingsPanel: 'Open settings panel',
    openUtilityPanel: 'Open utility panel',
    planned: 'Planned',
    rightActionRail: 'Right action rail',
    settingsDescription: 'Navigate shell settings by section: General, AI, Terminal, and Commander.',
    settingsTitle: 'Settings',
    unavailable: 'Unavailable',
    unavailableWidget: (label, reason) => `${label} widget unavailable: ${reason}`,
    workspaceTitle: 'Workspace',
  },
  ru: {
    catalogUnavailable: 'Каталог недоступен',
    createWidget: (label) => `Создать виджет ${label}`,
    createWidgetMenu: 'Меню создания виджета',
    createWorkspace: 'Создать workspace',
    frontendLocal: 'Frontend-local',
    loadingCatalog: 'Загрузка каталога',
    needsFilePath: 'Нужен путь к файлу',
    notReportedByBackend: 'Нет данных от приложения',
    openSettingsPanel: 'Открыть настройки',
    openUtilityPanel: 'Открыть панель инструментов',
    planned: 'Запланировано',
    rightActionRail: 'Правая панель действий',
    settingsDescription: 'Настройки оболочки, AI, терминала, удалённого доступа, MCP, плагинов и Commander.',
    settingsTitle: 'Настройки',
    unavailable: 'Недоступно',
    unavailableWidget: (label, reason) => `${label} недоступен: ${reason}`,
    workspaceTitle: 'Workspace',
  },
  'zh-CN': {
    catalogUnavailable: '目录不可用',
    createWidget: (label) => `创建 ${label} widget`,
    createWidgetMenu: '创建 widget 菜单',
    createWorkspace: '创建 workspace',
    frontendLocal: 'Frontend-local',
    loadingCatalog: '正在加载目录',
    needsFilePath: '需要文件路径',
    notReportedByBackend: 'Backend 未报告',
    openSettingsPanel: '打开设置',
    openUtilityPanel: '打开工具面板',
    planned: '已规划',
    rightActionRail: '右侧操作栏',
    settingsDescription: '按部分浏览 shell 设置：通用、AI、Terminal 和 Commander。',
    settingsTitle: '设置',
    unavailable: '不可用',
    unavailableWidget: (label, reason) => `${label} widget 不可用：${reason}`,
    workspaceTitle: 'Workspace',
  },
  es: {
    catalogUnavailable: 'Catalogo no disponible',
    createWidget: (label) => `Crear widget ${label}`,
    createWidgetMenu: 'Menu de creacion de widgets',
    createWorkspace: 'Crear workspace',
    frontendLocal: 'Frontend-local',
    loadingCatalog: 'Cargando catalogo',
    needsFilePath: 'Necesita ruta de archivo',
    notReportedByBackend: 'Backend no lo informa',
    openSettingsPanel: 'Abrir ajustes',
    openUtilityPanel: 'Abrir panel de utilidades',
    planned: 'Planificado',
    rightActionRail: 'Barra derecha de acciones',
    settingsDescription: 'Navega los ajustes de shell por seccion: General, AI, Terminal y Commander.',
    settingsTitle: 'Ajustes',
    unavailable: 'No disponible',
    unavailableWidget: (label, reason) => `${label} no disponible: ${reason}`,
    workspaceTitle: 'Workspace',
  },
}
