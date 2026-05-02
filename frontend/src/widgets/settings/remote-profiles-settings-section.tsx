import type { DockviewApi } from 'dockview-react'
import { useEffect, useMemo, useState } from 'react'

import {
  checkRemoteProfileConnection,
  deleteRemoteProfile,
  fetchRemoteConnectionsSnapshot,
  fetchRemoteProfileTmuxSessions,
  fetchRemoteProfiles,
  importSSHConfigProfiles,
  selectRemoteProfileConnection,
  saveRemoteProfile,
  type RemoteConnectionsSnapshot,
  type RemoteConnectionView,
  type RemoteProfile,
  type RemoteTmuxSession,
  type SSHConfigImportResult,
} from '@/features/remote/api/client'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import type { AppLocale } from '@/shared/api/runtime'
import { ClearBox } from '@/shared/ui/components'
import { Button, Input, Text } from '@/shared/ui/primitives'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellErrorTextStyle,
  settingsShellInlineLabelStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'
import { openRemoteProfileSession } from '@/widgets/terminal/open-remote-profile-session'

type RemoteProfilesCopy = {
  browseTmux: string
  cancelEdit: string
  check: string
  defaultBadge: string
  defaultConnection: (name: string) => string
  defaultCount: (count: number) => string
  deletedProfile: string
  delete: string
  description: string
  derivedAutomatically: string
  detached: string
  edit: string
  errorCheck: string
  errorDelete: string
  errorImport: string
  errorLoad: string
  errorLoadTmux: string
  errorOpenShell: string
  errorPort: string
  errorSave: string
  errorSetDefault: string
  filterAria: string
  filterPlaceholder: string
  filterTmuxAria: (profileName: string) => string
  focusedShell: (profileName: string) => string
  hostAria: string
  identityFileAria: string
  importButton: string
  importing: string
  importPathAria: string
  importPathPlaceholder: string
  importSummary: (importedCount: number, skippedCount: number) => string
  launchPrefix: string
  loadNamedSession: string
  loadedTmuxEditor: (sessionName: string) => string
  loadedTmuxSessions: (count: number) => string
  loadingProfiles: string
  loadingTmux: string
  nameAria: string
  namedTmuxSessionAria: (profileName: string) => string
  noFilterMatches: string
  noProfiles: string
  noTmuxFilterMatches: string
  noTmuxSessions: string
  noTmuxSessionsYet: string
  openNamedSession: string
  openShell: string
  openedShell: (profileName: string) => string
  openedTmuxShell: (profileName: string, sessionName: string) => string
  portAria: string
  preflightPassed: string
  preflightStatus: (profileName: string, status: string) => string
  refresh: string
  refreshing: string
  refreshTmux: string
  remoteName: string
  resumedShell: (profileName: string) => string
  resumedTmuxShell: (profileName: string, sessionName: string) => string
  resumeSession: string
  saveChanges: string
  saveProfile: string
  saveProfileAria: string
  saveProfileChangesAria: string
  savedCount: (count: number) => string
  savedProfile: (profileName: string) => string
  saving: string
  setDefault: string
  shellLaunchSucceeded: string
  title: string
  tmuxAttached: string
  tmuxDetached: string
  tmuxFilterPlaceholder: string
  tmuxManager: string
  tmuxRequiredLoad: string
  tmuxRequiredOpen: string
  tmuxResume: string
  tmuxSessionAria: string
  tmuxSummary: (total: number, attached: number, detached: number) => string
  unknownCheckFailed: string
  unknownLaunchFailed: string
  useSession: string
  userAria: string
  visibleCount: (count: number) => string
  windowCount: (count: number) => string
}

