import type { AppLocale } from '@/shared/api/runtime'

type ShellTopbarWidgetCopy = {
  addWorkspace: string
  cancel: string
  closeWindow: string
  collapseWindow: string
  delete: string
  rename: string
  save: string
  toggleAiPanel: string
  toggleFullscreen: string
  workspaceActions: (title: string) => string
  workspaceName: string
  workspaceTabs: string
}

export const shellTopbarWidgetCopy: Record<AppLocale, ShellTopbarWidgetCopy> = {
  en: {
    addWorkspace: 'Add workspace',
    cancel: 'Cancel',
    closeWindow: 'Close window',
    collapseWindow: 'Collapse window',
    delete: 'Delete',
    rename: 'Rename',
    save: 'Save',
    toggleAiPanel: 'Toggle AI panel',
    toggleFullscreen: 'Toggle fullscreen',
    workspaceActions: (title) => `Workspace actions for ${title}`,
    workspaceName: 'Workspace name',
    workspaceTabs: 'Workspace tabs',
  },
  ru: {
    addWorkspace: 'Добавить workspace',
    cancel: 'Отмена',
    closeWindow: 'Закрыть окно',
    collapseWindow: 'Свернуть окно',
    delete: 'Удалить',
    rename: 'Переименовать',
    save: 'Сохранить',
    toggleAiPanel: 'Переключить AI-панель',
    toggleFullscreen: 'Переключить полноэкранный режим',
    workspaceActions: (title) => `Действия workspace для ${title}`,
    workspaceName: 'Имя workspace',
    workspaceTabs: 'Вкладки workspace',
  },
  'zh-CN': {
    addWorkspace: '添加 workspace',
    cancel: '取消',
    closeWindow: '关闭窗口',
    collapseWindow: '折叠窗口',
    delete: '删除',
    rename: '重命名',
    save: '保存',
    toggleAiPanel: '切换 AI 面板',
    toggleFullscreen: '切换全屏',
    workspaceActions: (title) => `${title} 的 workspace 操作`,
    workspaceName: 'Workspace 名称',
    workspaceTabs: 'Workspace 标签页',
  },
  es: {
    addWorkspace: 'Agregar workspace',
    cancel: 'Cancelar',
    closeWindow: 'Cerrar ventana',
    collapseWindow: 'Contraer ventana',
    delete: 'Eliminar',
    rename: 'Renombrar',
    save: 'Guardar',
    toggleAiPanel: 'Alternar panel de AI',
    toggleFullscreen: 'Alternar pantalla completa',
    workspaceActions: (title) => `Acciones de workspace para ${title}`,
    workspaceName: 'Nombre del workspace',
    workspaceTabs: 'Pestanas de workspace',
  },
}
