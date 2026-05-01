import { useEffect, useMemo, useState } from 'react'

import {
  controlMCPServer,
  deleteMCPServer,
  fetchMCPTemplateCatalog,
  fetchMCPServerDetails,
  fetchMCPServers,
  probeMCPServer,
  type MCPProbeResult,
  registerRemoteMCPServer,
  type MCPServerControlAction,
  type MCPServerTemplate,
  type MCPServerView,
  updateRemoteMCPServer,
} from '@/features/mcp/api/client'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import type { AppLocale } from '@/shared/api/runtime'
import { ClearBox } from '@/shared/ui/components'
import { Button, Input, Text, TextArea } from '@/shared/ui/primitives'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

type MCPSettingsCopy = {
  activeBadge: string
  activeCount: (count: number) => string
  cancelEdit: string
  delete: string
  deletedServer: (serverID: string) => string
  description: string
  disable: string
  disabledCount: (count: number) => string
  disabledState: string
  edit: string
  enable: string
  endpointAria: string
  errorControl: (action: MCPServerControlAction) => string
  errorDelete: string
  errorDuplicateHeader: (name: string) => string
  errorHeaderDuplicateAuth: (name: string) => string
  errorHeaderFormat: string
  errorHeaderName: string
  errorLoadDetails: string
  errorLoadServers: string
  errorLoadTemplates: string
  errorProbe: string
  errorSave: string
  filterAria: string
  filterPlaceholder: string
  headersAria: string
  headersDescription: string
  headersPlaceholder: string
  idAria: string
  loadingServers: string
  loadingTemplates: string
  localDescription: string
  noFilterMatches: string
  noServers: string
  optionalSecret: string
  probePrefix: string
  refresh: string
  refreshing: string
  register: string
  registeredCount: (count: number) => string
  registeredServer: (serverID: string) => string
  registering: string
  remoteDescriptionFallback: string
  restart: string
  saveAria: string
  saveChanges: string
  saveChangesAria: string
  savedServer: (serverID: string) => string
  saving: string
  start: string
  stop: string
  templateDescription: string
  templateLoaded: (name: string) => string
  templateSecretAria: string
  templatesTitle: string
  testAria: string
  testing: string
  title: string
  visibleCount: (count: number) => string
}