const remoteProfilesCopy: Record<AppLocale, RemoteProfilesCopy> = {
  en: {
    browseTmux: 'Browse tmux',
    cancelEdit: 'Cancel edit',
    check: 'Check',
    defaultBadge: 'default',
    defaultConnection: (name) => `Default connection: ${name}.`,
    defaultCount: (count) => `${count} default`,
    deletedProfile: 'Deleted SSH profile.',
    delete: 'Delete',
    description:
      'Saved SSH targets are backend-owned. Keep a narrow profile inventory here and import concrete aliases from `~/.ssh/config`, including `Include`, wildcard-host defaults, and `Match host/originalhost` overrides.',
    derivedAutomatically: 'derived automatically',
    detached: 'detached',
    edit: 'Edit',
    errorCheck: 'Unable to check remote profile',
    errorDelete: 'Unable to delete remote profile',
    errorImport: 'Unable to import SSH config',
    errorLoad: 'Unable to load remote profiles',
    errorLoadTmux: 'Unable to load tmux sessions',
    errorOpenShell: 'Unable to open remote shell',
    errorPort: 'Port must be a positive integer.',
    errorSave: 'Unable to save remote profile',
    errorSetDefault: 'Unable to set default connection',
    filterAria: 'Filter remote profiles',
    filterPlaceholder: 'Filter saved SSH profiles',
    filterTmuxAria: (profileName) => `Filter tmux sessions for ${profileName}`,
    focusedShell: (profileName) => `Focused running remote shell for ${profileName}.`,
    hostAria: 'Remote profile host',
    identityFileAria: 'Remote profile identity file',
    importButton: 'Import SSH config',
    importing: 'Importing…',
    importPathAria: 'SSH config path',
    importPathPlaceholder: 'Default: ~/.ssh/config',
    importSummary: (importedCount, skippedCount) =>
      skippedCount > 0
        ? `Imported ${importedCount} ${importedCount === 1 ? 'profile' : 'profiles'}; ${skippedCount} ${
            skippedCount === 1 ? 'host skipped' : 'hosts skipped'
          }.`
        : `Imported ${importedCount} ${importedCount === 1 ? 'profile' : 'profiles'}.`,
    launchPrefix: 'launch:',
    loadNamedSession: 'Load named session',
    loadedTmuxEditor: (sessionName) => `Loaded tmux session ${sessionName} into profile editor.`,
    loadedTmuxSessions: (count) => `Loaded ${count} tmux sessions.`,
    loadingProfiles: 'Loading remote profiles…',
    loadingTmux: 'Loading tmux…',
    nameAria: 'Remote profile name',
    namedTmuxSessionAria: (profileName) => `Named tmux session for ${profileName}`,
    noFilterMatches: 'No SSH profiles match current filter.',
    noProfiles: 'No saved SSH profiles yet.',
    noTmuxFilterMatches: 'No discovered tmux sessions match the current filter.',
    noTmuxSessions: 'No tmux sessions reported by remote host.',
    noTmuxSessionsYet: 'No discovered tmux sessions yet. You can still type a named session below.',
    openNamedSession: 'Open named session',
    openShell: 'Open shell',
    openedShell: (profileName) => `Opened remote shell for ${profileName}.`,
    openedTmuxShell: (profileName, sessionName) => `Opened ${profileName} on tmux session ${sessionName}.`,
    portAria: 'Remote profile port',
    preflightPassed: 'Last preflight passed.',
    preflightStatus: (profileName, status) => `${profileName}: preflight ${status}.`,
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    refreshTmux: 'Refresh tmux',
    remoteName: 'Remote profile tmux session',
    resumedShell: (profileName) => `Resumed running remote shell for ${profileName}.`,
    resumedTmuxShell: (profileName, sessionName) => `Resumed ${profileName} on tmux session ${sessionName}.`,
    resumeSession: 'Resume session',
    saveChanges: 'Save changes',
    saveProfile: 'Save profile',
    saveProfileAria: 'Save remote profile',
    saveProfileChangesAria: 'Save remote profile changes',
    savedCount: (count) => `${count} saved`,
    savedProfile: (profileName) => `Saved ${profileName}.`,
    saving: 'Saving…',
    setDefault: 'Set default',
    shellLaunchSucceeded: 'Last shell launch succeeded.',
    title: 'Remote profiles',
    tmuxAttached: 'attached',
    tmuxDetached: 'detached',
    tmuxFilterPlaceholder: 'Filter discovered tmux sessions',
    tmuxManager: 'tmux manager',
    tmuxRequiredLoad: 'Choose or type a tmux session name before loading it into the profile editor.',
    tmuxRequiredOpen: 'Choose or type a tmux session name before opening it.',
    tmuxResume: 'tmux resume:',
    tmuxSessionAria: 'Resume remote shell through tmux',
    tmuxSummary: (total, attached, detached) =>
      `${total} discovered · ${attached} attached · ${detached} detached`,
    unknownCheckFailed: 'Last preflight failed.',
    unknownLaunchFailed: 'Last launch failed.',
    useSession: 'Use session',
    userAria: 'Remote profile user',
    visibleCount: (count) => `${count} visible`,
    windowCount: (count) => `${count} window${count === 1 ? '' : 's'}`,
  },
  ru: {
    browseTmux: 'Просмотреть tmux',
    cancelEdit: 'Отменить редактирование',
    check: 'Проверить',
    defaultBadge: 'по умолчанию',
    defaultConnection: (name) => `Соединение по умолчанию: ${name}.`,
    defaultCount: (count) => `${count} по умолчанию`,
    deletedProfile: 'SSH-профиль удалён.',
    delete: 'Удалить',
    description:
      'Здесь хранится короткий список SSH-профилей и импортируются конкретные алиасы из `~/.ssh/config`, включая `Include`, wildcard-defaults и правила `Match host/originalhost`.',
    derivedAutomatically: 'выводится автоматически',
    detached: 'отсоединена',
    edit: 'Изменить',
    errorCheck: 'Не удалось проверить удалённый профиль',
    errorDelete: 'Не удалось удалить удалённый профиль',
    errorImport: 'Не удалось импортировать SSH config',
    errorLoad: 'Не удалось загрузить удалённые профили',
    errorLoadTmux: 'Не удалось загрузить tmux-сессии',
    errorOpenShell: 'Не удалось открыть удалённую оболочку',
    errorPort: 'Порт должен быть положительным целым числом.',
    errorSave: 'Не удалось сохранить удалённый профиль',
    errorSetDefault: 'Не удалось назначить соединение по умолчанию',
    filterAria: 'Фильтр удалённых профилей',
    filterPlaceholder: 'Фильтр сохраненных SSH-профилей',
    filterTmuxAria: (profileName) => `Фильтр tmux-сессий для ${profileName}`,
    focusedShell: (profileName) => `Сфокусирована запущенная удалённая оболочка для ${profileName}.`,
    hostAria: 'Хост удалённого профиля',
    identityFileAria: 'Файл ключа удалённого профиля',
    importButton: 'Импорт SSH config',
    importing: 'Импорт…',
    importPathAria: 'Путь SSH config',
    importPathPlaceholder: 'По умолчанию: ~/.ssh/config',
    importSummary: (importedCount, skippedCount) =>
      skippedCount > 0
        ? `Импортировано ${importedCount}; пропущено хостов: ${skippedCount}.`
        : `Импортировано ${importedCount}.`,
    launchPrefix: 'запуск:',
    loadNamedSession: 'Загрузить сессию',
    loadedTmuxEditor: (sessionName) => `tmux-сессия ${sessionName} загружена в редактор профиля.`,
    loadedTmuxSessions: (count) => `Загружено tmux-сессий: ${count}.`,
    loadingProfiles: 'Загрузка удалённых профилей…',
    loadingTmux: 'Загрузка tmux…',
    nameAria: 'Название удалённого профиля',
    namedTmuxSessionAria: (profileName) => `Именованная tmux-сессия для ${profileName}`,
    noFilterMatches: 'Нет SSH-профилей по текущему фильтру.',
    noProfiles: 'Сохраненных SSH-профилей пока нет.',
    noTmuxFilterMatches: 'Нет tmux-сессий по текущему фильтру.',
    noTmuxSessions: 'Удалённый хост не сообщил tmux-сессии.',
    noTmuxSessionsYet: 'Обнаруженных tmux-сессий пока нет. Можно вручную ввести имя ниже.',
    openNamedSession: 'Открыть сессию',
    openShell: 'Открыть оболочку',
    openedShell: (profileName) => `Открыта удалённая оболочка для ${profileName}.`,
    openedTmuxShell: (profileName, sessionName) => `${profileName} открыт в tmux-сессии ${sessionName}.`,
    portAria: 'Порт удалённого профиля',
    preflightPassed: 'Последняя проверка успешна.',
    preflightStatus: (profileName, status) => `${profileName}: проверка ${status}.`,
    refresh: 'Обновить',
    refreshing: 'Обновление…',
    refreshTmux: 'Обновить tmux',
    remoteName: 'tmux-сессия удалённого профиля',
    resumedShell: (profileName) => `Возобновлена удалённая оболочка для ${profileName}.`,
    resumedTmuxShell: (profileName, sessionName) =>
      `${profileName} возобновлён в tmux-сессии ${sessionName}.`,
    resumeSession: 'Возобновить сессию',
    saveChanges: 'Сохранить изменения',
    saveProfile: 'Сохранить профиль',
    saveProfileAria: 'Сохранить удалённый профиль',
    saveProfileChangesAria: 'Сохранить изменения удалённого профиля',
    savedCount: (count) => `${count} сохранено`,
    savedProfile: (profileName) => `Сохранён ${profileName}.`,
    saving: 'Сохранение…',
    setDefault: 'По умолчанию',
    shellLaunchSucceeded: 'Последний запуск оболочки успешен.',
    title: 'Удалённые профили',
    tmuxAttached: 'подключена',
    tmuxDetached: 'отсоединена',
    tmuxFilterPlaceholder: 'Фильтр обнаруженных tmux-сессий',
    tmuxManager: 'tmux-сессии',
    tmuxRequiredLoad: 'Выберите или введите имя tmux-сессии перед загрузкой в редактор профиля.',
    tmuxRequiredOpen: 'Выберите или введите имя tmux-сессии перед открытием.',
    tmuxResume: 'возобновление tmux:',
    tmuxSessionAria: 'Возобновлять удалённую оболочку через tmux',
    tmuxSummary: (total, attached, detached) =>
      `${total} обнаружено · ${attached} подключено · ${detached} отсоединено`,
    unknownCheckFailed: 'Последняя проверка завершилась ошибкой.',
    unknownLaunchFailed: 'Последний запуск завершился ошибкой.',
    useSession: 'Использовать сессию',
    userAria: 'Пользователь удалённого профиля',
    visibleCount: (count) => `${count} видно`,
    windowCount: (count) => `${count} окон`,
  },
  'zh-CN': {
    browseTmux: '浏览 tmux',
    cancelEdit: '取消编辑',
    check: '检查',
    defaultBadge: '默认',
    defaultConnection: (name) => `默认连接：${name}。`,
    defaultCount: (count) => `默认 ${count}`,
    deletedProfile: '已删除 SSH 配置。',
    delete: '删除',
    description:
      '已保存的 SSH 目标由后端拥有。这里保留精简的配置清单，并可从 `~/.ssh/config` 导入具体别名，包括 `Include`、通配主机默认值和 `Match host/originalhost` 覆盖。',
    derivedAutomatically: '自动推导',
    detached: '已分离',
    edit: '编辑',
    errorCheck: '无法检查远程配置',
    errorDelete: '无法删除远程配置',
    errorImport: '无法导入 SSH 配置',
    errorLoad: '无法加载远程配置',
    errorLoadTmux: '无法加载 tmux 会话',
    errorOpenShell: '无法打开远程 shell',
    errorPort: '端口必须是正整数。',
    errorSave: '无法保存远程配置',
    errorSetDefault: '无法设置默认连接',
    filterAria: '筛选远程配置',
    filterPlaceholder: '筛选已保存的 SSH 配置',
    filterTmuxAria: (profileName) => `筛选 ${profileName} 的 tmux 会话`,
    focusedShell: (profileName) => `已聚焦 ${profileName} 的运行中远程 shell。`,
    hostAria: '远程配置主机',
    identityFileAria: '远程配置 identity file',
    importButton: '导入 SSH 配置',
    importing: '导入中…',
    importPathAria: 'SSH 配置路径',
    importPathPlaceholder: '默认：~/.ssh/config',
    importSummary: (importedCount, skippedCount) =>
      skippedCount > 0
        ? `已导入 ${importedCount} 个；跳过 ${skippedCount} 个主机。`
        : `已导入 ${importedCount} 个。`,
    launchPrefix: '启动：',
    loadNamedSession: '加载命名会话',
    loadedTmuxEditor: (sessionName) => `已将 tmux 会话 ${sessionName} 加载到配置编辑器。`,
    loadedTmuxSessions: (count) => `已加载 ${count} 个 tmux 会话。`,
    loadingProfiles: '正在加载远程配置…',
    loadingTmux: '正在加载 tmux…',
    nameAria: '远程配置名称',
    namedTmuxSessionAria: (profileName) => `${profileName} 的命名 tmux 会话`,
    noFilterMatches: '没有 SSH 配置匹配当前筛选条件。',
    noProfiles: '尚未保存 SSH 配置。',
    noTmuxFilterMatches: '没有 tmux 会话匹配当前筛选条件。',
    noTmuxSessions: '远程主机未报告 tmux 会话。',
    noTmuxSessionsYet: '尚未发现 tmux 会话。仍可在下方输入命名会话。',
    openNamedSession: '打开命名会话',
    openShell: '打开 shell',
    openedShell: (profileName) => `已为 ${profileName} 打开远程 shell。`,
    openedTmuxShell: (profileName, sessionName) => `已在 tmux 会话 ${sessionName} 中打开 ${profileName}。`,
    portAria: '远程配置端口',
    preflightPassed: '上次 preflight 通过。',
    preflightStatus: (profileName, status) => `${profileName}: preflight ${status}.`,
    refresh: '刷新',
    refreshing: '刷新中…',
    refreshTmux: '刷新 tmux',
    remoteName: '远程配置 tmux 会话',
    resumedShell: (profileName) => `已恢复 ${profileName} 的远程 shell。`,
    resumedTmuxShell: (profileName, sessionName) => `已在 tmux 会话 ${sessionName} 中恢复 ${profileName}。`,
    resumeSession: '恢复会话',
    saveChanges: '保存更改',
    saveProfile: '保存配置',
    saveProfileAria: '保存远程配置',
    saveProfileChangesAria: '保存远程配置更改',
    savedCount: (count) => `已保存 ${count}`,
    savedProfile: (profileName) => `已保存 ${profileName}。`,
    saving: '保存中…',
    setDefault: '设为默认',
    shellLaunchSucceeded: '上次 shell 启动成功。',
    title: '远程配置',
    tmuxAttached: '已附加',
    tmuxDetached: '已分离',
    tmuxFilterPlaceholder: '筛选发现的 tmux 会话',
    tmuxManager: 'tmux 管理器',
    tmuxRequiredLoad: '加载到配置编辑器前，请选择或输入 tmux 会话名。',
    tmuxRequiredOpen: '打开前，请选择或输入 tmux 会话名。',
    tmuxResume: 'tmux 恢复：',
    tmuxSessionAria: '通过 tmux 恢复远程 shell',
    tmuxSummary: (total, attached, detached) => `发现 ${total} 个 · 已附加 ${attached} · 已分离 ${detached}`,
    unknownCheckFailed: '上次 preflight 失败。',
    unknownLaunchFailed: '上次启动失败。',
    useSession: '使用会话',
    userAria: '远程配置用户',
    visibleCount: (count) => `可见 ${count}`,
    windowCount: (count) => `${count} 个窗口`,
  },
  es: {
    browseTmux: 'Explorar tmux',
    cancelEdit: 'Cancelar edicion',
    check: 'Comprobar',
    defaultBadge: 'predeterminado',
    defaultConnection: (name) => `Conexion predeterminada: ${name}.`,
    defaultCount: (count) => `${count} predeterminados`,
    deletedProfile: 'Perfil SSH eliminado.',
    delete: 'Eliminar',
    description:
      'Los destinos SSH guardados pertenecen al backend. Mantén aqui un inventario reducido de perfiles e importa alias concretos desde `~/.ssh/config`, incluidos `Include`, defaults wildcard-host y overrides `Match host/originalhost`.',
    derivedAutomatically: 'derivado automaticamente',
    detached: 'desconectada',
    edit: 'Editar',
    errorCheck: 'No se pudo comprobar el perfil remoto',
    errorDelete: 'No se pudo eliminar el perfil remoto',
    errorImport: 'No se pudo importar SSH config',
    errorLoad: 'No se pudieron cargar los perfiles remotos',
    errorLoadTmux: 'No se pudieron cargar las sesiones tmux',
    errorOpenShell: 'No se pudo abrir el shell remoto',
    errorPort: 'El puerto debe ser un entero positivo.',
    errorSave: 'No se pudo guardar el perfil remoto',
    errorSetDefault: 'No se pudo definir la conexion predeterminada',
    filterAria: 'Filtrar perfiles remotos',
    filterPlaceholder: 'Filtrar perfiles SSH guardados',
    filterTmuxAria: (profileName) => `Filtrar sesiones tmux para ${profileName}`,
    focusedShell: (profileName) => `Shell remoto en ejecucion enfocado para ${profileName}.`,
    hostAria: 'Host del perfil remoto',
    identityFileAria: 'Identity file del perfil remoto',
    importButton: 'Importar SSH config',
    importing: 'Importando…',
    importPathAria: 'Ruta de SSH config',
    importPathPlaceholder: 'Predeterminado: ~/.ssh/config',
    importSummary: (importedCount, skippedCount) =>
      skippedCount > 0
        ? `Importados ${importedCount}; hosts omitidos: ${skippedCount}.`
        : `Importados ${importedCount}.`,
    launchPrefix: 'launch:',
    loadNamedSession: 'Cargar sesion nombrada',
    loadedTmuxEditor: (sessionName) => `Sesion tmux ${sessionName} cargada en el editor de perfil.`,
    loadedTmuxSessions: (count) => `${count} sesiones tmux cargadas.`,
    loadingProfiles: 'Cargando perfiles remotos…',
    loadingTmux: 'Cargando tmux…',
    nameAria: 'Nombre del perfil remoto',
    namedTmuxSessionAria: (profileName) => `Sesion tmux nombrada para ${profileName}`,
    noFilterMatches: 'Ningun perfil SSH coincide con el filtro actual.',
    noProfiles: 'Todavia no hay perfiles SSH guardados.',
    noTmuxFilterMatches: 'Ninguna sesion tmux descubierta coincide con el filtro actual.',
    noTmuxSessions: 'El host remoto no reporto sesiones tmux.',
    noTmuxSessionsYet:
      'Todavia no hay sesiones tmux descubiertas. Puedes escribir una sesion nombrada abajo.',
    openNamedSession: 'Abrir sesion nombrada',
    openShell: 'Abrir shell',
    openedShell: (profileName) => `Shell remoto abierto para ${profileName}.`,
    openedTmuxShell: (profileName, sessionName) => `${profileName} abierto en la sesion tmux ${sessionName}.`,
    portAria: 'Puerto del perfil remoto',
    preflightPassed: 'Ultimo preflight correcto.',
    preflightStatus: (profileName, status) => `${profileName}: preflight ${status}.`,
    refresh: 'Actualizar',
    refreshing: 'Actualizando…',
    refreshTmux: 'Actualizar tmux',
    remoteName: 'Sesion tmux del perfil remoto',
    resumedShell: (profileName) => `Shell remoto reanudado para ${profileName}.`,
    resumedTmuxShell: (profileName, sessionName) =>
      `${profileName} reanudado en la sesion tmux ${sessionName}.`,
    resumeSession: 'Reanudar sesion',
    saveChanges: 'Guardar cambios',
    saveProfile: 'Guardar perfil',
    saveProfileAria: 'Guardar perfil remoto',
    saveProfileChangesAria: 'Guardar cambios del perfil remoto',
    savedCount: (count) => `${count} guardados`,
    savedProfile: (profileName) => `${profileName} guardado.`,
    saving: 'Guardando…',
    setDefault: 'Predeterminado',
    shellLaunchSucceeded: 'Ultimo lanzamiento de shell correcto.',
    title: 'Perfiles remotos',
    tmuxAttached: 'conectada',
    tmuxDetached: 'desconectada',
    tmuxFilterPlaceholder: 'Filtrar sesiones tmux descubiertas',
    tmuxManager: 'gestor tmux',
    tmuxRequiredLoad: 'Elige o escribe un nombre de sesion tmux antes de cargarla en el editor.',
    tmuxRequiredOpen: 'Elige o escribe un nombre de sesion tmux antes de abrirla.',
    tmuxResume: 'tmux resume:',
    tmuxSessionAria: 'Reanudar shell remoto mediante tmux',
    tmuxSummary: (total, attached, detached) =>
      `${total} descubiertas · ${attached} conectadas · ${detached} desconectadas`,
    unknownCheckFailed: 'Ultimo preflight fallido.',
    unknownLaunchFailed: 'Ultimo lanzamiento fallido.',
    useSession: 'Usar sesion',
    userAria: 'Usuario del perfil remoto',
    visibleCount: (count) => `${count} visibles`,
    windowCount: (count) => `${count} ventana${count === 1 ? '' : 's'}`,
  },
}

