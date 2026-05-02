import type { AppLocale } from '@/shared/api/runtime'

export const commanderPaneCopy: Record<
  AppLocale,
  {
    active: string
    git: string
    items: (count: number) => string
    loadingDirectory: string
    modified: string
    name: string
    pane: string
    selected: (count: number) => string
    size: string
    sortByModified: string
    sortByName: string
    sortBySize: string
    sortByType: string
    type: string
  }
> = {
  en: {
    active: 'ACTIVE',
    git: 'Git',
    items: (count) => `${count} items`,
    loadingDirectory: 'Loading directory…',
    modified: 'Modified',
    name: 'Name',
    pane: 'PANE',
    selected: (count) => `${count} selected`,
    size: 'Size',
    sortByModified: 'Sort by modified',
    sortByName: 'Sort by name',
    sortBySize: 'Sort by size',
    sortByType: 'Sort by type',
    type: 'T',
  },
  ru: {
    active: 'АКТИВНА',
    git: 'Git',
    items: (count) => `${count} элементов`,
    loadingDirectory: 'Загрузка каталога…',
    modified: 'Изменено',
    name: 'Имя',
    pane: 'ПАНЕЛЬ',
    selected: (count) => `${count} выбрано`,
    size: 'Размер',
    sortByModified: 'Сортировать по изменению',
    sortByName: 'Сортировать по имени',
    sortBySize: 'Сортировать по размеру',
    sortByType: 'Сортировать по типу',
    type: 'Т',
  },
  'zh-CN': {
    active: '活动',
    git: 'Git',
    items: (count) => `${count} 个条目`,
    loadingDirectory: '正在加载目录…',
    modified: '修改时间',
    name: '名称',
    pane: '面板',
    selected: (count) => `已选择 ${count}`,
    size: '大小',
    sortByModified: '按修改时间排序',
    sortByName: '按名称排序',
    sortBySize: '按大小排序',
    sortByType: '按类型排序',
    type: '类',
  },
  es: {
    active: 'ACTIVO',
    git: 'Git',
    items: (count) => `${count} elementos`,
    loadingDirectory: 'Cargando directorio…',
    modified: 'Modificado',
    name: 'Nombre',
    pane: 'PANEL',
    selected: (count) => `${count} seleccionados`,
    size: 'Tamano',
    sortByModified: 'Ordenar por modificacion',
    sortByName: 'Ordenar por nombre',
    sortBySize: 'Ordenar por tamano',
    sortByType: 'Ordenar por tipo',
    type: 'T',
  },
}
