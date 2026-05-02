import type { ReactNode } from 'react'

import { RadioGroup, ClearBox } from '@/shared/ui/components'
import { Text } from '@/shared/ui/primitives'
import { useAiComposerPreferences } from '@/features/agent/model/use-ai-composer-preferences'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import type { AppLocale } from '@/shared/api/runtime'
import {
  settingsShellBadgeStyle,
  settingsShellContentHeaderStyle,
  settingsShellListRowStyle,
  settingsShellListStyle,
  settingsShellMutedTextStyle,
  settingsShellSectionCardStyle,
} from '@/widgets/settings/settings-shell-widget.styles'

type AiComposerSettingsCopy = {
  currentMode: string
  description: string
  enterSendsDescription: string
  enterSendsLabel: string
  loading: string
  modEnterSendsDescription: string
  modEnterSendsLabel: string
  optionLabel: string
  runtime: string
  saving: string
  storedPreference: string
  title: string
}

const aiComposerSettingsCopy: Record<AppLocale, AiComposerSettingsCopy> = {
  en: {
    currentMode: 'Current mode',
    description:
      'Runtime-backed keyboard behavior for the AI composer. The selected send/newline shortcut is stored in the shared runtime settings contract.',
    enterSendsDescription: 'Shift+Enter inserts a new line.',
    enterSendsLabel: 'Enter sends',
    loading: 'Loading',
    modEnterSendsDescription: 'Plain Enter inserts a new line.',
    modEnterSendsLabel: 'Ctrl/Cmd+Enter sends',
    optionLabel: 'Composer submit shortcut',
    runtime: 'Runtime',
    saving: 'Saving',
    storedPreference:
      'This preference is stored in the runtime DB and applies immediately to the AI composer.',
    title: 'Keyboard submit behavior',
  },
  ru: {
    currentMode: 'Текущий режим',
    description: 'Выберите, какое сочетание отправляет сообщение, а какое переносит строку.',
    enterSendsDescription: 'Shift+Enter вставляет новую строку.',
    enterSendsLabel: 'Enter отправляет',
    loading: 'Загрузка',
    modEnterSendsDescription: 'Обычный Enter вставляет новую строку.',
    modEnterSendsLabel: 'Ctrl/Cmd+Enter отправляет',
    optionLabel: 'Сочетание отправки',
    runtime: 'Сохранено',
    saving: 'Сохранение',
    storedPreference: 'Настройка сразу применяется к полю ввода чата.',
    title: 'Отправка с клавиатуры',
  },
  'zh-CN': {
    currentMode: '当前模式',
    description: 'AI 编写器的键盘行为由运行时托管。发送和换行快捷键会存储在共享运行时设置契约中。',
    enterSendsDescription: 'Shift+Enter 插入新行。',
    enterSendsLabel: 'Enter 发送',
    loading: '加载中',
    modEnterSendsDescription: '普通 Enter 插入新行。',
    modEnterSendsLabel: 'Ctrl/Cmd+Enter 发送',
    optionLabel: '编写器发送快捷键',
    runtime: '运行时',
    saving: '保存中',
    storedPreference: '此首选项存储在运行时数据库中，并会立即应用到 AI 编写器。',
    title: '键盘发送行为',
  },
  es: {
    currentMode: 'Modo actual',
    description:
      'El comportamiento de teclado del composer de IA esta respaldado por runtime. El atajo de envio y salto de linea se guarda en el contrato compartido de ajustes.',
    enterSendsDescription: 'Shift+Enter inserta una nueva linea.',
    enterSendsLabel: 'Enter envia',
    loading: 'Cargando',
    modEnterSendsDescription: 'Enter normal inserta una nueva linea.',
    modEnterSendsLabel: 'Ctrl/Cmd+Enter envia',
    optionLabel: 'Atajo de envio del composer',
    runtime: 'Runtime',
    saving: 'Guardando',
    storedPreference:
      'Esta preferencia se guarda en la DB de runtime y se aplica inmediatamente al composer de IA.',
    title: 'Comportamiento de envio con teclado',
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

export function AiComposerSettingsSection() {
  const { locale } = useAppLocale()
  const copy = aiComposerSettingsCopy[locale]
  const { submitMode, updateSubmitMode, isLoading, isSaving, errorMessage } = useAiComposerPreferences()

  return (
    <SectionCard description={copy.description} title={copy.title}>
      <ClearBox style={settingsShellListStyle}>
        <ClearBox style={settingsShellListRowStyle}>
          <ClearBox style={settingsShellContentHeaderStyle}>
            <Text style={{ fontWeight: 600 }}>{copy.currentMode}</Text>
            <Text style={settingsShellMutedTextStyle}>
              {submitMode === 'enter-sends'
                ? `${copy.enterSendsLabel}; ${copy.enterSendsDescription}`
                : `${copy.modEnterSendsDescription} ${copy.modEnterSendsLabel}.`}
            </Text>
          </ClearBox>
          <ClearBox style={settingsShellBadgeStyle}>
            {isLoading ? copy.loading : isSaving ? copy.saving : copy.runtime}
          </ClearBox>
        </ClearBox>
      </ClearBox>

      <RadioGroup
        label={copy.optionLabel}
        name="ai-composer-submit-mode"
        onChange={(value) =>
          updateSubmitMode(value === 'mod-enter-sends' ? 'mod-enter-sends' : 'enter-sends')
        }
        options={[
          {
            value: 'enter-sends',
            label: copy.enterSendsLabel,
            description: copy.enterSendsDescription,
          },
          {
            value: 'mod-enter-sends',
            label: copy.modEnterSendsLabel,
            description: copy.modEnterSendsDescription,
          },
        ]}
        value={submitMode}
        disabled={isLoading || isSaving}
      />

      <Text style={settingsShellMutedTextStyle}>{copy.storedPreference}</Text>
      {errorMessage ? <Text style={settingsShellMutedTextStyle}>{errorMessage}</Text> : null}
    </SectionCard>
  )
}