function describeProfile(profile: RemoteProfile) {
  const userPrefix = profile.user ? `${profile.user}@` : ''
  const portSuffix = profile.port ? `:${profile.port}` : ''

  return `${userPrefix}${profile.host}${portSuffix}`
}

function summarizeImport(result: SSHConfigImportResult, copy: RemoteProfilesCopy) {
  return copy.importSummary(result.imported.length, result.skipped?.length ?? 0)
}

function summarizeConnectionStatus(connection: RemoteConnectionView | undefined, copy: RemoteProfilesCopy) {
  if (!connection) {
    return null
  }

  if (connection.runtime.check_status === 'failed') {
    return connection.runtime.check_error || copy.unknownCheckFailed
  }
  if (connection.runtime.launch_status === 'failed') {
    return connection.runtime.launch_error || copy.unknownLaunchFailed
  }
  if (connection.runtime.launch_status === 'succeeded') {
    return copy.shellLaunchSucceeded
  }
  if (connection.runtime.check_status === 'passed') {
    return copy.preflightPassed
  }

  return null
}

function profileMatchesFilter(
  profile: RemoteProfile,
  connection: RemoteConnectionView | undefined,
  rawFilter: string,
) {
  const filter = rawFilter.trim().toLowerCase()
  if (!filter) {
    return true
  }

  const fields = [
    profile.id,
    profile.name,
    profile.host,
    profile.user ?? '',
    profile.identity_file ?? '',
    profile.launch_mode ?? '',
    profile.tmux_session ?? '',
    profile.port ? String(profile.port) : '',
    connection?.usability ?? '',
    connection?.runtime.check_status ?? '',
    connection?.runtime.launch_status ?? '',
  ]

  return fields.some((field) => field.toLowerCase().includes(filter))
}

