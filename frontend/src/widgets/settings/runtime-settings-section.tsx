import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { useRuntimeSettings } from '@/features/runtime/model/use-runtime-settings'
import { useWindowTitleSettings } from '@/features/runtime/model/use-window-title-settings'
import { RadioGroup, ClearBox } from '@/shared/ui/components'
import { Button, Input, Text } from '@/shared/ui/primitives'
import type { AppLocale } from '@/shared/api/runtime'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

type RuntimeSettingsCopy = {
  autoPreview: string
  browserBadge: string
  currentRule: string
  currentRuntime: string
  currentShellTransport: string
  currentMode: string
  customTitlePlaceholder: string
  customTitleTextboxLabel: string
  currentLanguage: string
  generalLanguageDescription: string
  homeDirectory: string
  languageChangesHint: string
  languageSectionDescription: string
  languageSectionTitle: string
  loading: string
  repositoryRoot: string
  resetToAuto: string
  refresh: string
  runtimeLifecycleDescription: string
  runtimeLifecycleTitle: string
  runtimeSectionDescription: string
  runtimeSectionTitle: string
  saveCustomTitle: string
  shellLanguage: string
  splitBrowserLoop: string
  transport: string
  unavailable: string
  windowTitleAutoDescription: string
  windowTitleAutoOptionDescription: string
  windowTitleCustomDescription: string
  windowTitleCustomOptionDescription: string
  windowTitleDescription: string
  windowTitleMode: string
  windowTitleTitle: string
  watcherModeHintDesktop: string
  watcherModeHintBrowser: string
  watcherModeLabelEphemeral: string
  watcherModeLabelPersistent: string
  watcherModeOptionEphemeralDescription: string
  watcherModeOptionEphemeralLabel: string
  watcherModeOptionPersistentDescription: string
  watcherModeOptionPersistentLabel: string
  watcherModeRadioLabel: string
  watcherModeShutdownEphemeral: string
  watcherModeShutdownPersistent: string
  watcherModeTransportDesktop: string
  desktopBadge: string
}

const localeOptionLabels: Record<AppLocale, string> = {
  en: 'English',
  ru: 'Русский',
  'zh-CN': '中文（简体）',
  es: 'Español',
}