const mcpSettingsCopy: Record<AppLocale, MCPSettingsCopy> = {
  en: {
    activeBadge: 'active',
    activeCount: (count) => `${count} active`,
    cancelEdit: 'Cancel edit',
    delete: 'Delete',
    deletedServer: (serverID) => `Deleted ${serverID}.`,
    description:
      'External MCP onboarding is explicit: register or edit a remote endpoint, then start/stop/enable it manually. Invoke and AI handoff remain separate operator actions outside this settings slice.',
    disable: 'Disable',
    disabledCount: (count) => `${count} disabled`,
    disabledState: 'disabled',
    edit: 'Edit',
    enable: 'Enable',
    endpointAria: 'MCP endpoint URL',
    errorControl: (action) => `Unable to ${action} MCP server`,
    errorDelete: 'Unable to delete MCP server',
    errorDuplicateHeader: (name) => `Duplicate header: ${name}`,
    errorHeaderDuplicateAuth: (name) => `${name} is already set in raw headers. Clear one of the duplicates.`,
    errorHeaderFormat: 'Header lines must use `Name: value` format.',
    errorHeaderName: 'Header names must be non-empty.',
    errorLoadDetails: 'Unable to load MCP server details',
    errorLoadServers: 'Unable to load MCP servers',
    errorLoadTemplates: 'Unable to load MCP templates',
    errorProbe: 'Unable to probe MCP endpoint',
    errorSave: 'Unable to save MCP server',
    filterAria: 'Filter MCP servers',
    filterPlaceholder: 'Filter registered MCP servers',
    headersAria: 'MCP request headers',
    headersDescription:
      'Raw headers are persisted in the local runtime MCP registry. Template auth helpers are merged at request time before probe/register.',
    headersPlaceholder: 'Optional headers, one per line: Authorization: Bearer ...',
    idAria: 'MCP server id',
    loadingServers: 'Loading MCP servers…',
    loadingTemplates: 'Loading MCP templates…',
    localDescription: 'Local process server managed by the plugin runtime.',
    noFilterMatches: 'No MCP servers match current filter.',
    noServers: 'No MCP servers registered yet.',
    optionalSecret: 'Optional auth secret',
    probePrefix: 'Probe',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    register: 'Register remote MCP',
    registeredCount: (count) => `${count} registered`,
    registeredServer: (serverID) => `Registered ${serverID}. Start it explicitly before invoke.`,
    registering: 'Registering…',
    remoteDescriptionFallback: 'Remote endpoint is not exposed by the backend snapshot.',
    restart: 'Restart',
    saveAria: 'Register remote MCP server',
    saveChanges: 'Save changes',
    saveChangesAria: 'Save MCP server changes',
    savedServer: (serverID) => `Saved ${serverID}.`,
    saving: 'Saving…',
    start: 'Start',
    stop: 'Stop',
    templateDescription:
      'Load a bounded template to prefill endpoint and auth helpers. Registration still stays explicit.',
    templateLoaded: (name) => `Loaded ${name} template.`,
    templateSecretAria: 'MCP template secret',
    templatesTitle: 'Onboarding templates',
    testAria: 'Test MCP endpoint',
    testing: 'Testing…',
    title: 'MCP servers',
    visibleCount: (count) => `${count} visible`,
  },
  ru: {
    activeBadge: 'активен',
    activeCount: (count) => `${count} активных`,
    cancelEdit: 'Отменить редактирование',
    delete: 'Удалить',
    deletedServer: (serverID) => `Удален ${serverID}.`,
    description:
      'Подключение внешних MCP явно: зарегистрируйте или измените remote endpoint, затем вручную start/stop/enable. Invoke и AI handoff остаются отдельными operator-действиями вне этого settings slice.',
    disable: 'Выключить',
    disabledCount: (count) => `${count} выключено`,
    disabledState: 'выключен',
    edit: 'Изменить',
    enable: 'Включить',
    endpointAria: 'URL MCP endpoint',
    errorControl: (action) => `Не удалось выполнить ${action} для MCP server`,
    errorDelete: 'Не удалось удалить MCP server',
    errorDuplicateHeader: (name) => `Повторяющийся header: ${name}`,
    errorHeaderDuplicateAuth: (name) => `${name} уже задан в raw headers. Уберите один из дублей.`,
    errorHeaderFormat: 'Строки headers должны быть в формате `Name: value`.',
    errorHeaderName: 'Имена headers не должны быть пустыми.',
    errorLoadDetails: 'Не удалось загрузить детали MCP server',
    errorLoadServers: 'Не удалось загрузить MCP servers',
    errorLoadTemplates: 'Не удалось загрузить MCP templates',
    errorProbe: 'Не удалось проверить MCP endpoint',
    errorSave: 'Не удалось сохранить MCP server',
    filterAria: 'Фильтр MCP servers',
    filterPlaceholder: 'Фильтр зарегистрированных MCP servers',
    headersAria: 'Headers MCP request',
    headersDescription:
      'Raw headers сохраняются в локальном runtime MCP registry. Template auth helpers объединяются перед probe/register.',
    headersPlaceholder: 'Опциональные headers, по одному на строку: Authorization: Bearer ...',
    idAria: 'ID MCP server',
    loadingServers: 'Загрузка MCP servers…',
    loadingTemplates: 'Загрузка MCP templates…',
    localDescription: 'Локальный process server управляется plugin runtime.',
    noFilterMatches: 'Нет MCP servers по текущему фильтру.',
    noServers: 'MCP servers пока не зарегистрированы.',
    optionalSecret: 'Опциональный auth secret',
    probePrefix: 'Проверка',
    refresh: 'Обновить',
    refreshing: 'Обновление…',
    register: 'Зарегистрировать remote MCP',
    registeredCount: (count) => `${count} зарегистрировано`,
    registeredServer: (serverID) => `${serverID} зарегистрирован. Запустите его явно перед invoke.`,
    registering: 'Регистрация…',
    remoteDescriptionFallback: 'Remote endpoint не раскрыт backend snapshot.',
    restart: 'Перезапустить',
    saveAria: 'Зарегистрировать remote MCP server',
    saveChanges: 'Сохранить изменения',
    saveChangesAria: 'Сохранить изменения MCP server',
    savedServer: (serverID) => `Сохранен ${serverID}.`,
    saving: 'Сохранение…',
    start: 'Запустить',
    stop: 'Остановить',
    templateDescription:
      'Загрузите ограниченный template для endpoint и auth helpers. Регистрация остается явной.',
    templateLoaded: (name) => `Template ${name} загружен.`,
    templateSecretAria: 'Secret MCP template',
    templatesTitle: 'Onboarding templates',
    testAria: 'Проверить MCP endpoint',
    testing: 'Проверка…',
    title: 'MCP servers',
    visibleCount: (count) => `${count} видно`,
  },
  'zh-CN': {
    activeBadge: '活动',
    activeCount: (count) => `活动 ${count}`,
    cancelEdit: '取消编辑',
    delete: '删除',
    deletedServer: (serverID) => `已删除 ${serverID}。`,
    description:
      '外部 MCP 接入是显式的：注册或编辑远程端点，然后手动启动、停止或启用。调用和 AI handoff 仍是此设置切片之外的单独操作。',
    disable: '禁用',
    disabledCount: (count) => `已禁用 ${count}`,
    disabledState: '已禁用',
    edit: '编辑',
    enable: '启用',
    endpointAria: 'MCP 端点 URL',
    errorControl: (action) => `无法对 MCP 服务器执行 ${action}`,
    errorDelete: '无法删除 MCP 服务器',
    errorDuplicateHeader: (name) => `重复的 header：${name}`,
    errorHeaderDuplicateAuth: (name) => `${name} 已在 raw headers 中设置。请清除其中一个重复项。`,
    errorHeaderFormat: 'Header 行必须使用 `Name: value` 格式。',
    errorHeaderName: 'Header 名称不能为空。',
    errorLoadDetails: '无法加载 MCP 服务器详情',
    errorLoadServers: '无法加载 MCP 服务器',
    errorLoadTemplates: '无法加载 MCP 模板',
    errorProbe: '无法探测 MCP 端点',
    errorSave: '无法保存 MCP 服务器',
    filterAria: '筛选 MCP 服务器',
    filterPlaceholder: '筛选已注册的 MCP 服务器',
    headersAria: 'MCP 请求 headers',
    headersDescription:
      'Raw headers 会保存在本地运行时 MCP 注册表中。模板认证辅助项会在 probe/register 前合并。',
    headersPlaceholder: '可选 headers，每行一个：Authorization: Bearer ...',
    idAria: 'MCP 服务器 ID',
    loadingServers: '正在加载 MCP 服务器…',
    loadingTemplates: '正在加载 MCP 模板…',
    localDescription: '由插件运行时管理的本地进程服务器。',
    noFilterMatches: '没有 MCP 服务器匹配当前筛选条件。',
    noServers: '尚未注册 MCP 服务器。',
    optionalSecret: '可选认证 secret',
    probePrefix: '探测',
    refresh: '刷新',
    refreshing: '刷新中…',
    register: '注册远程 MCP',
    registeredCount: (count) => `已注册 ${count}`,
    registeredServer: (serverID) => `已注册 ${serverID}。调用前请显式启动。`,
    registering: '注册中…',
    remoteDescriptionFallback: '后端快照未暴露远程端点。',
    restart: '重启',
    saveAria: '注册远程 MCP 服务器',
    saveChanges: '保存更改',
    saveChangesAria: '保存 MCP 服务器更改',
    savedServer: (serverID) => `已保存 ${serverID}。`,
    saving: '保存中…',
    start: '启动',
    stop: '停止',
    templateDescription: '加载受限模板以预填端点和认证辅助项。注册仍保持显式。',
    templateLoaded: (name) => `已加载 ${name} 模板。`,
    templateSecretAria: 'MCP 模板 secret',
    templatesTitle: '接入模板',
    testAria: '测试 MCP 端点',
    testing: '测试中…',
    title: 'MCP 服务器',
    visibleCount: (count) => `可见 ${count}`,
  },
  es: {
    activeBadge: 'activo',
    activeCount: (count) => `${count} activos`,
    cancelEdit: 'Cancelar edicion',
    delete: 'Eliminar',
    deletedServer: (serverID) => `${serverID} eliminado.`,
    description:
      'El onboarding externo de MCP es explicito: registra o edita un endpoint remoto y luego inicia, detiene o activa manualmente. Invoke y AI handoff siguen siendo acciones separadas fuera de este settings slice.',
    disable: 'Desactivar',
    disabledCount: (count) => `${count} desactivados`,
    disabledState: 'desactivado',
    edit: 'Editar',
    enable: 'Activar',
    endpointAria: 'URL del endpoint MCP',
    errorControl: (action) => `No se pudo ejecutar ${action} en el servidor MCP`,
    errorDelete: 'No se pudo eliminar el servidor MCP',
    errorDuplicateHeader: (name) => `Header duplicado: ${name}`,
    errorHeaderDuplicateAuth: (name) => `${name} ya esta en raw headers. Borra uno de los duplicados.`,
    errorHeaderFormat: 'Las lineas de headers deben usar el formato `Name: value`.',
    errorHeaderName: 'Los nombres de headers no pueden estar vacios.',
    errorLoadDetails: 'No se pudieron cargar los detalles del servidor MCP',
    errorLoadServers: 'No se pudieron cargar los servidores MCP',
    errorLoadTemplates: 'No se pudieron cargar las plantillas MCP',
    errorProbe: 'No se pudo probar el endpoint MCP',
    errorSave: 'No se pudo guardar el servidor MCP',
    filterAria: 'Filtrar servidores MCP',
    filterPlaceholder: 'Filtrar servidores MCP registrados',
    headersAria: 'Headers de solicitud MCP',
    headersDescription:
      'Los raw headers se persisten en el registro MCP local de runtime. Los auth helpers de plantilla se combinan antes de probe/register.',
    headersPlaceholder: 'Headers opcionales, uno por linea: Authorization: Bearer ...',
    idAria: 'ID del servidor MCP',
    loadingServers: 'Cargando servidores MCP…',
    loadingTemplates: 'Cargando plantillas MCP…',
    localDescription: 'Servidor de proceso local gestionado por plugin runtime.',
    noFilterMatches: 'Ningun servidor MCP coincide con el filtro actual.',
    noServers: 'Todavia no hay servidores MCP registrados.',
    optionalSecret: 'Auth secret opcional',
    probePrefix: 'Prueba',
    refresh: 'Actualizar',
    refreshing: 'Actualizando…',
    register: 'Registrar MCP remoto',
    registeredCount: (count) => `${count} registrados`,
    registeredServer: (serverID) => `${serverID} registrado. Inicialo explicitamente antes de invoke.`,
    registering: 'Registrando…',
    remoteDescriptionFallback: 'El endpoint remoto no esta expuesto por el snapshot del backend.',
    restart: 'Reiniciar',
    saveAria: 'Registrar servidor MCP remoto',
    saveChanges: 'Guardar cambios',
    saveChangesAria: 'Guardar cambios del servidor MCP',
    savedServer: (serverID) => `${serverID} guardado.`,
    saving: 'Guardando…',
    start: 'Iniciar',
    stop: 'Detener',
    templateDescription:
      'Carga una plantilla acotada para prefijar endpoint y auth helpers. El registro sigue siendo explicito.',
    templateLoaded: (name) => `Plantilla ${name} cargada.`,
    templateSecretAria: 'Secret de plantilla MCP',
    templatesTitle: 'Plantillas de onboarding',
    testAria: 'Probar endpoint MCP',
    testing: 'Probando…',
    title: 'Servidores MCP',
    visibleCount: (count) => `${count} visibles`,
  },
}