function tmuxSessionMatchesFilter(session: RemoteTmuxSession, rawFilter: string) {
  const filter = rawFilter.trim().toLowerCase()
  if (!filter) {
    return true
  }

  return [
    session.name,
    session.attached ? 'attached' : 'detached',
    typeof session.window_count === 'number' ? String(session.window_count) : '',
  ].some((field) => field.toLowerCase().includes(filter))
}

const defaultProfileDraft = {
  host: '',
  identityFile: '',
  launchMode: 'shell' as 'shell' | 'tmux',
  name: '',
  port: '',
  tmuxSession: '',
  user: '',
}

export function RemoteProfilesSettingsSection({ dockviewApi = null }: { dockviewApi?: DockviewApi | null }) {
  const { locale } = useAppLocale()
  const copy = remoteProfilesCopy[locale]
  const [profiles, setProfiles] = useState<RemoteProfile[]>([])
  const [connectionsSnapshot, setConnectionsSnapshot] = useState<RemoteConnectionsSnapshot>({
    active_connection_id: 'local',
    connections: [],
  })
  const [nameDraft, setNameDraft] = useState(defaultProfileDraft.name)
  const [hostDraft, setHostDraft] = useState(defaultProfileDraft.host)
  const [userDraft, setUserDraft] = useState(defaultProfileDraft.user)
  const [portDraft, setPortDraft] = useState(defaultProfileDraft.port)
  const [identityFileDraft, setIdentityFileDraft] = useState(defaultProfileDraft.identityFile)
  const [launchModeDraft, setLaunchModeDraft] = useState<'shell' | 'tmux'>(defaultProfileDraft.launchMode)
  const [tmuxSessionDraft, setTmuxSessionDraft] = useState(defaultProfileDraft.tmuxSession)
  const [pathDraft, setPathDraft] = useState('')
  const [filterDraft, setFilterDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [busyProfileID, setBusyProfileID] = useState<string | null>(null)
  const [editingProfileID, setEditingProfileID] = useState<string | null>(null)
  const [tmuxSessionsByProfile, setTmuxSessionsByProfile] = useState<Record<string, RemoteTmuxSession[]>>({})
  const [tmuxSessionDraftsByProfile, setTmuxSessionDraftsByProfile] = useState<Record<string, string>>({})
  const [tmuxSessionFiltersByProfile, setTmuxSessionFiltersByProfile] = useState<Record<string, string>>({})
  const [tmuxLoadingProfileID, setTmuxLoadingProfileID] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isEditing = editingProfileID !== null
  const canSaveProfile = hostDraft.trim() !== ''
  const visibleProfiles = useMemo(
    () =>
      profiles.filter((profile) =>
        profileMatchesFilter(
          profile,
          connectionsSnapshot.connections.find((item) => item.id === profile.id),
          filterDraft,
        ),
      ),
    [connectionsSnapshot.connections, filterDraft, profiles],
  )
  const defaultProfilesCount = profiles.filter(
    (profile) => connectionsSnapshot.active_connection_id === profile.id,
  ).length

  function resetProfileForm() {
    setEditingProfileID(null)
    setNameDraft(defaultProfileDraft.name)
    setHostDraft(defaultProfileDraft.host)
    setUserDraft(defaultProfileDraft.user)
    setPortDraft(defaultProfileDraft.port)
    setIdentityFileDraft(defaultProfileDraft.identityFile)
    setLaunchModeDraft(defaultProfileDraft.launchMode)
    setTmuxSessionDraft(defaultProfileDraft.tmuxSession)
  }

  async function loadProfilesAndConnections(options: { isCancelled?: () => boolean } = {}) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const [nextProfiles, nextConnectionsSnapshot] = await Promise.all([
        fetchRemoteProfiles(),
        fetchRemoteConnectionsSnapshot(),
      ])
      if (options.isCancelled?.()) {
        return
      }

      setProfiles(nextProfiles)
      setConnectionsSnapshot(nextConnectionsSnapshot)
      setTmuxSessionsByProfile({})
      setTmuxSessionDraftsByProfile({})
      setTmuxSessionFiltersByProfile({})
    } catch (error) {
      if (options.isCancelled?.()) {
        return
      }

      setErrorMessage(error instanceof Error ? error.message : copy.errorLoad)
    } finally {
      if (!options.isCancelled?.()) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    void loadProfilesAndConnections({ isCancelled: () => cancelled })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleImport() {
    setIsImporting(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const result = await importSSHConfigProfiles(pathDraft)
      setProfiles(result.profiles)
      setConnectionsSnapshot(await fetchRemoteConnectionsSnapshot())
      setStatusMessage(summarizeImport(result, copy))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorImport)
    } finally {
      setIsImporting(false)
    }
  }

  async function handleSaveProfile() {
    setIsSavingProfile(true)
    setErrorMessage(null)
    setStatusMessage(null)

    const normalizedPort = portDraft.trim()
    if (normalizedPort !== '' && (!/^\d+$/.test(normalizedPort) || Number(normalizedPort) <= 0)) {
      setErrorMessage(copy.errorPort)
      setIsSavingProfile(false)
      return
    }

    try {
      const result = await saveRemoteProfile({
        host: hostDraft,
        id: editingProfileID ?? undefined,
        identity_file: identityFileDraft,
        launch_mode: launchModeDraft,
        name: nameDraft,
        port: normalizedPort === '' ? undefined : Number(normalizedPort),
        tmux_session: launchModeDraft === 'tmux' ? tmuxSessionDraft : undefined,
        user: userDraft,
      })
      setProfiles(result.profiles)
      setConnectionsSnapshot(await fetchRemoteConnectionsSnapshot())
      setStatusMessage(copy.savedProfile(result.profile.name))
      resetProfileForm()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorSave)
    } finally {
      setIsSavingProfile(false)
    }
  }

  function handleStartEdit(profile: RemoteProfile) {
    setEditingProfileID(profile.id)
    setNameDraft(profile.name)
    setHostDraft(profile.host)
    setUserDraft(profile.user ?? '')
    setPortDraft(profile.port ? String(profile.port) : '')
    setIdentityFileDraft(profile.identity_file ?? '')
    setLaunchModeDraft(profile.launch_mode === 'tmux' ? 'tmux' : 'shell')
    setTmuxSessionDraft(profile.tmux_session ?? '')
    setErrorMessage(null)
    setStatusMessage(null)
  }

  async function handleDeleteProfile(profileID: string) {
    setBusyProfileID(profileID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const result = await deleteRemoteProfile(profileID)
      setProfiles(Array.isArray(result.profiles) ? result.profiles : [])
      setConnectionsSnapshot(await fetchRemoteConnectionsSnapshot())
      if (editingProfileID === profileID) {
        resetProfileForm()
      }
      setStatusMessage(copy.deletedProfile)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorDelete)
    } finally {
      setBusyProfileID(null)
    }
  }

  async function handleCheckProfile(profileID: string) {
    setBusyProfileID(profileID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const result = await checkRemoteProfileConnection(profileID)
      setConnectionsSnapshot(result.connections)
      setStatusMessage(copy.preflightStatus(result.connection.name, result.connection.runtime.check_status))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorCheck)
    } finally {
      setBusyProfileID(null)
    }
  }

  async function handleSetDefaultProfile(profileID: string) {
    setBusyProfileID(profileID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const nextConnectionsSnapshot = await selectRemoteProfileConnection(profileID)
      setConnectionsSnapshot(nextConnectionsSnapshot)
      const selectedProfile = profiles.find((profile) => profile.id === profileID)
      setStatusMessage(copy.defaultConnection(selectedProfile?.name ?? profileID))
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorSetDefault)
    } finally {
      setBusyProfileID(null)
    }
  }

  async function handleBrowseTmuxSessions(profileID: string) {
    setTmuxLoadingProfileID(profileID)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const sessions = await fetchRemoteProfileTmuxSessions(profileID)
      setTmuxSessionsByProfile((current) => ({
        ...current,
        [profileID]: sessions,
      }))
      setTmuxSessionDraftsByProfile((current) => {
        if (typeof current[profileID] === 'string') {
          return current
        }
        const profile = profiles.find((item) => item.id === profileID)
        return {
          ...current,
          [profileID]: profile?.tmux_session ?? '',
        }
      })
      setStatusMessage(sessions.length > 0 ? copy.loadedTmuxSessions(sessions.length) : copy.noTmuxSessions)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorLoadTmux)
    } finally {
      setTmuxLoadingProfileID(null)
    }
  }

  function handleUseTmuxSession(profile: RemoteProfile, sessionName: string) {
    handleStartEdit(profile)
    setLaunchModeDraft('tmux')
    setTmuxSessionDraft(sessionName)
    setTmuxSessionDraftsByProfile((current) => ({
      ...current,
      [profile.id]: sessionName,
    }))
    setStatusMessage(copy.loadedTmuxEditor(sessionName))
  }

  function handleTmuxSessionDraftChange(profileID: string, value: string) {
    setTmuxSessionDraftsByProfile((current) => ({
      ...current,
      [profileID]: value,
    }))
  }

  function handleTmuxSessionFilterChange(profileID: string, value: string) {
    setTmuxSessionFiltersByProfile((current) => ({
      ...current,
      [profileID]: value,
    }))
  }

  async function handleOpenNamedTmuxSession(profile: RemoteProfile) {
    const sessionName = (tmuxSessionDraftsByProfile[profile.id] ?? profile.tmux_session ?? '').trim()
    if (sessionName === '') {
      setErrorMessage(copy.tmuxRequiredOpen)
      setStatusMessage(null)
      return
    }

    await handleOpenProfileShell(profile, sessionName)
  }

  function handleLoadNamedTmuxSession(profile: RemoteProfile) {
    const sessionName = (tmuxSessionDraftsByProfile[profile.id] ?? profile.tmux_session ?? '').trim()
    if (sessionName === '') {
      setErrorMessage(copy.tmuxRequiredLoad)
      setStatusMessage(null)
      return
    }

    handleUseTmuxSession(profile, sessionName)
  }

  async function handleOpenProfileShell(profile: RemoteProfile, tmuxSession?: string) {
    setBusyProfileID(profile.id)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const result = await openRemoteProfileSession(dockviewApi, {
        profileId: profile.id,
        title: profile.name,
        tmuxSession,
      })
      const targetSession = result.remote_session_name?.trim() || tmuxSession?.trim() || ''
      if (result.reused) {
        setStatusMessage(
          targetSession
            ? copy.resumedTmuxShell(profile.name, targetSession)
            : copy.focusedShell(profile.name),
        )
      } else {
        setStatusMessage(
          targetSession ? copy.openedTmuxShell(profile.name, targetSession) : copy.openedShell(profile.name),
        )
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.errorOpenShell)
    } finally {
      setBusyProfileID(null)
    }
  }

  return (
    <ClearBox style={settingsShellSectionCardStyle}>
      <ClearBox style={settingsShellContentHeaderStyle}>
        <Text style={{ fontWeight: 600 }}>{copy.title}</Text>
        <Text style={settingsShellMutedTextStyle}>{copy.description}</Text>
      </ClearBox>

      <ClearBox style={{ display: 'grid', gap: 'var(--gap-sm)', gridTemplateColumns: '1fr 1.2fr' }}>
        <Input
          aria-label={copy.nameAria}
          onChange={(event) => setNameDraft(event.target.value)}
          placeholder="prod"
          value={nameDraft}
        />
        <Input
          aria-label={copy.hostAria}
          onChange={(event) => setHostDraft(event.target.value)}
          placeholder="prod.example.com"
          value={hostDraft}
        />
      </ClearBox>
      <ClearBox
        style={{
          display: 'grid',
          gap: 'var(--gap-sm)',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 9rem) minmax(0, 1.2fr)',
        }}
      >
        <Input
          aria-label={copy.userAria}
          onChange={(event) => setUserDraft(event.target.value)}
          placeholder="deploy"
          value={userDraft}
        />
        <Input
          aria-label={copy.portAria}
          inputMode="numeric"
          onChange={(event) => setPortDraft(event.target.value)}
          placeholder="22"
          value={portDraft}
        />
        <Input
          aria-label={copy.identityFileAria}
          onChange={(event) => setIdentityFileDraft(event.target.value)}
          placeholder="~/.ssh/id_prod"
          value={identityFileDraft}
        />
      </ClearBox>
      <ClearBox style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' as const }}>
        <label style={settingsShellInlineLabelStyle}>
          <input
            aria-label={copy.tmuxSessionAria}
            checked={launchModeDraft === 'tmux'}
            onChange={(event) => setLaunchModeDraft(event.target.checked ? 'tmux' : 'shell')}
            type="checkbox"
          />
          {copy.tmuxSessionAria}
        </label>
        {launchModeDraft === 'tmux' ? (
          <Input
            aria-label={copy.remoteName}
            onChange={(event) => setTmuxSessionDraft(event.target.value)}
            placeholder="prod-main"
            style={{ minWidth: '14rem' }}
            value={tmuxSessionDraft}
          />
        ) : null}
      </ClearBox>

      <ClearBox style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' as const }}>
        <Button
          aria-label={isEditing ? copy.saveProfileChangesAria : copy.saveProfileAria}
          disabled={!canSaveProfile || isSavingProfile || busyProfileID !== null}
          onClick={() => void handleSaveProfile()}
        >
          {isSavingProfile ? copy.saving : isEditing ? copy.saveChanges : copy.saveProfile}
        </Button>
        {isEditing ? (
          <Button disabled={isSavingProfile} onClick={() => resetProfileForm()}>
            {copy.cancelEdit}
          </Button>
        ) : null}
      </ClearBox>

      <ClearBox style={{ display: 'flex', gap: 'var(--gap-sm)', flexWrap: 'wrap' as const }}>
        <Input
          aria-label={copy.importPathAria}
          onChange={(event) => setPathDraft(event.target.value)}
          placeholder={copy.importPathPlaceholder}
          style={{ minWidth: '18rem' }}
          value={pathDraft}
        />
        <Button aria-label={copy.importButton} disabled={isImporting} onClick={() => void handleImport()}>
          {isImporting ? copy.importing : copy.importButton}
        </Button>
        <Button
          aria-label={copy.refresh}
          disabled={isLoading}
          onClick={() => void loadProfilesAndConnections()}
        >
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
          <ClearBox style={settingsShellBadgeStyle}>{copy.savedCount(profiles.length)}</ClearBox>
          {filterDraft.trim() !== '' ? (
            <ClearBox style={settingsShellBadgeStyle}>{copy.visibleCount(visibleProfiles.length)}</ClearBox>
          ) : null}
          <ClearBox style={settingsShellBadgeStyle}>{copy.defaultCount(defaultProfilesCount)}</ClearBox>
        </ClearBox>
      </ClearBox>

      {statusMessage ? <Text style={settingsShellMutedTextStyle}>{statusMessage}</Text> : null}
      {errorMessage ? <Text style={settingsShellErrorTextStyle}>{errorMessage}</Text> : null}

      {isLoading ? (
        <Text style={settingsShellMutedTextStyle}>{copy.loadingProfiles}</Text>
      ) : profiles.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>{copy.noProfiles}</Text>
      ) : visibleProfiles.length === 0 ? (
        <Text style={settingsShellMutedTextStyle}>{copy.noFilterMatches}</Text>
      ) : (
        <ClearBox style={settingsShellListStyle}>
          {visibleProfiles.map((profile) => {
            const connection = connectionsSnapshot.connections.find((item) => item.id === profile.id)
            const isDefault = connectionsSnapshot.active_connection_id === profile.id
            const isBusy = busyProfileID === profile.id
            const connectionStatus = summarizeConnectionStatus(connection, copy)
            const tmuxSessions = tmuxSessionsByProfile[profile.id] ?? []
            const tmuxSessionFilter = tmuxSessionFiltersByProfile[profile.id] ?? ''
            const visibleTmuxSessions = tmuxSessions.filter((session) =>
              tmuxSessionMatchesFilter(session, tmuxSessionFilter),
            )
            const tmuxSessionDraft = tmuxSessionDraftsByProfile[profile.id] ?? profile.tmux_session ?? ''
            const attachedTmuxSessions = tmuxSessions.filter((session) => session.attached).length
            const detachedTmuxSessions = tmuxSessions.length - attachedTmuxSessions

            return (
              <ClearBox key={profile.id} style={settingsShellListRowStyle}>
                <ClearBox style={settingsShellContentHeaderStyle}>
                  <Text style={{ fontWeight: 600 }}>{profile.name}</Text>
                  <Text style={settingsShellMutedTextStyle}>{describeProfile(profile)}</Text>
                  {profile.identity_file ? (
                    <Text style={settingsShellMutedTextStyle}>{profile.identity_file}</Text>
                  ) : null}
                  {profile.launch_mode === 'tmux' ? (
                    <Text style={settingsShellMutedTextStyle}>
                      {copy.tmuxResume} {profile.tmux_session || copy.derivedAutomatically}
                    </Text>
                  ) : null}
                  {connectionStatus ? (
                    <Text style={settingsShellMutedTextStyle}>{connectionStatus}</Text>
                  ) : null}
                </ClearBox>
                <ClearBox
                  style={{
                    display: 'flex',
                    gap: 'var(--gap-xs)',
                    alignItems: 'center',
                    flexWrap: 'wrap' as const,
                  }}
                >
                  <ClearBox style={settingsShellBadgeStyle}>SSH</ClearBox>
                  {profile.launch_mode === 'tmux' ? (
                    <ClearBox style={settingsShellBadgeStyle}>tmux</ClearBox>
                  ) : null}
                  {isDefault ? (
                    <ClearBox style={settingsShellBadgeStyle}>{copy.defaultBadge}</ClearBox>
                  ) : null}
                  {connection ? (
                    <ClearBox style={settingsShellBadgeStyle}>{connection.usability}</ClearBox>
                  ) : null}
                  {connection ? (
                    <ClearBox style={settingsShellBadgeStyle}>{connection.runtime.check_status}</ClearBox>
                  ) : null}
                  {connection && connection.runtime.launch_status !== 'idle' ? (
                    <ClearBox style={settingsShellBadgeStyle}>
                      {copy.launchPrefix}
                      {connection.runtime.launch_status}
                    </ClearBox>
                  ) : null}
                  <Button
                    disabled={isBusy || isSavingProfile}
                    onClick={() => void handleSetDefaultProfile(profile.id)}
                  >
                    {copy.setDefault}
                  </Button>
                  <Button
                    disabled={isBusy || isSavingProfile}
                    onClick={() => void handleCheckProfile(profile.id)}
                  >
                    {copy.check}
                  </Button>
                  <Button
                    disabled={isBusy || isSavingProfile}
                    onClick={() => void handleOpenProfileShell(profile)}
                  >
                    {copy.openShell}
                  </Button>
                  {profile.launch_mode === 'tmux' ? (
                    <Button
                      disabled={isBusy || isSavingProfile || tmuxLoadingProfileID === profile.id}
                      onClick={() => void handleBrowseTmuxSessions(profile.id)}
                    >
                      {tmuxLoadingProfileID === profile.id
                        ? copy.loadingTmux
                        : tmuxSessionsByProfile[profile.id]
                          ? copy.refreshTmux
                          : copy.browseTmux}
                    </Button>
                  ) : null}
                  <Button disabled={isBusy || isSavingProfile} onClick={() => handleStartEdit(profile)}>
                    {copy.edit}
                  </Button>
                  <Button
                    disabled={isBusy || isSavingProfile}
                    onClick={() => void handleDeleteProfile(profile.id)}
                  >
                    {copy.delete}
                  </Button>
                </ClearBox>
                {profile.launch_mode === 'tmux' ? (
                  <ClearBox
                    style={{
                      display: 'grid',
                      gap: 'var(--gap-xs)',
                      width: '100%',
                    }}
                  >
                    {tmuxSessionsByProfile[profile.id] ? (
                      <ClearBox
                        style={{
                          display: 'grid',
                          gap: 'var(--gap-xs)',
                          width: '100%',
                          padding: '0.65rem',
                          border: '1px solid var(--color-border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          background: 'color-mix(in srgb, var(--color-surface-glass-soft) 72%, transparent)',
                        }}
                      >
                        <Text style={{ fontWeight: 600 }}>{copy.tmuxManager}</Text>
                        <Text style={settingsShellMutedTextStyle}>
                          {tmuxSessions.length > 0
                            ? copy.tmuxSummary(
                                tmuxSessions.length,
                                attachedTmuxSessions,
                                detachedTmuxSessions,
                              )
                            : copy.noTmuxSessionsYet}
                        </Text>
                        <ClearBox
                          style={{
                            display: 'grid',
                            gap: 'var(--gap-xs)',
                            gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                            alignItems: 'center',
                          }}
                        >
                          <Input
                            aria-label={copy.namedTmuxSessionAria(profile.name)}
                            onChange={(event) => handleTmuxSessionDraftChange(profile.id, event.target.value)}
                            placeholder="prod-main"
                            value={tmuxSessionDraft}
                          />
                          <Button
                            disabled={isSavingProfile || busyProfileID !== null}
                            onClick={() => void handleOpenNamedTmuxSession(profile)}
                          >
                            {copy.openNamedSession}
                          </Button>
                          <Button
                            disabled={isSavingProfile || busyProfileID !== null}
                            onClick={() => handleLoadNamedTmuxSession(profile)}
                          >
                            {copy.loadNamedSession}
                          </Button>
                        </ClearBox>
                        <Input
                          aria-label={copy.filterTmuxAria(profile.name)}
                          onChange={(event) => handleTmuxSessionFilterChange(profile.id, event.target.value)}
                          placeholder={copy.tmuxFilterPlaceholder}
                          value={tmuxSessionFilter}
                        />
                        {visibleTmuxSessions.length > 0 ? (
                          visibleTmuxSessions.map((session) => (
                            <ClearBox
                              key={session.name}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 'var(--gap-sm)',
                                flexWrap: 'wrap' as const,
                              }}
                            >
                              <Text style={settingsShellMutedTextStyle}>
                                {session.name}
                                {session.attached ? ` · ${copy.tmuxAttached}` : ` · ${copy.tmuxDetached}`}
                                {session.window_count ? ` · ${copy.windowCount(session.window_count)}` : ''}
                              </Text>
                              <Button
                                disabled={isSavingProfile || busyProfileID !== null}
                                onClick={() => void handleOpenProfileShell(profile, session.name)}
                              >
                                {copy.resumeSession}
                              </Button>
                              <Button
                                disabled={isSavingProfile || busyProfileID !== null}
                                onClick={() => handleUseTmuxSession(profile, session.name)}
                              >
                                {copy.useSession}
                              </Button>
                            </ClearBox>
                          ))
                        ) : (
                          <Text style={settingsShellMutedTextStyle}>{copy.noTmuxFilterMatches}</Text>
                        )}
                      </ClearBox>
                    ) : null}
                  </ClearBox>
                ) : null}
              </ClearBox>
            )
          })}
        </ClearBox>
      )}
    </ClearBox>
  )
}
