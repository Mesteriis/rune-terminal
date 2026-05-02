import type { AppLocale } from '@/shared/api/runtime'

type PreviewPanelWidgetCopy = {
  copiedPath: string
  copying: string
  copyPath: string
  empty: string
  folder: string
  hexPreview: string
  loading: string
  openContainingFolder: string
  openFile: string
  openFileExternally: string
  opening: string
  refresh: string
  refreshPreview: string
  tableLimit: (rows: number, columns: number) => string
  tablePreview: (delimiter: string) => string
  textPreview: string
  truncated: string
  unknownSize: string
}

export const previewPanelWidgetCopy: Record<AppLocale, PreviewPanelWidgetCopy> = {
  en: {
    copiedPath: 'Copied preview file path to clipboard.',
    copying: 'Copying...',
    copyPath: 'Copy preview file path',
    empty: 'Preview is empty',
    folder: 'Folder',
    hexPreview: 'Hex preview',
    loading: 'Loading preview',
    openContainingFolder: 'Open preview containing folder externally',
    openFile: 'Open file',
    openFileExternally: 'Open preview file externally',
    opening: 'Opening...',
    refresh: 'Refresh',
    refreshPreview: 'Refresh preview',
    tableLimit: (rows, columns) => `Table preview is bounded to ${rows} rows and ${columns} columns.`,
    tablePreview: (delimiter) => `${delimiter} table preview`,
    textPreview: 'Text preview',
    truncated: 'truncated',
    unknownSize: 'unknown size',
  },
  ru: {
    copiedPath: 'Путь preview файла скопирован в буфер.',
    copying: 'Копирование...',
    copyPath: 'Копировать путь preview файла',
    empty: 'Preview пуст',
    folder: 'Папка',
    hexPreview: 'Hex preview',
    loading: 'Загрузка preview',
    openContainingFolder: 'Открыть папку preview файла внешне',
    openFile: 'Открыть файл',
    openFileExternally: 'Открыть preview файл внешне',
    opening: 'Открытие...',
    refresh: 'Обновить',
    refreshPreview: 'Обновить preview',
    tableLimit: (rows, columns) => `Preview таблицы ограничен: ${rows} строк и ${columns} колонок.`,
    tablePreview: (delimiter) => `${delimiter} table preview`,
    textPreview: 'Текстовый preview',
    truncated: 'обрезано',
    unknownSize: 'размер неизвестен',
  },
  'zh-CN': {
    copiedPath: 'Preview 文件路径已复制到剪贴板。',
    copying: '正在复制...',
    copyPath: '复制 preview 文件路径',
    empty: 'Preview 为空',
    folder: '文件夹',
    hexPreview: 'Hex preview',
    loading: '正在加载 preview',
    openContainingFolder: '外部打开 preview 文件所在文件夹',
    openFile: '打开文件',
    openFileExternally: '外部打开 preview 文件',
    opening: '正在打开...',
    refresh: '刷新',
    refreshPreview: '刷新 preview',
    tableLimit: (rows, columns) => `表格 preview 限制为 ${rows} 行和 ${columns} 列。`,
    tablePreview: (delimiter) => `${delimiter} table preview`,
    textPreview: '文本 preview',
    truncated: '已截断',
    unknownSize: '未知大小',
  },
  es: {
    copiedPath: 'Ruta del archivo preview copiada al portapapeles.',
    copying: 'Copiando...',
    copyPath: 'Copiar ruta del archivo preview',
    empty: 'Preview vacio',
    folder: 'Carpeta',
    hexPreview: 'Hex preview',
    loading: 'Cargando preview',
    openContainingFolder: 'Abrir carpeta del archivo preview externamente',
    openFile: 'Abrir archivo',
    openFileExternally: 'Abrir archivo preview externamente',
    opening: 'Abriendo...',
    refresh: 'Actualizar',
    refreshPreview: 'Actualizar preview',
    tableLimit: (rows, columns) => `El preview de tabla se limita a ${rows} filas y ${columns} columnas.`,
    tablePreview: (delimiter) => `${delimiter} table preview`,
    textPreview: 'Preview de texto',
    truncated: 'truncado',
    unknownSize: 'tamano desconocido',
  },
}