function describeServer(server: MCPServerView, copy: MCPSettingsCopy) {
  if (server.type === 'remote') {
    return server.endpoint ?? copy.remoteDescriptionFallback
  }

  return copy.localDescription
}

function formatServerState(server: MCPServerView, copy: MCPSettingsCopy) {
  if (!server.enabled) {
    return copy.disabledState
  }
  if (server.active) {
    return server.state
  }

  return server.state
}

function serverMatchesFilter(server: MCPServerView, rawFilter: string) {
  const filter = rawFilter.trim().toLowerCase()
  if (!filter) {
    return true
  }

  const fields = [
    server.id,
    server.type,
    server.state,
    server.endpoint ?? '',
    server.enabled ? 'enabled' : 'disabled',
    server.active ? 'active' : 'inactive',
  ]

  return fields.some((field) => field.toLowerCase().includes(filter))
}

function upsertServer(servers: MCPServerView[], nextServer: MCPServerView) {
  const hasServer = servers.some((server) => server.id === nextServer.id)

  if (!hasServer) {
    return [...servers, nextServer].sort((left, right) => left.id.localeCompare(right.id))
  }

  return servers.map((server) => (server.id === nextServer.id ? nextServer : server))
}

function parseHeadersDraft(draft: string, copy: MCPSettingsCopy) {
  const headers: Record<string, string> = {}
  const seen = new Set<string>()

  for (const rawLine of draft.split(/\r?\n/g)) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    const separatorIndex = line.indexOf(':')
    if (separatorIndex <= 0) {
      throw new Error(copy.errorHeaderFormat)
    }

    const name = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim()
    const canonicalName = name.toLowerCase()

    if (!name) {
      throw new Error(copy.errorHeaderName)
    }
    if (seen.has(canonicalName)) {
      throw new Error(copy.errorDuplicateHeader(name))
    }

    seen.add(canonicalName)
    headers[name] = value
  }

  return headers
}

