import { type ReactNode, useEffect, useMemo, useState } from 'react'

import {
  deleteInstalledPlugin,
  disablePlugin,
  enablePlugin,
  fetchInstalledPlugins,
  installPlugin,
  type InstalledPluginView,
  type PluginCatalogView,
  type PluginInstallSourceKind,
  updateInstalledPlugin,
} from '@/features/plugins/api/client'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import type { AppLocale } from '@/shared/api/runtime'
import { ClearBox } from '@/shared/ui/components'
import { Button, Input, Select, Text, TextArea } from '@/shared/ui/primitives'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellErrorTextStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

type PluginsSettingsCopy = {
  allowedUsersAria: string
  actor: (username: string) => string
  catalogDescription: string
  catalogTitle: string
  description: string
  disable: string
  disabledStatus: string
  enabledCount: (count: number) => string
  enable: string
  enabledStatus: string
  errorChangeState: string
  errorDuplicateMetadataKey: (key: string) => string
  errorInstall: string
  errorLoad: string
  errorMetadataFormat: string
  errorMetadataKey: string
  filterAria: string
  filterPlaceholder: string
  gitRefAria: string
  gitRefPlaceholder: string
  gitRepository: string
  installedCount: (count: number) => string
  installing: string
  installFrom: (kind: PluginInstallSourceKind) => string
  installDescription: string
  installedMessage: (name: string) => string
  installTitle: string
  loadingCatalog: string
  metadataAria: string
  metadataCount: (count: number) => string
  noFilterMatches: string
  noPlugins: string
  ownerMeta: (owner: string, visibility?: string, metadataCount?: number) => string
  readyStatus: string
  remove: string
  removedMessage: (name: string) => string
  sourceKindAria: string
  sourceDescription: (kind: PluginInstallSourceKind) => string
  sourceRefDescription: (ref: string) => string
  sourceURLAria: string
  title: string
  toolCount: (count: number) => string
  update: string
  updatedMessage: (name: string, version: string) => string
  validationErrorStatus: string
  visibilityAria: string
  visibilityPrivate: string
  visibilityShared: string
  visibleCount: (count: number) => string
  zipArchive: string
}

