import type { AppLocale } from '@/shared/api/runtime'

type FilesPanelWidgetCopy = {
  actions: string
  attachFileToAi: (name: string) => string
  clear: string
  clearFilesFilter: string
  copy: string
  copyCurrentDirectoryPath: string
  copyPath: string
  copyPathForFile: (name: string) => string
  copiedPathFor: (label: string) => string
  copyingPathFor: (label: string) => string
  currentDirectory: string
  directoryEmpty: string
  filter: string
  filterFiles: string
  folder: string
  hiddenOff: string
  hiddenOn: string
  hideHiddenFiles: string
  kind: string
  loadingDirectory: string
  modified: string
  name: string
  noEntriesMatchFilter: string
  noVisibleEntries: string
  open: string
  openContainingFolderForFile: (name: string) => string
  openCurrentDirectoryExternally: string
  openDirectory: (name: string) => string
  openDir: string
  openFile: (name: string) => string
  openFilesPath: string
  openParentDirectory: string
  openTerminalForFile: (name: string) => string
  openTerminalInCurrentDirectory: string
  parent: string
  path: string
  pathPlaceholder: string
  preview: string
  previewFile: (name: string) => string
  refresh: string
  refreshDirectory: string
  shellTitle: string
  showHiddenFiles: string
  size: string
  sortByKind: string
  sortByModified: string
  sortByName: string
  sortBySize: string
  term: string
  terminal: string
  terminalTargetUnavailable: string
  previewTargetUnavailable: string
}