function formatHeadersDraft(headers: Record<string, string>) {
  return Object.entries(headers)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}: ${value}`)
    .join('\n')
}

const defaultServerID = 'mcp.context7'
const defaultEndpoint = 'https://mcp.context7.com/mcp'
const defaultTemplateID = 'context7'

function findSelectedTemplate(templates: MCPServerTemplate[], templateID: string | null) {
  if (!templateID) {
    return null
  }

  return templates.find((template) => template.id === templateID) ?? null
}

function matchTemplateForServer(templates: MCPServerTemplate[], server: { id: string; endpoint?: string }) {
  const normalizedEndpoint = server.endpoint?.trim()
  const normalizedID = server.id.trim()

  return (
    templates.find((template) => {
      if (template.suggested_server_id && template.suggested_server_id === normalizedID) {
        return true
      }
      return Boolean(template.endpoint && normalizedEndpoint && template.endpoint === normalizedEndpoint)
    }) ?? null
  )
}

function buildDraftHeaders(
  headersDraft: string,
  selectedTemplate: MCPServerTemplate | null,
  authSecretDraft: string,
  copy: MCPSettingsCopy,
) {
  const headers = parseHeadersDraft(headersDraft, copy)
  const authKind = selectedTemplate?.auth.kind ?? 'none'
  const authSecret = authSecretDraft.trim()

  if (authKind === 'none' || authSecret === '') {
    return headers
  }

  const headerName = selectedTemplate?.auth.header_name?.trim()
  if (!headerName) {
    return headers
  }

  const duplicateHeader = Object.keys(headers).find(
    (name) => name.trim().toLowerCase() === headerName.toLowerCase(),
  )
  if (duplicateHeader) {
    throw new Error(copy.errorHeaderDuplicateAuth(headerName))
  }

  headers[headerName] = `${selectedTemplate?.auth.value_prefix ?? ''}${authSecret}`
  return headers
}

function describeProbeResult(result: MCPProbeResult) {
  const detail = [
    result.server_name,
    result.server_version ? `v${result.server_version}` : null,
    result.protocol_version ? `protocol ${result.protocol_version}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  if (!detail) {
    return result.message
  }

  return `${result.message} ${detail}`
}

