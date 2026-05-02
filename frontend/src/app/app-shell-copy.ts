import type { AppLocale } from '@/shared/api/runtime'

export const appShellCopy: Record<
  AppLocale,
  {
    loadingWidgetCatalog: string
    loadingWidgetCatalogAria: string
  }
> = {
  en: {
    loadingWidgetCatalog: 'Loading widget catalog',
    loadingWidgetCatalogAria: 'Loading workspace widget catalog',
  },
  ru: {
    loadingWidgetCatalog: 'Загрузка каталога виджетов',
    loadingWidgetCatalogAria: 'Загрузка каталога workspace widgets',
  },
  'zh-CN': {
    loadingWidgetCatalog: '正在加载 widget 目录',
    loadingWidgetCatalogAria: '正在加载 workspace widget 目录',
  },
  es: {
    loadingWidgetCatalog: 'Cargando catalogo de widgets',
    loadingWidgetCatalogAria: 'Cargando catalogo de widgets del workspace',
  },
}