export const filesPanelWidgetCopy: Record<AppLocale, FilesPanelWidgetCopy> = {
  en: {
    actions: 'Actions',
    attachFileToAi: (name) => `Attach file ${name} to AI`,
    clear: 'Clear',
    clearFilesFilter: 'Clear files filter',
    copy: 'Copy',
    copyCurrentDirectoryPath: 'Copy current directory path',
    copyPath: 'Copy path',
    copyPathForFile: (name) => `Copy path for file ${name}`,
    copiedPathFor: (label) => `Copied path for ${label}`,
    copyingPathFor: (label) => `Copying path for ${label}`,
    currentDirectory: 'current directory',
    directoryEmpty: 'Directory is empty',
    filter: 'Filter',
    filterFiles: 'Filter files',
    folder: 'Folder',
    hiddenOff: 'Hidden off',
    hiddenOn: 'Hidden on',
    hideHiddenFiles: 'Hide hidden files',
    kind: 'Kind',
    loadingDirectory: 'Loading directory',
    modified: 'Modified',
    name: 'Name',
    noEntriesMatchFilter: 'No entries match filter',
    noVisibleEntries: 'No visible entries',
    open: 'Open',
    openContainingFolderForFile: (name) => `Open containing folder for file ${name}`,
    openCurrentDirectoryExternally: 'Open current directory externally',
    openDirectory: (name) => `Open directory ${name}`,
    openDir: 'Open dir',
    openFile: (name) => `Open file ${name}`,
    openFilesPath: 'Open files path',
    openParentDirectory: 'Open parent directory',
    openTerminalForFile: (name) => `Open terminal for file ${name}`,
    openTerminalInCurrentDirectory: 'Open terminal in current directory',
    parent: 'Parent',
    path: 'Files path',
    pathPlaceholder: 'Path',
    preview: 'Preview',
    previewFile: (name) => `Preview file ${name}`,
    previewTargetUnavailable: 'Preview target widget is unavailable',
    refresh: 'Refresh',
    refreshDirectory: 'Refresh directory',
    shellTitle: 'Shell',
    showHiddenFiles: 'Show hidden files',
    size: 'Size',
    sortByKind: 'Sort files by kind',
    sortByModified: 'Sort files by modified time',
    sortByName: 'Sort files by name',
    sortBySize: 'Sort files by size',
    term: 'Term',
    terminal: 'Terminal',
    terminalTargetUnavailable: 'Terminal target widget is unavailable',
  },
  ru: {
    actions: 'Действия',
    attachFileToAi: (name) => `Прикрепить файл ${name} к AI`,
    clear: 'Очистить',
    clearFilesFilter: 'Очистить фильтр files',
    copy: 'Копировать',
    copyCurrentDirectoryPath: 'Копировать путь текущего каталога',
    copyPath: 'Копировать путь',
    copyPathForFile: (name) => `Копировать путь файла ${name}`,
    copiedPathFor: (label) => `Путь скопирован для ${label}`,
    copyingPathFor: (label) => `Копирование пути для ${label}`,
    currentDirectory: 'текущий каталог',
    directoryEmpty: 'Каталог пуст',
    filter: 'Фильтр',
    filterFiles: 'Фильтр files',
    folder: 'Папка',
    hiddenOff: 'Скрытые выкл',
    hiddenOn: 'Скрытые вкл',
    hideHiddenFiles: 'Скрыть скрытые files',
    kind: 'Тип',
    loadingDirectory: 'Загрузка каталога',
    modified: 'Изменено',
    name: 'Имя',
    noEntriesMatchFilter: 'Нет элементов по фильтру',
    noVisibleEntries: 'Нет видимых элементов',
    open: 'Открыть',
    openContainingFolderForFile: (name) => `Открыть папку файла ${name}`,
    openCurrentDirectoryExternally: 'Открыть текущий каталог внешне',
    openDirectory: (name) => `Открыть каталог ${name}`,
    openDir: 'Открыть каталог',
    openFile: (name) => `Открыть файл ${name}`,
    openFilesPath: 'Открыть путь files',
    openParentDirectory: 'Открыть родительский каталог',
    openTerminalForFile: (name) => `Открыть terminal для файла ${name}`,
    openTerminalInCurrentDirectory: 'Открыть terminal в текущем каталоге',
    parent: 'Выше',
    path: 'Путь files',
    pathPlaceholder: 'Путь',
    preview: 'Preview',
    previewFile: (name) => `Preview файла ${name}`,
    previewTargetUnavailable: 'Целевой preview widget недоступен',
    refresh: 'Обновить',
    refreshDirectory: 'Обновить каталог',
    shellTitle: 'Shell',
    showHiddenFiles: 'Показать скрытые files',
    size: 'Размер',
    sortByKind: 'Сортировать files по типу',
    sortByModified: 'Сортировать files по времени изменения',
    sortByName: 'Сортировать files по имени',
    sortBySize: 'Сортировать files по размеру',
    term: 'Term',
    terminal: 'Terminal',
    terminalTargetUnavailable: 'Целевой terminal widget недоступен',
  },
  'zh-CN': {
    actions: '操作',
    attachFileToAi: (name) => `将文件 ${name} 附加到 AI`,
    clear: '清除',
    clearFilesFilter: '清除 files 过滤器',
    copy: '复制',
    copyCurrentDirectoryPath: '复制当前目录路径',
    copyPath: '复制路径',
    copyPathForFile: (name) => `复制文件 ${name} 的路径`,
    copiedPathFor: (label) => `已复制 ${label} 的路径`,
    copyingPathFor: (label) => `正在复制 ${label} 的路径`,
    currentDirectory: '当前目录',
    directoryEmpty: '目录为空',
    filter: '过滤',
    filterFiles: '过滤 files',
    folder: '文件夹',
    hiddenOff: '隐藏关闭',
    hiddenOn: '隐藏开启',
    hideHiddenFiles: '隐藏隐藏 files',
    kind: '类型',
    loadingDirectory: '正在加载目录',
    modified: '修改时间',
    name: '名称',
    noEntriesMatchFilter: '没有匹配过滤器的条目',
    noVisibleEntries: '没有可见条目',
    open: '打开',
    openContainingFolderForFile: (name) => `打开文件 ${name} 所在文件夹`,
    openCurrentDirectoryExternally: '外部打开当前目录',
    openDirectory: (name) => `打开目录 ${name}`,
    openDir: '打开目录',
    openFile: (name) => `打开文件 ${name}`,
    openFilesPath: '打开 files 路径',
    openParentDirectory: '打开上级目录',
    openTerminalForFile: (name) => `为文件 ${name} 打开 terminal`,
    openTerminalInCurrentDirectory: '在当前目录打开 terminal',
    parent: '上级',
    path: 'Files 路径',
    pathPlaceholder: '路径',
    preview: 'Preview',
    previewFile: (name) => `Preview 文件 ${name}`,
    previewTargetUnavailable: 'Preview 目标 widget 不可用',
    refresh: '刷新',
    refreshDirectory: '刷新目录',
    shellTitle: 'Shell',
    showHiddenFiles: '显示隐藏 files',
    size: '大小',
    sortByKind: '按类型排序 files',
    sortByModified: '按修改时间排序 files',
    sortByName: '按名称排序 files',
    sortBySize: '按大小排序 files',
    term: 'Term',
    terminal: 'Terminal',
    terminalTargetUnavailable: 'Terminal 目标 widget 不可用',
  },
  es: {
    actions: 'Acciones',
    attachFileToAi: (name) => `Adjuntar archivo ${name} a AI`,
    clear: 'Limpiar',
    clearFilesFilter: 'Limpiar filtro de files',
    copy: 'Copiar',
    copyCurrentDirectoryPath: 'Copiar ruta del directorio actual',
    copyPath: 'Copiar ruta',
    copyPathForFile: (name) => `Copiar ruta del archivo ${name}`,
    copiedPathFor: (label) => `Ruta copiada para ${label}`,
    copyingPathFor: (label) => `Copiando ruta para ${label}`,
    currentDirectory: 'directorio actual',
    directoryEmpty: 'Directorio vacio',
    filter: 'Filtro',
    filterFiles: 'Filtrar files',
    folder: 'Carpeta',
    hiddenOff: 'Ocultos desactivados',
    hiddenOn: 'Ocultos activados',
    hideHiddenFiles: 'Ocultar files ocultos',
    kind: 'Tipo',
    loadingDirectory: 'Cargando directorio',
    modified: 'Modificado',
    name: 'Nombre',
    noEntriesMatchFilter: 'No hay entradas para el filtro',
    noVisibleEntries: 'No hay entradas visibles',
    open: 'Abrir',
    openContainingFolderForFile: (name) => `Abrir carpeta del archivo ${name}`,
    openCurrentDirectoryExternally: 'Abrir directorio actual externamente',
    openDirectory: (name) => `Abrir directorio ${name}`,
    openDir: 'Abrir dir',
    openFile: (name) => `Abrir archivo ${name}`,
    openFilesPath: 'Abrir ruta de files',
    openParentDirectory: 'Abrir directorio padre',
    openTerminalForFile: (name) => `Abrir terminal para archivo ${name}`,
    openTerminalInCurrentDirectory: 'Abrir terminal en el directorio actual',
    parent: 'Padre',
    path: 'Ruta de files',
    pathPlaceholder: 'Ruta',
    preview: 'Preview',
    previewFile: (name) => `Preview del archivo ${name}`,
    previewTargetUnavailable: 'El widget preview de destino no esta disponible',
    refresh: 'Actualizar',
    refreshDirectory: 'Actualizar directorio',
    shellTitle: 'Shell',
    showHiddenFiles: 'Mostrar files ocultos',
    size: 'Tamano',
    sortByKind: 'Ordenar files por tipo',
    sortByModified: 'Ordenar files por fecha de modificacion',
    sortByName: 'Ordenar files por nombre',
    sortBySize: 'Ordenar files por tamano',
    term: 'Term',
    terminal: 'Terminal',
    terminalTargetUnavailable: 'El widget terminal de destino no esta disponible',
  },
}