const pluginsSettingsCopy: Record<AppLocale, PluginsSettingsCopy> = {
  en: {
    allowedUsersAria: 'Plugin allowed users',
    actor: (username) => `actor: ${username}`,
    catalogDescription: 'Enable, disable, update, or remove installed plugins without reopening the runtime.',
    catalogTitle: 'Catalog',
    description:
      'Local plugin catalog on the backend-owned runtime path. Install sources stay intentionally limited to `git` URLs and `zip` archive URLs.',
    disable: 'Disable',
    disabledStatus: 'disabled',
    enabledCount: (count) => `${count} enabled`,
    enable: 'Enable',
    enabledStatus: 'enabled',
    errorChangeState: 'Unable to change plugin state',
    errorDuplicateMetadataKey: (key) => `Duplicate metadata key: ${key}`,
    errorInstall: 'Unable to install plugin',
    errorLoad: 'Unable to load installed plugins',
    errorMetadataFormat: 'Metadata lines must use `key=value` format.',
    errorMetadataKey: 'Metadata keys must be non-empty.',
    filterAria: 'Filter installed plugins',
    filterPlaceholder: 'Filter by plugin, owner, source, tool, or metadata',
    gitRefAria: 'Plugin git ref',
    gitRefPlaceholder: 'Optional branch or tag',
    gitRepository: 'Git repository',
    installedCount: (count) => `${count} installed`,
    installing: 'Installing…',
    installFrom: (kind) => `Install from ${kind}`,
    installDescription:
      'Access policy fields are persisted now for future rights enforcement, but not enforced yet.',
    installedMessage: (name) => `Installed ${name}.`,
    installTitle: 'Install plugin bundle',
    loadingCatalog: 'Loading plugin catalog…',
    metadataAria: 'Plugin metadata',
    metadataCount: (count) => `meta ${count}`,
    noFilterMatches: 'No installed plugins match current filter.',
    noPlugins: 'No plugins installed yet.',
    ownerMeta: (owner, visibility, metadataCount) =>
      [`owner: ${owner}`, visibility, metadataCount && metadataCount > 0 ? `meta ${metadataCount}` : null]
        .filter(Boolean)
        .join(' · '),
    readyStatus: 'ready',
    remove: 'Remove',
    removedMessage: (name) => `Removed ${name}.`,
    sourceKindAria: 'Plugin source kind',
    sourceDescription: (kind) => `${kind} source`,
    sourceRefDescription: (ref) => `ref ${ref}`,
    sourceURLAria: 'Plugin source URL',
    title: 'Installed plugins',
    toolCount: (count) => `${count} tool${count === 1 ? '' : 's'}`,
    update: 'Update',
    updatedMessage: (name, version) => `Updated ${name} to ${version}.`,
    validationErrorStatus: 'validation error',
    visibilityAria: 'Plugin visibility',
    visibilityPrivate: 'Private',
    visibilityShared: 'Shared',
    visibleCount: (count) => `${count} visible`,
    zipArchive: 'ZIP archive',
  },
  ru: {
    allowedUsersAria: 'Разрешенные пользователи плагина',
    actor: (username) => `актор: ${username}`,
    catalogDescription: 'Включайте, выключайте, обновляйте или удаляйте плагины без перезапуска runtime.',
    catalogTitle: 'Каталог',
    description:
      'Локальный каталог плагинов на backend-owned runtime path. Источники установки намеренно ограничены `git` URL и `zip` archive URL.',
    disable: 'Выключить',
    disabledStatus: 'выключен',
    enabledCount: (count) => `${count} включено`,
    enable: 'Включить',
    enabledStatus: 'включен',
    errorChangeState: 'Не удалось изменить состояние плагина',
    errorDuplicateMetadataKey: (key) => `Повторяющийся ключ metadata: ${key}`,
    errorInstall: 'Не удалось установить плагин',
    errorLoad: 'Не удалось загрузить установленные плагины',
    errorMetadataFormat: 'Строки metadata должны быть в формате `key=value`.',
    errorMetadataKey: 'Ключи metadata не должны быть пустыми.',
    filterAria: 'Фильтр установленных плагинов',
    filterPlaceholder: 'Фильтр по плагину, владельцу, источнику, tool или metadata',
    gitRefAria: 'Git ref плагина',
    gitRefPlaceholder: 'Опциональная ветка или tag',
    gitRepository: 'Git-репозиторий',
    installedCount: (count) => `${count} установлено`,
    installing: 'Установка…',
    installFrom: (kind) => `Установить из ${kind}`,
    installDescription:
      'Поля access policy уже сохраняются для будущего контроля прав, но пока не применяются.',
    installedMessage: (name) => `Установлен ${name}.`,
    installTitle: 'Установка bundle плагина',
    loadingCatalog: 'Загрузка каталога плагинов…',
    metadataAria: 'Metadata плагина',
    metadataCount: (count) => `metadata ${count}`,
    noFilterMatches: 'Нет установленных плагинов по текущему фильтру.',
    noPlugins: 'Плагины пока не установлены.',
    ownerMeta: (owner, visibility, metadataCount) =>
      [
        `владелец: ${owner}`,
        visibility,
        metadataCount && metadataCount > 0 ? `metadata ${metadataCount}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    readyStatus: 'готов',
    remove: 'Удалить',
    removedMessage: (name) => `Удален ${name}.`,
    sourceKindAria: 'Тип источника плагина',
    sourceDescription: (kind) => `источник ${kind}`,
    sourceRefDescription: (ref) => `ref ${ref}`,
    sourceURLAria: 'URL источника плагина',
    title: 'Установленные плагины',
    toolCount: (count) => `${count} tool${count === 1 ? '' : 's'}`,
    update: 'Обновить',
    updatedMessage: (name, version) => `Обновлен ${name} до ${version}.`,
    validationErrorStatus: 'ошибка валидации',
    visibilityAria: 'Видимость плагина',
    visibilityPrivate: 'Private',
    visibilityShared: 'Shared',
    visibleCount: (count) => `${count} видно`,
    zipArchive: 'ZIP-архив',
  },
  'zh-CN': {
    allowedUsersAria: '插件允许用户',
    actor: (username) => `执行者：${username}`,
    catalogDescription: '无需重新打开运行时即可启用、禁用、更新或移除已安装插件。',
    catalogTitle: '目录',
    description: '后端运行时路径上的本地插件目录。安装来源刻意限制为 `git` URL 和 `zip` 归档 URL。',
    disable: '禁用',
    disabledStatus: '已禁用',
    enabledCount: (count) => `已启用 ${count}`,
    enable: '启用',
    enabledStatus: '已启用',
    errorChangeState: '无法更改插件状态',
    errorDuplicateMetadataKey: (key) => `重复的元数据键：${key}`,
    errorInstall: '无法安装插件',
    errorLoad: '无法加载已安装插件',
    errorMetadataFormat: '元数据行必须使用 `key=value` 格式。',
    errorMetadataKey: '元数据键不能为空。',
    filterAria: '筛选已安装插件',
    filterPlaceholder: '按插件、所有者、来源、工具或元数据筛选',
    gitRefAria: '插件 Git ref',
    gitRefPlaceholder: '可选分支或标签',
    gitRepository: 'Git 仓库',
    installedCount: (count) => `已安装 ${count}`,
    installing: '安装中…',
    installFrom: (kind) => `从 ${kind} 安装`,
    installDescription: '访问策略字段现在会持久化，以供未来权限执行使用，但目前尚未强制执行。',
    installedMessage: (name) => `已安装 ${name}。`,
    installTitle: '安装插件包',
    loadingCatalog: '正在加载插件目录…',
    metadataAria: '插件元数据',
    metadataCount: (count) => `元数据 ${count}`,
    noFilterMatches: '没有已安装插件匹配当前筛选条件。',
    noPlugins: '尚未安装插件。',
    ownerMeta: (owner, visibility, metadataCount) =>
      [`所有者：${owner}`, visibility, metadataCount && metadataCount > 0 ? `元数据 ${metadataCount}` : null]
        .filter(Boolean)
        .join(' · '),
    readyStatus: '就绪',
    remove: '移除',
    removedMessage: (name) => `已移除 ${name}。`,
    sourceKindAria: '插件来源类型',
    sourceDescription: (kind) => `${kind} 来源`,
    sourceRefDescription: (ref) => `ref ${ref}`,
    sourceURLAria: '插件来源 URL',
    title: '已安装插件',
    toolCount: (count) => `${count} 个工具`,
    update: '更新',
    updatedMessage: (name, version) => `已将 ${name} 更新到 ${version}。`,
    validationErrorStatus: '验证错误',
    visibilityAria: '插件可见性',
    visibilityPrivate: '私有',
    visibilityShared: '共享',
    visibleCount: (count) => `可见 ${count}`,
    zipArchive: 'ZIP 归档',
  },
  es: {
    allowedUsersAria: 'Usuarios permitidos del plugin',
    actor: (username) => `actor: ${username}`,
    catalogDescription: 'Activa, desactiva, actualiza o elimina plugins instalados sin reabrir runtime.',
    catalogTitle: 'Catalogo',
    description:
      'Catalogo local de plugins en la ruta de runtime propiedad del backend. Las fuentes de instalacion se limitan intencionalmente a URL `git` y URL de archivo `zip`.',
    disable: 'Desactivar',
    disabledStatus: 'desactivado',
    enabledCount: (count) => `${count} activados`,
    enable: 'Activar',
    enabledStatus: 'activado',
    errorChangeState: 'No se pudo cambiar el estado del plugin',
    errorDuplicateMetadataKey: (key) => `Clave de metadata duplicada: ${key}`,
    errorInstall: 'No se pudo instalar el plugin',
    errorLoad: 'No se pudieron cargar los plugins instalados',
    errorMetadataFormat: 'Las lineas de metadata deben usar el formato `key=value`.',
    errorMetadataKey: 'Las claves de metadata no pueden estar vacias.',
    filterAria: 'Filtrar plugins instalados',
    filterPlaceholder: 'Filtrar por plugin, propietario, fuente, herramienta o metadata',
    gitRefAria: 'Git ref del plugin',
    gitRefPlaceholder: 'Rama o etiqueta opcional',
    gitRepository: 'Repositorio Git',
    installedCount: (count) => `${count} instalados`,
    installing: 'Instalando…',
    installFrom: (kind) => `Instalar desde ${kind}`,
    installDescription:
      'Los campos de access policy ya se persisten para una futura aplicacion de permisos, pero aun no se aplican.',
    installedMessage: (name) => `${name} instalado.`,
    installTitle: 'Instalar bundle de plugin',
    loadingCatalog: 'Cargando catalogo de plugins…',
    metadataAria: 'Metadata del plugin',
    metadataCount: (count) => `metadata ${count}`,
    noFilterMatches: 'Ningun plugin instalado coincide con el filtro actual.',
    noPlugins: 'Todavia no hay plugins instalados.',
    ownerMeta: (owner, visibility, metadataCount) =>
      [
        `propietario: ${owner}`,
        visibility,
        metadataCount && metadataCount > 0 ? `metadata ${metadataCount}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    readyStatus: 'listo',
    remove: 'Eliminar',
    removedMessage: (name) => `${name} eliminado.`,
    sourceKindAria: 'Tipo de fuente del plugin',
    sourceDescription: (kind) => `fuente ${kind}`,
    sourceRefDescription: (ref) => `ref ${ref}`,
    sourceURLAria: 'URL fuente del plugin',
    title: 'Plugins instalados',
    toolCount: (count) => `${count} herramienta${count === 1 ? '' : 's'}`,
    update: 'Actualizar',
    updatedMessage: (name, version) => `${name} actualizado a ${version}.`,
    validationErrorStatus: 'error de validacion',
    visibilityAria: 'Visibilidad del plugin',
    visibilityPrivate: 'Privado',
    visibilityShared: 'Compartido',
    visibleCount: (count) => `${count} visibles`,
    zipArchive: 'Archivo ZIP',
  },
}

function pluginMatchesFilter(plugin: InstalledPluginView, rawFilter: string) {
  const filter = rawFilter.trim().toLowerCase()
  if (!filter) {
    return true
  }

  const fields = [
    plugin.id,
    plugin.display_name,
    plugin.description ?? '',
    plugin.plugin_version,
    plugin.source.kind,
    plugin.source.url,
    plugin.access.owner_username,
    plugin.access.visibility ?? '',
    plugin.enabled ? 'enabled' : 'disabled',
    plugin.runtime_status,
    ...Object.entries(plugin.metadata ?? {}).flatMap(([key, value]) => [key, value]),
    ...plugin.tools.map((tool) => tool.name),
  ]

  return fields.some((field) => field.toLowerCase().includes(filter))
}

function parseMetadataDraft(draft: string, copy: PluginsSettingsCopy) {
  const metadata: Record<string, string> = {}
  const seen = new Set<string>()

  for (const rawLine of draft.split(/\r?\n/g)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      throw new Error(copy.errorMetadataFormat)
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    if (!key) {
      throw new Error(copy.errorMetadataKey)
    }
    if (seen.has(key.toLowerCase())) {
      throw new Error(copy.errorDuplicateMetadataKey(key))
    }
    seen.add(key.toLowerCase())
    metadata[key] = value
  }

  return metadata
}

function parseAllowedUsersDraft(draft: string) {
  const seen = new Set<string>()
  const users: string[] = []

  for (const entry of draft.split(/[\n,]/g)) {
    const user = entry.trim()
    if (!user || seen.has(user.toLowerCase())) {
      continue
    }
    seen.add(user.toLowerCase())
    users.push(user)
  }

  return users
}

function formatPluginDescription(plugin: InstalledPluginView, copy: PluginsSettingsCopy) {
  const details = [
    plugin.description,
    copy.sourceDescription(plugin.source.kind),
    plugin.source.ref ? copy.sourceRefDescription(plugin.source.ref) : null,
    copy.toolCount(plugin.tools.length),
  ].filter(Boolean)

  return details.join(' · ')
}

function formatPluginStatus(plugin: InstalledPluginView, copy: PluginsSettingsCopy) {
  if (!plugin.enabled) {
    return copy.disabledStatus
  }
  if (plugin.runtime_status === 'validation_error') {
    return copy.validationErrorStatus
  }
  return copy.readyStatus
}

export function PluginsSettingsSection() {
  const { locale } = useAppLocale()
  const copy = pluginsSettingsCopy[locale]
  const [catalog, setCatalog] = useState<PluginCatalogView | null>(null)
  const [sourceKind, setSourceKind] = useState<PluginInstallSourceKind>('git')
  const [sourceURL, setSourceURL] = useState('')
  const [sourceRef, setSourceRef] = useState('')
  const [metadataDraft, setMetadataDraft] = useState('')
  const [visibilityDraft, setVisibilityDraft] = useState('private')
  const [allowedUsersDraft, setAllowedUsersDraft] = useState('')
  const [filterDraft, setFilterDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [busyPluginID, setBusyPluginID] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const plugins = catalog?.plugins ?? []
  const currentActor = catalog?.current_actor
  const visiblePlugins = useMemo(
    () => plugins.filter((plugin) => pluginMatchesFilter(plugin, filterDraft)),
    [filterDraft, plugins],
  )
  const enabledPluginsCount = plugins.filter((plugin) => plugin.enabled).length
  const hasPlugins = plugins.length > 0

  async function loadPlugins(options: { isCancelled?: () => boolean } = {}) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextCatalog = await fetchInstalledPlugins()
      if (!options.isCancelled?.()) {
        setCatalog(nextCatalog)
      }
    } catch (error) {
      if (!options.isCancelled?.()) {
        setErrorMessage(error instanceof Error ? error.message : copy.errorLoad)
      }
    } finally {
      if (!options.isCancelled?.()) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    void loadPlugins({
      isCancelled: () => cancelled,
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleInstall() {
    setIsSubmitting(true)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const metadata = parseMetadataDraft(metadataDraft, copy)
      const allowedUsers = parseAllowedUsersDraft(allowedUsersDraft)
      const result = await installPlugin({
        access: {
          allowed_users: allowedUsers,
          visibility: visibilityDraft.trim() || undefined,
        },
        metadata,
        source: {
          kind: sourceKind,
          ref: sourceKind === 'git' ? sourceRef : undefined,
          url: sourceURL,
        },
      })

      setCatalog(result.plugins)
      setStatusMessage(copy.installedMessage(result.plugin.display_name || result.plugin.id))
      setSourceURL('')
      setSourceRef('')
      setMetadataDraft('')
      setAllowedUsersDraft('')
      setVisibilityDraft('private')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorInstall)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLifecycleAction(
    plugin: InstalledPluginView,
    action: 'enable' | 'disable' | 'update' | 'delete',
  ) {
    setBusyPluginID(plugin.id)
    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const result =
        action === 'enable'
          ? await enablePlugin(plugin.id)
          : action === 'disable'
            ? await disablePlugin(plugin.id)
            : action === 'update'
              ? await updateInstalledPlugin(plugin.id)
              : await deleteInstalledPlugin(plugin.id)

      setCatalog(result.plugins)
      if (action === 'delete') {
        setStatusMessage(copy.removedMessage(plugin.display_name || plugin.id))
      } else {
        setStatusMessage(
          action === 'update'
            ? copy.updatedMessage(plugin.display_name || plugin.id, result.plugin.plugin_version)
            : action === 'disable'
              ? `${plugin.display_name || plugin.id} ${copy.disabledStatus}.`
              : `${result.plugin.display_name || result.plugin.id} ${copy.enabledStatus}.`,
        )
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorChangeState)
    } finally {
      setBusyPluginID(null)
    }
  }

  return (
    <SectionCard description={copy.description} title={copy.title}>
      <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
        <ClearBox style={settingsShellBadgeStyle}>{copy.installedCount(plugins.length)}</ClearBox>
        <ClearBox style={settingsShellBadgeStyle}>{copy.enabledCount(enabledPluginsCount)}</ClearBox>
        <ClearBox style={settingsShellBadgeStyle}>{copy.visibleCount(visiblePlugins.length)}</ClearBox>
        {currentActor?.username ? (
          <ClearBox style={settingsShellBadgeStyle}>{copy.actor(currentActor.username)}</ClearBox>
        ) : null}
      </ClearBox>

      <ClearBox style={settingsShellSectionCardStyle}>
        <ClearBox style={settingsShellContentHeaderStyle}>
          <Text style={{ fontWeight: 600 }}>{copy.installTitle}</Text>
          <Text style={settingsShellMutedTextStyle}>{copy.installDescription}</Text>
        </ClearBox>
        <ClearBox style={{ display: 'grid', gap: 'var(--gap-sm)' }}>
          <Select
            aria-label={copy.sourceKindAria}
            onChange={(event) => setSourceKind(event.currentTarget.value === 'zip' ? 'zip' : 'git')}
            value={sourceKind}
          >
            <option value="git">{copy.gitRepository}</option>
            <option value="zip">{copy.zipArchive}</option>
          </Select>
          <Input
            aria-label={copy.sourceURLAria}
            onChange={(event) => setSourceURL(event.currentTarget.value)}
            placeholder={
              sourceKind === 'git'
                ? 'https://example.test/rterm-plugin.git'
                : 'file:///tmp/rterm-plugin.zip or https://example.test/rterm-plugin.zip'
            }
            value={sourceURL}
          />
          {sourceKind === 'git' ? (
            <Input
              aria-label={copy.gitRefAria}
              onChange={(event) => setSourceRef(event.currentTarget.value)}
              placeholder={copy.gitRefPlaceholder}
              value={sourceRef}
            />
          ) : null}
          <TextArea
            aria-label={copy.metadataAria}
            onChange={(event) => setMetadataDraft(event.currentTarget.value)}
            placeholder={'team=ops\nservice=terminal'}
            rows={3}
            value={metadataDraft}
          />
          <Select
            aria-label={copy.visibilityAria}
            onChange={(event) => setVisibilityDraft(event.currentTarget.value)}
            value={visibilityDraft}
          >
            <option value="private">{copy.visibilityPrivate}</option>
            <option value="shared">{copy.visibilityShared}</option>
          </Select>
          <TextArea
            aria-label={copy.allowedUsersAria}
            onChange={(event) => setAllowedUsersDraft(event.currentTarget.value)}
            placeholder={'alice\nbob'}
            rows={2}
            value={allowedUsersDraft}
          />
          <Button
            disabled={isSubmitting || sourceURL.trim().length === 0}
            onClick={() => void handleInstall()}
          >
            {isSubmitting ? copy.installing : copy.installFrom(sourceKind)}
          </Button>
        </ClearBox>
      </ClearBox>

      <ClearBox style={settingsShellSectionCardStyle}>
        <ClearBox style={settingsShellContentHeaderStyle}>
          <Text style={{ fontWeight: 600 }}>{copy.catalogTitle}</Text>
          <Text style={settingsShellMutedTextStyle}>{copy.catalogDescription}</Text>
        </ClearBox>
        <Input
          aria-label={copy.filterAria}
          onChange={(event) => setFilterDraft(event.currentTarget.value)}
          placeholder={copy.filterPlaceholder}
          value={filterDraft}
        />
      </ClearBox>

      {statusMessage ? <Text>{statusMessage}</Text> : null}
      {errorMessage ? <Text style={settingsShellErrorTextStyle}>{errorMessage}</Text> : null}

      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>{copy.loadingCatalog}</Text>
      ) : !hasPlugins ? (
        <Text style={settingsShellMutedTextStyle}>{copy.noPlugins}</Text>
      ) : visiblePlugins.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>{copy.noFilterMatches}</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {visiblePlugins.map((plugin) => {
            const isBusy = busyPluginID === plugin.id

            return (
              <ClearBox key={plugin.id} style={settingsShellListRowStyle}>
                <ClearBox style={settingsShellContentHeaderStyle}>
                  <Text style={{ fontWeight: 600 }}>{plugin.display_name || plugin.id}</Text>
                  <Text style={settingsShellMutedTextStyle}>{formatPluginDescription(plugin, copy)}</Text>
                  <Text style={settingsShellMutedTextStyle}>
                    {copy.ownerMeta(
                      plugin.access.owner_username,
                      plugin.access.visibility,
                      plugin.metadata ? Object.keys(plugin.metadata).length : 0,
                    )}
                  </Text>
                  {plugin.runtime_error ? (
                    <Text style={settingsShellErrorTextStyle}>{plugin.runtime_error}</Text>
                  ) : null}
                </ClearBox>
                <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
                  <ClearBox style={settingsShellBadgeStyle}>{plugin.plugin_version}</ClearBox>
                  <ClearBox style={settingsShellBadgeStyle}>{plugin.source.kind}</ClearBox>
                  <ClearBox style={settingsShellBadgeStyle}>{formatPluginStatus(plugin, copy)}</ClearBox>
                  <Button
                    disabled={isBusy}
                    onClick={() => void handleLifecycleAction(plugin, plugin.enabled ? 'disable' : 'enable')}
                  >
                    {plugin.enabled ? copy.disable : copy.enable}
                  </Button>
                  <Button disabled={isBusy} onClick={() => void handleLifecycleAction(plugin, 'update')}>
                    {copy.update}
                  </Button>
                  <Button disabled={isBusy} onClick={() => void handleLifecycleAction(plugin, 'delete')}>
                    {copy.remove}
                  </Button>
                </ClearBox>
              </ClearBox>
            )
          })}
        </ClearBox>
      )}
    </SectionCard>
  )
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>{title}</Text>
        <Text style={settingsShellMutedTextStyle}>{description}</Text>
      </ClearBox>
      {children}
    </ClearBox>
  )
}