export function MCPSettingsSection() {
  const { locale } = useAppLocale()
  const copy = mcpSettingsCopy[locale]
  const [servers, setServers] = useState<MCPServerView[]>([])
  const [templates, setTemplates] = useState<MCPServerTemplate[]>([])
  const [idDraft, setIdDraft] = useState(defaultServerID)
  const [endpointDraft, setEndpointDraft] = useState(defaultEndpoint)
  const [headersDraft, setHeadersDraft] = useState('')
  const [selectedTemplateID, setSelectedTemplateID] = useState<string | null>(defaultTemplateID)
  const [authSecretDraft, setAuthSecretDraft] = useState('')
  const [filterDraft, setFilterDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [isSubmittingForm, setIsSubmittingForm] = useState(false)
  const [isProbing, setIsProbing] = useState(false)
  const [busyServerID, setBusyServerID] = useState<string | null>(null)
  const [editingServerID, setEditingServerID] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [probeResult, setProbeResult] = useState<MCPProbeResult | null>(null)
  const hasServers = servers.length > 0
  const isEditing = editingServerID !== null
  const canSubmit = idDraft.trim().length > 0 && endpointDraft.trim().length > 0
  const visibleServers = useMemo(
    () => servers.filter((server) => serverMatchesFilter(server, filterDraft)),
    [filterDraft, servers],
  )
  const activeServersCount = servers.filter((server) => server.active).length
  const disabledServersCount = servers.filter((server) => !server.enabled).length
  const selectedTemplate = useMemo(
    () => findSelectedTemplate(templates, selectedTemplateID),
    [selectedTemplateID, templates],
  )

  function resetForm() {
    setEditingServerID(null)
    setIdDraft(defaultServerID)
    setEndpointDraft(defaultEndpoint)
    setHeadersDraft('')
    setAuthSecretDraft('')
    setSelectedTemplateID(defaultTemplateID)
    setProbeResult(null)
  }

  async function loadServers(options: { isCancelled?: () => boolean } = {}) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextServers = await fetchMCPServers()
      if (!options.isCancelled?.()) {
        setServers(nextServers)
      }
    } catch (error) {
      if (!options.isCancelled?.()) {
        setErrorMessage(error instanceof Error ? error.message : copy.errorLoadServers)
      }
    } finally {
      if (!options.isCancelled?.()) {
        setIsLoading(false)
      }
    }
  }

  async function loadTemplates(options: { isCancelled?: () => boolean } = {}) {
    setIsLoadingTemplates(true)

    try {
      const nextTemplates = await fetchMCPTemplateCatalog()
      if (!options.isCancelled?.()) {
        setTemplates(nextTemplates)
        if (nextTemplates.length > 0 && !findSelectedTemplate(nextTemplates, selectedTemplateID)) {
          setSelectedTemplateID(nextTemplates[0]?.id ?? null)
        }
      }
    } catch (error) {
      if (!options.isCancelled?.()) {
        setErrorMessage(error instanceof Error ? error.message : copy.errorLoadTemplates)
      }
    } finally {
      if (!options.isCancelled?.()) {
        setIsLoadingTemplates(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    void loadServers({ isCancelled: () => cancelled })
    void loadTemplates({ isCancelled: () => cancelled })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit() {
    setIsSubmittingForm(true)
    setErrorMessage(null)
    setStatusMessage(null)
    setProbeResult(null)

    try {
      const headers = buildDraftHeaders(headersDraft, selectedTemplate, authSecretDraft, copy)
      const server = isEditing
        ? await updateRemoteMCPServer(editingServerID, {
            endpoint: endpointDraft,
            headers,
            id: idDraft,
          })
        : await registerRemoteMCPServer({
            endpoint: endpointDraft,
            headers,
            id: idDraft,
          })
      setServers((currentServers) => upsertServer(currentServers, server))
      setStatusMessage(isEditing ? copy.savedServer(server.id) : copy.registeredServer(server.id))
      resetForm()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorSave)
    } finally {
      setIsSubmittingForm(false)
    }
  }

  async function handleProbe() {
    setIsProbing(true)
    setErrorMessage(null)
    setStatusMessage(null)
    setProbeResult(null)

    try {
      const headers = buildDraftHeaders(headersDraft, selectedTemplate, authSecretDraft, copy)
      const result = await probeMCPServer({
        endpoint: endpointDraft,
        headers,
        id: idDraft,
      })
      setProbeResult(result)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorProbe)
    } finally {
      setIsProbing(false)
    }
  }

  async function handleControl(serverID: string, action: MCPServerControlAction) {
    setBusyServerID(serverID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const server = await controlMCPServer(serverID, action)
      setServers((currentServers) => upsertServer(currentServers, server))
      setStatusMessage(`${server.id}: ${action} complete.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorControl(action))
    } finally {
      setBusyServerID(null)
    }
  }

  async function handleStartEdit(serverID: string) {
    setBusyServerID(serverID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const server = await fetchMCPServerDetails(serverID)
      setEditingServerID(server.id)
      setIdDraft(server.id)
      setEndpointDraft(server.endpoint ?? '')
      setHeadersDraft(formatHeadersDraft(server.headers))
      setAuthSecretDraft('')
      setProbeResult(null)
      setSelectedTemplateID(matchTemplateForServer(templates, server)?.id ?? null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorLoadDetails)
    } finally {
      setBusyServerID(null)
    }
  }

  async function handleDelete(serverID: string) {
    setBusyServerID(serverID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const deletedServerID = await deleteMCPServer(serverID)
      setServers((currentServers) => currentServers.filter((server) => server.id !== deletedServerID))
      if (editingServerID === deletedServerID) {
        resetForm()
      }
      setStatusMessage(copy.deletedServer(deletedServerID))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorDelete)
    } finally {
      setBusyServerID(null)
    }
  }

  function handleApplyTemplate(template: MCPServerTemplate) {
    setEditingServerID(null)
    setSelectedTemplateID(template.id)
    setIdDraft(template.suggested_server_id ?? defaultServerID)
    setEndpointDraft(template.endpoint ?? '')
    setHeadersDraft('')
    setAuthSecretDraft('')
    setProbeResult(null)
    setStatusMessage(copy.templateLoaded(template.display_name))
    setErrorMessage(null)
  }

  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>{copy.title}</Text>
        <Text style={settingsShellMutedTextStyle}>{copy.description}</Text>
      </ClearBox>

      <ClearBox style={{ display: 'grid', gap: 'var(--gap-xs)' }}>
        <Text style={{ fontWeight: 600 }}>{copy.templatesTitle}</Text>
        <Text style={settingsShellMutedTextStyle}>{copy.templateDescription}</Text>
        {isLoadingTemplates ? (
          <Text style={settingsShellMutedTextStyle}>{copy.loadingTemplates}</Text>
        ) : (
          <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
            {templates.map((template) => (
              <Button
                key={template.id}
                disabled={isSubmittingForm || isProbing || busyServerID !== null}
                onClick={() => handleApplyTemplate(template)}
              >
                {template.display_name}
              </Button>
            ))}
          </ClearBox>
        )}
        {selectedTemplate ? (
          <Text style={settingsShellMutedTextStyle}>{selectedTemplate.description}</Text>
        ) : null}
      </ClearBox>

      <ClearBox style={{ display: 'grid', gap: 'var(--gap-sm)', gridTemplateColumns: '1fr 1.4fr' }}>
        <Input
          aria-label={copy.idAria}
          disabled={isEditing}
          onChange={(event) => setIdDraft(event.target.value)}
          placeholder="mcp.context7"
          value={idDraft}
        />
        <Input
          aria-label={copy.endpointAria}
          onChange={(event) => setEndpointDraft(event.target.value)}
          placeholder="https://mcp.context7.com/mcp"
          value={endpointDraft}
        />
      </ClearBox>
      {selectedTemplate && selectedTemplate.auth.kind !== 'none' ? (
        <Input
          aria-label={selectedTemplate.auth.secret_label ?? copy.templateSecretAria}
          onChange={(event) => setAuthSecretDraft(event.target.value)}
          placeholder={selectedTemplate.auth.secret_placeholder ?? copy.optionalSecret}
          value={authSecretDraft}
        />
      ) : null}
      <TextArea
        aria-label={copy.headersAria}
        onChange={(event) => setHeadersDraft(event.target.value)}
        placeholder={copy.headersPlaceholder}
        style={{ minHeight: '5.6rem' }}
        value={headersDraft}
      />
      <Text style={settingsShellMutedTextStyle}>{copy.headersDescription}</Text>

      <ClearBox style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' as const }}>
        <Button
          aria-label={isEditing ? copy.saveChangesAria : copy.saveAria}
          disabled={!canSubmit || isSubmittingForm || busyServerID !== null}
          onClick={() => void handleSubmit()}
        >
          {isSubmittingForm
            ? isEditing
              ? copy.saving
              : copy.registering
            : isEditing
              ? copy.saveChanges
              : copy.register}
        </Button>
        <Button
          aria-label={copy.testAria}
          disabled={!canSubmit || isSubmittingForm || isProbing || busyServerID !== null}
          onClick={() => void handleProbe()}
        >
          {isProbing ? copy.testing : copy.testAria}
        </Button>
        {isEditing ? (
          <Button disabled={isSubmittingForm} onClick={() => resetForm()}>
            {copy.cancelEdit}
          </Button>
        ) : null}
        <Button aria-label={copy.refresh} disabled={isLoading} onClick={() => void loadServers()}>
          {isLoading ? copy.refreshing : copy.refresh}
        </Button>
      </ClearBox>
      <ClearBox
        style={{
          display: 'flex',
          gap: 'var(--gap-sm)',
          flexWrap: 'wrap' as const,
          alignItems: 'center',
        }}
      >
        <Input
          aria-label={copy.filterAria}
          onChange={(event) => setFilterDraft(event.target.value)}
          placeholder={copy.filterPlaceholder}
          style={{ minWidth: '16rem', flex: '1 1 16rem' }}
          value={filterDraft}
        />
        <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
          <ClearBox style={settingsShellBadgeStyle}>{copy.registeredCount(servers.length)}</ClearBox>
          {filterDraft.trim() !== '' ? (
            <ClearBox style={settingsShellBadgeStyle}>{copy.visibleCount(visibleServers.length)}</ClearBox>
          ) : null}
          <ClearBox style={settingsShellBadgeStyle}>{copy.activeCount(activeServersCount)}</ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>{copy.disabledCount(disabledServersCount)}</ClearBox>
        </ClearBox>
      </ClearBox>

      {statusMessage ? <Text style={settingsShellMutedTextStyle}>{statusMessage}</Text> : null}
      {probeResult ? (
        <Text style={settingsShellMutedTextStyle}>
          {copy.probePrefix} `{probeResult.status}`: {describeProbeResult(probeResult)}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
      ) : null}

      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>{copy.loadingServers}</Text>
      ) : !hasServers ? (
        <Text style={settingsShellMutedTextStyle}>{copy.noServers}</Text>
      ) : visibleServers.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>{copy.noFilterMatches}</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {visibleServers.map((server) => {
            const isBusy = busyServerID === server.id

            return (
              <ClearBox key={server.id} style={settingsShellListRowStyle}>
                <ClearBox style={settingsShellContentHeaderStyle}>
                  <Text style={{ fontWeight: 600 }}>{server.id}</Text>
                  <Text style={settingsShellMutedTextStyle}>{describeServer(server, copy)}</Text>
                  <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
                    <ClearBox style={settingsShellBadgeStyle}>{server.type}</ClearBox>
                    <ClearBox style={settingsShellBadgeStyle}>{formatServerState(server, copy)}</ClearBox>
                    {server.active ? (
                      <ClearBox style={settingsShellBadgeStyle}>{copy.activeBadge}</ClearBox>
                    ) : null}
                  </ClearBox>
                </ClearBox>
                <ClearBox style={{ display: 'flex', gap: 'var(--gap-xs)', flexWrap: 'wrap' as const }}>
                  {server.type === 'remote' ? (
                    <Button
                      disabled={isBusy || isSubmittingForm}
                      onClick={() => void handleStartEdit(server.id)}
                    >
                      {copy.edit}
                    </Button>
                  ) : null}
                  {server.type === 'remote' ? (
                    <Button
                      disabled={isBusy || isSubmittingForm}
                      onClick={() => void handleDelete(server.id)}
                    >
                      {copy.delete}
                    </Button>
                  ) : null}
                  <Button
                    disabled={isBusy || !server.enabled}
                    onClick={() => void handleControl(server.id, 'start')}
                  >
                    {copy.start}
                  </Button>
                  <Button
                    disabled={isBusy || !server.enabled}
                    onClick={() => void handleControl(server.id, 'stop')}
                  >
                    {copy.stop}
                  </Button>
                  <Button
                    disabled={isBusy || !server.enabled}
                    onClick={() => void handleControl(server.id, 'restart')}
                  >
                    {copy.restart}
                  </Button>
                  <Button
                    disabled={isBusy || !server.enabled}
                    onClick={() => void handleControl(server.id, 'disable')}
                  >
                    {copy.disable}
                  </Button>
                  <Button
                    disabled={isBusy || server.enabled}
                    onClick={() => void handleControl(server.id, 'enable')}
                  >
                    {copy.enable}
                  </Button>
                </ClearBox>
              </ClearBox>
            )
          })}
        </ClearBox>
      )}
    </ClearBox>
  )
}