const runtimeSettingsCopy: Record<AppLocale, RuntimeSettingsCopy> = {
  en: {
    autoPreview: 'Auto preview',
    browserBadge: 'Browser',
    desktopBadge: 'Desktop',
    currentRule: 'Current rule',
    currentRuntime: 'Current runtime',
    currentShellTransport: 'Current mode',
    currentMode: 'Current mode',
    customTitlePlaceholder: 'Ops Shell',
    customTitleTextboxLabel: 'Custom window title',
    currentLanguage: 'Current language',
    generalLanguageDescription:
      'Language preference is stored in the shared runtime settings contract and applies immediately on the active shell path.',
    homeDirectory: 'Home directory',
    languageChangesHint: 'Language changes apply immediately and do not require restarting the app.',
    languageSectionDescription:
      'The active shell keeps one runtime-owned language preference instead of browser-local translation state.',
    languageSectionTitle: 'Language',
    loading: 'Loading…',
    repositoryRoot: 'Repository root',
    resetToAuto: 'Reset to auto',
    refresh: 'Refresh',
    runtimeLifecycleDescription:
      'Watcher mode is a real desktop runtime setting. It controls whether closing the desktop shell detaches from the runtime or shuts it down.',
    runtimeLifecycleTitle: 'Runtime lifecycle',
    runtimeSectionDescription:
      'The active shell settings surface reads the same runtime bootstrap metadata that powers the main shell.',
    runtimeSectionTitle: 'Current runtime',
    saveCustomTitle: 'Save custom title',
    shellLanguage: 'Shell language',
    splitBrowserLoop: 'Split browser dev loop',
    transport: 'Transport',
    unavailable: 'Unavailable',
    windowTitleAutoDescription: 'Auto title follows the active workspace title on the current shell path.',
    windowTitleAutoOptionDescription: 'Use the active workspace title and append the product label.',
    windowTitleCustomDescription: 'Pinned custom title stays until reset back to auto.',
    windowTitleCustomOptionDescription: 'Pin an explicit operator-defined window title until reset.',
    windowTitleDescription:
      'Window title rules stay narrow on purpose: auto title follows the active workspace on the current shell path, or operators can pin an explicit custom title.',
    windowTitleMode: 'Window title mode',
    windowTitleTitle: 'Window title',
    watcherModeHintDesktop:
      'Changes are written through the desktop runtime settings and affect the close-window behavior immediately.',
    watcherModeHintBrowser:
      'This control is read-only in the split browser dev loop. Open the desktop app to persist watcher mode changes.',
    watcherModeLabelEphemeral: 'Ephemeral',
    watcherModeLabelPersistent: 'Persistent',
    watcherModeOptionEphemeralDescription:
      'The desktop window owns the runtime and shuts it down on close after task checks.',
    watcherModeOptionEphemeralLabel: 'Ephemeral runtime',
    watcherModeOptionPersistentDescription:
      'The desktop window can close without stopping the runtime process.',
    watcherModeOptionPersistentLabel: 'Persistent runtime',
    watcherModeRadioLabel: 'Desktop watcher mode',
    watcherModeShutdownEphemeral:
      'Closing the desktop window stops the owned runtime after the active-task guard passes.',
    watcherModeShutdownPersistent:
      'Closing the desktop window detaches from the runtime and leaves it running.',
    watcherModeTransportDesktop: 'Desktop app runtime',
  },
  ru: {
    autoPreview: 'Auto preview',
    browserBadge: 'Браузер',
    desktopBadge: 'Desktop',
    currentRule: 'Текущее правило',
    currentRuntime: 'Текущий рантайм',
    currentShellTransport: 'Текущий режим',
    currentMode: 'Текущий режим',
    customTitlePlaceholder: 'Ops Shell',
    customTitleTextboxLabel: 'Пользовательский заголовок окна',
    currentLanguage: 'Текущий язык',
    generalLanguageDescription:
      'Язык хранится в общем runtime settings contract и применяется сразу на активном shell path.',
    homeDirectory: 'Домашняя директория',
    languageChangesHint: 'Смена языка применяется сразу и не требует перезапуска приложения.',
    languageSectionDescription:
      'Активный shell держит один runtime-backed language preference без browser-local translation state.',
    languageSectionTitle: 'Язык',
    loading: 'Загрузка…',
    repositoryRoot: 'Корень репозитория',
    resetToAuto: 'Сбросить в auto',
    refresh: 'Обновить',
    runtimeLifecycleDescription:
      'Watcher mode — это реальная desktop runtime настройка. Она определяет, отсоединяется ли рантайм при закрытии окна или завершается полностью.',
    runtimeLifecycleTitle: 'Жизненный цикл runtime',
    runtimeSectionDescription:
      'Активный settings shell читает тот же runtime bootstrap metadata, что и основной shell.',
    runtimeSectionTitle: 'Текущий runtime',
    saveCustomTitle: 'Сохранить заголовок',
    shellLanguage: 'Язык shell',
    splitBrowserLoop: 'Split browser dev loop',
    transport: 'Транспорт',
    unavailable: 'Недоступно',
    windowTitleAutoDescription: 'Auto title следует за заголовком активного workspace на текущем shell path.',
    windowTitleAutoOptionDescription: 'Использовать заголовок активного workspace и добавлять product label.',
    windowTitleCustomDescription:
      'Зафиксированный custom title сохраняется до ручного сброса обратно в auto.',
    windowTitleCustomOptionDescription: 'Закрепить явный operator-defined заголовок окна до сброса.',
    windowTitleDescription:
      'Правила заголовка окна специально узкие: auto title следует за активным workspace, либо оператор фиксирует явный custom title.',
    windowTitleMode: 'Режим заголовка окна',
    windowTitleTitle: 'Заголовок окна',
    watcherModeHintDesktop:
      'Изменения записываются через desktop runtime settings и сразу влияют на поведение закрытия окна.',
    watcherModeHintBrowser:
      'В split browser dev loop этот control доступен только для чтения. Открой desktop app, чтобы сохранить watcher mode.',
    watcherModeLabelEphemeral: 'Ephemeral',
    watcherModeLabelPersistent: 'Persistent',
    watcherModeOptionEphemeralDescription:
      'Desktop окно владеет рантаймом и завершает его при закрытии после проверки активных задач.',
    watcherModeOptionEphemeralLabel: 'Ephemeral runtime',
    watcherModeOptionPersistentDescription: 'Desktop окно можно закрыть без остановки runtime процесса.',
    watcherModeOptionPersistentLabel: 'Persistent runtime',
    watcherModeRadioLabel: 'Режим desktop watcher',
    watcherModeShutdownEphemeral:
      'Закрытие desktop окна останавливает принадлежащий ему runtime после прохождения active-task guard.',
    watcherModeShutdownPersistent:
      'Закрытие desktop окна отсоединяется от runtime и оставляет его запущенным.',
    watcherModeTransportDesktop: 'Desktop app runtime',
  },
  'zh-CN': {
    autoPreview: '自动预览',
    browserBadge: '浏览器',
    desktopBadge: '桌面',
    currentRule: '当前规则',
    currentRuntime: '当前运行时',
    currentShellTransport: '当前模式',
    currentMode: '当前模式',
    customTitlePlaceholder: 'Ops Shell',
    customTitleTextboxLabel: '自定义窗口标题',
    currentLanguage: '当前语言',
    generalLanguageDescription:
      '语言偏好保存在共享的 runtime settings contract 中，并会立即应用到当前 shell path。',
    homeDirectory: '主目录',
    languageChangesHint: '语言切换会立即生效，不需要重启应用。',
    languageSectionDescription:
      '当前 shell 只使用一个 runtime-backed language preference，而不是浏览器本地翻译状态。',
    languageSectionTitle: '语言',
    loading: '加载中…',
    repositoryRoot: '仓库根目录',
    resetToAuto: '恢复自动',
    refresh: '刷新',
    runtimeLifecycleDescription:
      'Watcher mode 是真实的桌面运行时设置。它决定关闭桌面窗口时是与运行时分离，还是直接关闭运行时。',
    runtimeLifecycleTitle: '运行时生命周期',
    runtimeSectionDescription: '当前 settings shell 读取与主 shell 相同的 runtime bootstrap metadata。',
    runtimeSectionTitle: '当前运行时',
    saveCustomTitle: '保存自定义标题',
    shellLanguage: 'Shell 语言',
    splitBrowserLoop: '拆分浏览器开发循环',
    transport: '传输',
    unavailable: '不可用',
    windowTitleAutoDescription: '自动标题会跟随当前 shell path 上的活动 workspace 标题。',
    windowTitleAutoOptionDescription: '使用活动 workspace 标题，并附加产品标签。',
    windowTitleCustomDescription: '固定的自定义标题会一直保留，直到手动恢复为自动。',
    windowTitleCustomOptionDescription: '固定一个明确的操作员自定义窗口标题，直到重置。',
    windowTitleDescription:
      '窗口标题规则在这个阶段保持精简：自动标题跟随活动 workspace，或者由操作员固定一个自定义标题。',
    windowTitleMode: '窗口标题模式',
    windowTitleTitle: '窗口标题',
    watcherModeHintDesktop: '更改会写入桌面运行时设置，并立即影响关闭窗口的行为。',
    watcherModeHintBrowser:
      '在拆分浏览器开发循环中，该控件为只读。请打开桌面应用以持久化 watcher mode 更改。',
    watcherModeLabelEphemeral: '临时',
    watcherModeLabelPersistent: '常驻',
    watcherModeOptionEphemeralDescription: '桌面窗口拥有运行时，并会在关闭时经过任务检查后将其关闭。',
    watcherModeOptionEphemeralLabel: '临时运行时',
    watcherModeOptionPersistentDescription: '桌面窗口可以关闭，而不停止运行时进程。',
    watcherModeOptionPersistentLabel: '常驻运行时',
    watcherModeRadioLabel: '桌面 watcher 模式',
    watcherModeShutdownEphemeral: '关闭桌面窗口会在活动任务检查通过后停止所属运行时。',
    watcherModeShutdownPersistent: '关闭桌面窗口会与运行时分离，并让它继续运行。',
    watcherModeTransportDesktop: '桌面应用运行时',
  },
  es: {
    autoPreview: 'Vista previa auto',
    browserBadge: 'Navegador',
    desktopBadge: 'Escritorio',
    currentRule: 'Regla actual',
    currentRuntime: 'Runtime actual',
    currentShellTransport: 'Modo actual',
    currentMode: 'Modo actual',
    customTitlePlaceholder: 'Ops Shell',
    customTitleTextboxLabel: 'Título personalizado de la ventana',
    currentLanguage: 'Idioma actual',
    generalLanguageDescription:
      'La preferencia de idioma se guarda en el contrato compartido de runtime settings y se aplica de inmediato en el shell activo.',
    homeDirectory: 'Directorio personal',
    languageChangesHint:
      'Los cambios de idioma se aplican al instante y no requieren reiniciar la aplicación.',
    languageSectionDescription:
      'El shell activo usa una sola preferencia de idioma controlada por el runtime, no un estado local del navegador.',
    languageSectionTitle: 'Idioma',
    loading: 'Cargando…',
    repositoryRoot: 'Raíz del repositorio',
    resetToAuto: 'Restablecer a auto',
    refresh: 'Actualizar',
    runtimeLifecycleDescription:
      'Watcher mode es una configuración real del runtime de escritorio. Controla si al cerrar la ventana se desacopla del runtime o si lo apaga.',
    runtimeLifecycleTitle: 'Ciclo de vida del runtime',
    runtimeSectionDescription:
      'La superficie activa de settings lee el mismo bootstrap metadata del runtime que usa el shell principal.',
    runtimeSectionTitle: 'Runtime actual',
    saveCustomTitle: 'Guardar título personalizado',
    shellLanguage: 'Idioma del shell',
    splitBrowserLoop: 'Bucle de desarrollo en navegador',
    transport: 'Transporte',
    unavailable: 'No disponible',
    windowTitleAutoDescription:
      'El título automático sigue el título del workspace activo en el shell actual.',
    windowTitleAutoOptionDescription: 'Usa el título del workspace activo y añade la etiqueta del producto.',
    windowTitleCustomDescription:
      'El título personalizado fijado se mantiene hasta restablecerlo manualmente a auto.',
    windowTitleCustomOptionDescription:
      'Fija un título de ventana definido explícitamente por el operador hasta restablecerlo.',
    windowTitleDescription:
      'Las reglas del título de la ventana siguen siendo estrechas a propósito: el modo auto sigue el workspace activo o el operador fija un título explícito.',
    windowTitleMode: 'Modo del título de ventana',
    windowTitleTitle: 'Título de ventana',
    watcherModeHintDesktop:
      'Los cambios se escriben a través de la configuración del runtime de escritorio y afectan inmediatamente al comportamiento de cierre.',
    watcherModeHintBrowser:
      'Este control es de solo lectura en el bucle de desarrollo del navegador. Abre la app de escritorio para persistir cambios de watcher mode.',
    watcherModeLabelEphemeral: 'Efímero',
    watcherModeLabelPersistent: 'Persistente',
    watcherModeOptionEphemeralDescription:
      'La ventana de escritorio es dueña del runtime y lo detiene al cerrar tras comprobar tareas activas.',
    watcherModeOptionEphemeralLabel: 'Runtime efímero',
    watcherModeOptionPersistentDescription:
      'La ventana de escritorio puede cerrarse sin detener el proceso del runtime.',
    watcherModeOptionPersistentLabel: 'Runtime persistente',
    watcherModeRadioLabel: 'Modo del watcher de escritorio',
    watcherModeShutdownEphemeral:
      'Cerrar la ventana del escritorio detiene el runtime gestionado cuando pasa la comprobación de tareas activas.',
    watcherModeShutdownPersistent:
      'Cerrar la ventana del escritorio la desacopla del runtime y lo deja ejecutándose.',
    watcherModeTransportDesktop: 'Runtime de la app de escritorio',
  },
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

function watcherModeLabel(mode: 'ephemeral' | 'persistent', copy: RuntimeSettingsCopy) {
  return mode === 'persistent' ? copy.watcherModeLabelPersistent : copy.watcherModeLabelEphemeral
}

function shutdownBehaviorText(mode: 'ephemeral' | 'persistent', copy: RuntimeSettingsCopy) {
  return mode === 'persistent' ? copy.watcherModeShutdownPersistent : copy.watcherModeShutdownEphemeral
}

export function RuntimeSettingsSection() {
  const {
    canPersistWatcherMode,
    errorMessage,
    isLoading,
    isSaving,
    refresh,
    runtimeContext,
    updateWatcherMode,
    watcherMode,
  } = useRuntimeSettings()
  const {
    errorMessage: localeErrorMessage,
    isLoading: isLocaleLoading,
    isSaving: isLocaleSaving,
    locale,
    refresh: refreshLocale,
    setLocale,
    supportedLocales,
  } = useAppLocale()
  const {
    autoTitle,
    customTitle,
    errorMessage: windowTitleError,
    isLoading: isLoadingWindowTitle,
    isSaving: isSavingWindowTitle,
    mode: windowTitleMode,
    refresh: refreshWindowTitle,
    updateSettings: updateWindowTitleSettings,
  } = useWindowTitleSettings()
  const [customTitleDraft, setCustomTitleDraft] = useState('')
  const copy = runtimeSettingsCopy[locale]

  const languageOptions = useMemo(
    () =>
      supportedLocales.map((supportedLocale) => ({
        value: supportedLocale,
        label: localeOptionLabels[supportedLocale],
      })),
    [supportedLocales],
  )

  useEffect(() => {
    setCustomTitleDraft(customTitle)
  }, [customTitle])

  return (
    <>
      <SectionCard description={copy.languageSectionDescription} title={copy.languageSectionTitle}>
        <ClearBox style={settingsShellListStyle}>
          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>{copy.currentLanguage}</Text>
              <Text style={settingsShellMutedTextStyle}>{copy.generalLanguageDescription}</Text>
            </ClearBox>
            <ClearBox
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-xs)', flexWrap: 'wrap' }}
            >
              <ClearBox style={settingsShellBadgeStyle}>{localeOptionLabels[locale]}</ClearBox>
              <Button disabled={isLocaleLoading || isLocaleSaving} onClick={() => void refreshLocale()}>
                {isLocaleLoading ? copy.loading : copy.refresh}
              </Button>
            </ClearBox>
          </ClearBox>
        </ClearBox>

        {localeErrorMessage ? (
          <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{localeErrorMessage}</Text>
        ) : null}

        <RadioGroup
          disabled={isLocaleLoading || isLocaleSaving}
          label={copy.shellLanguage}
          name="runtime-shell-language"
          onChange={(value) => void setLocale((value as AppLocale) || 'en')}
          options={languageOptions}
          value={locale}
        />

        <Text style={settingsShellMutedTextStyle}>{copy.languageChangesHint}</Text>
      </SectionCard>

      <SectionCard description={copy.runtimeLifecycleDescription} title={copy.runtimeLifecycleTitle}>
        <ClearBox style={settingsShellListStyle}>
          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>{copy.currentMode}</Text>
              <Text style={settingsShellMutedTextStyle}>{shutdownBehaviorText(watcherMode, copy)}</Text>
            </ClearBox>
            <ClearBox
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-xs)', flexWrap: 'wrap' }}
            >
              <ClearBox style={settingsShellBadgeStyle}>{watcherModeLabel(watcherMode, copy)}</ClearBox>
              <Button disabled={isLoading || isSaving} onClick={() => void refresh()}>
                {isLoading ? copy.loading : copy.refresh}
              </Button>
            </ClearBox>
          </ClearBox>
        </ClearBox>

        {errorMessage ? (
          <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{errorMessage}</Text>
        ) : null}

        <RadioGroup
          disabled={isLoading || isSaving || !canPersistWatcherMode}
          label={copy.watcherModeRadioLabel}
          name="runtime-watcher-mode"
          onChange={(value) => void updateWatcherMode(value === 'persistent' ? 'persistent' : 'ephemeral')}
          options={[
            {
              value: 'ephemeral',
              label: copy.watcherModeOptionEphemeralLabel,
              description: copy.watcherModeOptionEphemeralDescription,
            },
            {
              value: 'persistent',
              label: copy.watcherModeOptionPersistentLabel,
              description: copy.watcherModeOptionPersistentDescription,
            },
          ]}
          value={watcherMode}
        />

        <Text style={settingsShellMutedTextStyle}>
          {canPersistWatcherMode ? copy.watcherModeHintDesktop : copy.watcherModeHintBrowser}
        </Text>
      </SectionCard>

      <SectionCard description={copy.windowTitleDescription} title={copy.windowTitleTitle}>
        <ClearBox style={settingsShellListStyle}>
          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>{copy.currentRule}</Text>
              <Text style={settingsShellMutedTextStyle}>
                {windowTitleMode === 'custom'
                  ? copy.windowTitleCustomDescription
                  : copy.windowTitleAutoDescription}
              </Text>
            </ClearBox>
            <ClearBox
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--gap-xs)', flexWrap: 'wrap' }}
            >
              <ClearBox style={settingsShellBadgeStyle}>{windowTitleMode}</ClearBox>
              <Button
                disabled={isLoadingWindowTitle || isSavingWindowTitle}
                onClick={() => void refreshWindowTitle()}
              >
                {isLoadingWindowTitle ? copy.loading : copy.refresh}
              </Button>
            </ClearBox>
          </ClearBox>
        </ClearBox>

        {windowTitleError ? (
          <Text style={{ color: 'var(--color-danger-text, #ff8e8e)' }}>{windowTitleError}</Text>
        ) : null}

        <RadioGroup
          disabled={isLoadingWindowTitle || isSavingWindowTitle}
          label={copy.windowTitleMode}
          name="window-title-mode"
          onChange={(value) =>
            void updateWindowTitleSettings({
              mode: value === 'custom' ? 'custom' : 'auto',
            })
          }
          options={[
            {
              value: 'auto',
              label: 'Auto title',
              description: copy.windowTitleAutoOptionDescription,
            },
            {
              value: 'custom',
              label: 'Custom title',
              description: copy.windowTitleCustomOptionDescription,
            },
          ]}
          value={windowTitleMode}
        />

        <ClearBox style={{ display: 'grid', gap: 'var(--gap-sm)' }}>
          <Input
            aria-label={copy.customTitleTextboxLabel}
            disabled={isLoadingWindowTitle || isSavingWindowTitle || windowTitleMode !== 'custom'}
            onChange={(event) => setCustomTitleDraft(event.currentTarget.value)}
            placeholder={copy.customTitlePlaceholder}
            value={customTitleDraft}
          />
          <Text style={settingsShellMutedTextStyle}>
            {copy.autoPreview}: {autoTitle || 'RunaTerminal'}
          </Text>
          <Button
            disabled={isLoadingWindowTitle || isSavingWindowTitle || windowTitleMode !== 'custom'}
            onClick={() =>
              void updateWindowTitleSettings({
                customTitle: customTitleDraft,
                mode: 'custom',
              })
            }
          >
            {copy.saveCustomTitle}
          </Button>
          <Button
            disabled={isLoadingWindowTitle || isSavingWindowTitle || windowTitleMode === 'auto'}
            onClick={() =>
              void updateWindowTitleSettings({
                mode: 'auto',
              })
            }
          >
            {copy.resetToAuto}
          </Button>
        </ClearBox>
      </SectionCard>

      <SectionCard description={copy.runtimeSectionDescription} title={copy.runtimeSectionTitle}>
        <ClearBox style={settingsShellListStyle}>
          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>{copy.transport}</Text>
              <Text style={settingsShellMutedTextStyle}>
                {canPersistWatcherMode ? copy.watcherModeTransportDesktop : copy.splitBrowserLoop}
              </Text>
            </ClearBox>
            <ClearBox style={settingsShellBadgeStyle}>
              {canPersistWatcherMode ? copy.desktopBadge : copy.browserBadge}
            </ClearBox>
          </ClearBox>

          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>{copy.repositoryRoot}</Text>
              <Text style={settingsShellMutedTextStyle}>
                {runtimeContext?.repoRoot ?? (isLoading ? copy.loading : copy.unavailable)}
              </Text>
            </ClearBox>
          </ClearBox>

          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>{copy.homeDirectory}</Text>
              <Text style={settingsShellMutedTextStyle}>
                {runtimeContext?.homeDir || (isLoading ? copy.loading : copy.unavailable)}
              </Text>
            </ClearBox>
          </ClearBox>

          <ClearBox style={settingsShellListRowStyle}>
            <ClearBox style={settingsShellContentHeaderStyle}>
              <Text style={{ fontWeight: 600 }}>{copy.currentShellTransport}</Text>
              <Text style={settingsShellMutedTextStyle}>{shutdownBehaviorText(watcherMode, copy)}</Text>
            </ClearBox>
          </ClearBox>
        </ClearBox>
      </SectionCard>
    </>
  )
}
