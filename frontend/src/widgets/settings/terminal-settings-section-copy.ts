import type { LocalizedCopy } from '@/features/i18n/model/localized-copy'

export type TerminalSettingsCopy = {
  adjustLineHeightDescription: (min: number, max: number, defaultValue: number) => string
  adjustLineHeightTitle: string
  adjustScrollbackDescription: (min: number, max: number, defaultValue: number) => string
  adjustScrollbackTitle: string
  adjustSizeDescription: (min: number, max: number, defaultValue: number) => string
  adjustSizeTitle: string
  cursorBlinkDisabled: string
  cursorBlinkEnabled: string
  cursorBlinkTitle: string
  cursorBlinkDescription: string
  cursorStyleBar: string
  cursorStyleBlock: string
  cursorStyleDescription: string
  cursorStyleTitle: string
  cursorStyleUnderline: string
  currentFontDescription: string
  currentFontTitle: string
  currentLineHeightDescription: string
  currentLineHeightTitle: string
  currentScrollbackDescription: string
  currentScrollbackTitle: string
  defaultStateDescription: string
  decreaseFontSizeAria: string
  decreaseLineHeightAria: string
  decreaseScrollbackAria: string
  enableCursorBlinkAria: string
  increaseFontSizeAria: string
  increaseLineHeightAria: string
  increaseScrollbackAria: string
  loading: string
  resetAllDefaultsAria: string
  resetCursorBlinkAria: string
  resetCursorStyleAria: string
  resetFontSizeAria: string
  resetLineHeightAria: string
  resetScrollbackAria: string
  resetThemeModeAria: string
  resetTitle: string
  resetDescription: string
  sectionDescription: string
  sectionTitle: string
  terminalCursorStyleAria: string
  terminalThemeModeAria: string
  themeModeAdaptive: string
  themeModeContrast: string
  themeModeDescription: string
  themeModeTitle: string
}

export const terminalSettingsCopy: LocalizedCopy<TerminalSettingsCopy> = {
  en: {
    adjustLineHeightDescription: (min, max, defaultValue) =>
      `Range ${min.toFixed(2)}x-${max.toFixed(2)}x, default ${defaultValue.toFixed(2)}x.`,
    adjustLineHeightTitle: 'Adjust line height',
    adjustScrollbackDescription: (min, max, defaultValue) =>
      `Range ${min}-${max} lines, default ${defaultValue}.`,
    adjustScrollbackTitle: 'Adjust scrollback',
    adjustSizeDescription: (min, max, defaultValue) => `Range ${min}px-${max}px, default ${defaultValue}px.`,
    adjustSizeTitle: 'Adjust size',
    cursorBlinkDisabled: 'Disabled',
    cursorBlinkEnabled: 'Enabled',
    cursorBlinkTitle: 'Blinking cursor',
    cursorBlinkDescription:
      'Blink preference is stored in the runtime, while xterm still disables blink for exited and failed sessions.',
    cursorStyleBar: 'Bar',
    cursorStyleBlock: 'Block',
    cursorStyleDescription:
      'Cursor shape is set through the backend-owned contract and applies to live xterm sessions.',
    cursorStyleTitle: 'Terminal cursor style',
    cursorStyleUnderline: 'Underline',
    currentFontDescription:
      'Changes apply immediately to every terminal widget and persist in runtime state.',
    currentFontTitle: 'Current terminal font size',
    currentLineHeightDescription:
      'Line height controls xterm vertical density and applies immediately to live terminal widgets.',
    currentLineHeightTitle: 'Current line height',
    currentScrollbackDescription:
      'Scrollback limits the xterm buffer depth and now also goes through the runtime-owned contract.',
    currentScrollbackTitle: 'Current scrollback',
    defaultStateDescription: 'These terminal settings are now backed by the shared runtime contract.',
    decreaseFontSizeAria: 'Decrease terminal font size',
    decreaseLineHeightAria: 'Decrease terminal line height',
    decreaseScrollbackAria: 'Decrease terminal scrollback',
    enableCursorBlinkAria: 'Enable terminal cursor blink',
    increaseFontSizeAria: 'Increase terminal font size',
    increaseLineHeightAria: 'Increase terminal line height',
    increaseScrollbackAria: 'Increase terminal scrollback',
    loading: 'Loading...',
    resetAllDefaultsAria: 'Reset all terminal defaults',
    resetCursorBlinkAria: 'Reset terminal cursor blink',
    resetCursorStyleAria: 'Reset terminal cursor style',
    resetFontSizeAria: 'Reset terminal font size',
    resetLineHeightAria: 'Reset terminal line height',
    resetScrollbackAria: 'Reset terminal scrollback',
    resetThemeModeAria: 'Reset terminal theme mode',
    resetTitle: 'Reset terminal defaults',
    resetDescription:
      'One-shot restore of the runtime-owned terminal baseline for typography, palette, scrollback, and cursor behavior.',
    sectionDescription:
      'Runtime-owned terminal defaults. They are stored in backend state and apply to every live terminal widget in the current shell.',
    sectionTitle: 'Terminal runtime defaults',
    terminalCursorStyleAria: 'Terminal cursor style',
    terminalThemeModeAria: 'Terminal theme mode',
    themeModeAdaptive: 'Adaptive',
    themeModeContrast: 'Contrast',
    themeModeDescription:
      'Adaptive follows the current shell chrome, while contrast forces a higher-contrast terminal palette.',
    themeModeTitle: 'Terminal theme mode',
  },
  ru: {
    adjustLineHeightDescription: (min, max, defaultValue) =>
      `Диапазон ${min.toFixed(2)}x-${max.toFixed(2)}x, по умолчанию ${defaultValue.toFixed(2)}x.`,
    adjustLineHeightTitle: 'Настроить высоту строки',
    adjustScrollbackDescription: (min, max, defaultValue) =>
      `Диапазон ${min}-${max} строк, по умолчанию ${defaultValue}.`,
    adjustScrollbackTitle: 'Настроить буфер прокрутки',
    adjustSizeDescription: (min, max, defaultValue) =>
      `Диапазон ${min}px-${max}px, по умолчанию ${defaultValue}px.`,
    adjustSizeTitle: 'Настроить размер',
    cursorBlinkDisabled: 'Выключено',
    cursorBlinkEnabled: 'Включено',
    cursorBlinkTitle: 'Мигание курсора',
    cursorBlinkDescription:
      'Настройка мигания сохраняется в приложении, но xterm выключает мигание для завершённых и упавших сессий.',
    cursorStyleBar: 'Полоса',
    cursorStyleBlock: 'Блок',
    cursorStyleDescription:
      'Форма курсора задаётся через общий контракт настроек и применяется к живым сессиям xterm.',
    cursorStyleTitle: 'Стиль курсора терминала',
    cursorStyleUnderline: 'Подчёркивание',
    currentFontDescription:
      'Изменение применяется сразу ко всем терминальным виджетам и сохраняется в настройках.',
    currentFontTitle: 'Текущий размер шрифта терминала',
    currentLineHeightDescription:
      'Высота строки управляет вертикальной плотностью xterm и применяется сразу ко всем живым терминальным виджетам.',
    currentLineHeightTitle: 'Текущая высота строки',
    currentScrollbackDescription:
      'Буфер прокрутки ограничивает объём истории xterm и сохраняется в общих настройках.',
    currentScrollbackTitle: 'Текущий буфер прокрутки',
    defaultStateDescription: 'Эти настройки терминала сохраняются в общем контракте настроек.',
    decreaseFontSizeAria: 'Уменьшить размер шрифта терминала',
    decreaseLineHeightAria: 'Уменьшить высоту строки терминала',
    decreaseScrollbackAria: 'Уменьшить буфер прокрутки терминала',
    enableCursorBlinkAria: 'Включить мигание курсора терминала',
    increaseFontSizeAria: 'Увеличить размер шрифта терминала',
    increaseLineHeightAria: 'Увеличить высоту строки терминала',
    increaseScrollbackAria: 'Увеличить буфер прокрутки терминала',
    loading: 'Загрузка…',
    resetAllDefaultsAria: 'Сбросить все настройки терминала',
    resetCursorBlinkAria: 'Сбросить мигание курсора терминала',
    resetCursorStyleAria: 'Сбросить стиль курсора терминала',
    resetFontSizeAria: 'Сбросить размер шрифта терминала',
    resetLineHeightAria: 'Сбросить высоту строки терминала',
    resetScrollbackAria: 'Сбросить буфер прокрутки терминала',
    resetThemeModeAria: 'Сбросить режим темы терминала',
    resetTitle: 'Сбросить настройки терминала',
    resetDescription:
      'Одно действие возвращает базовые настройки терминала для типографики, палитры, буфера прокрутки и поведения курсора.',
    sectionDescription:
      'Настройки терминала по умолчанию сохраняются в приложении и применяются ко всем живым терминальным виджетам.',
    sectionTitle: 'Настройки терминала по умолчанию',
    terminalCursorStyleAria: 'Стиль курсора терминала',
    terminalThemeModeAria: 'Режим темы терминала',
    themeModeAdaptive: 'Адаптивный',
    themeModeContrast: 'Контрастный',
    themeModeDescription:
      'Адаптивный режим следует текущей теме оболочки, а контрастный включает более контрастную палитру терминала.',
    themeModeTitle: 'Режим темы терминала',
  },
  'zh-CN': {
    adjustLineHeightDescription: (min, max, defaultValue) =>
      `范围 ${min.toFixed(2)}x-${max.toFixed(2)}x，默认 ${defaultValue.toFixed(2)}x。`,
    adjustLineHeightTitle: '调整行高',
    adjustScrollbackDescription: (min, max, defaultValue) => `范围 ${min}-${max} 行，默认 ${defaultValue}。`,
    adjustScrollbackTitle: '调整 scrollback',
    adjustSizeDescription: (min, max, defaultValue) => `范围 ${min}px-${max}px，默认 ${defaultValue}px。`,
    adjustSizeTitle: '调整字号',
    cursorBlinkDisabled: '已关闭',
    cursorBlinkEnabled: '已开启',
    cursorBlinkTitle: '光标闪烁',
    cursorBlinkDescription: '光标闪烁偏好保存在 runtime 中；xterm 对退出或失败的会话仍会关闭闪烁。',
    cursorStyleBar: '竖线',
    cursorStyleBlock: '块',
    cursorStyleDescription: '光标形状通过后端拥有的契约设置，并应用到实时 xterm 会话。',
    cursorStyleTitle: '终端光标样式',
    cursorStyleUnderline: '下划线',
    currentFontDescription: '更改会立即应用到所有 terminal widget，并保存在 runtime state 中。',
    currentFontTitle: '当前终端字号',
    currentLineHeightDescription: '行高控制 xterm 的垂直密度，并立即应用到实时 terminal widget。',
    currentLineHeightTitle: '当前行高',
    currentScrollbackDescription: 'Scrollback 限制 xterm 缓冲区深度，现在也通过 runtime-owned contract。',
    currentScrollbackTitle: '当前 scrollback',
    defaultStateDescription: '这些终端设置现在由共享 runtime contract 支持。',
    decreaseFontSizeAria: '减小终端字号',
    decreaseLineHeightAria: '减小终端行高',
    decreaseScrollbackAria: '减少终端 scrollback',
    enableCursorBlinkAria: '启用终端光标闪烁',
    increaseFontSizeAria: '增大终端字号',
    increaseLineHeightAria: '增大终端行高',
    increaseScrollbackAria: '增加终端 scrollback',
    loading: '加载中...',
    resetAllDefaultsAria: '重置所有终端默认值',
    resetCursorBlinkAria: '重置终端光标闪烁',
    resetCursorStyleAria: '重置终端光标样式',
    resetFontSizeAria: '重置终端字号',
    resetLineHeightAria: '重置终端行高',
    resetScrollbackAria: '重置终端 scrollback',
    resetThemeModeAria: '重置终端主题模式',
    resetTitle: '重置终端默认值',
    resetDescription: '一次性恢复 runtime-owned 的终端基线，包括字体、调色板、scrollback 和光标行为。',
    sectionDescription:
      'Runtime-owned 终端默认值保存在后端状态中，并应用到当前 shell 的所有实时 terminal widget。',
    sectionTitle: '终端运行时默认值',
    terminalCursorStyleAria: '终端光标样式',
    terminalThemeModeAria: '终端主题模式',
    themeModeAdaptive: '自适应',
    themeModeContrast: '高对比',
    themeModeDescription: '自适应跟随当前 shell chrome；高对比会强制使用更高对比度的终端调色板。',
    themeModeTitle: '终端主题模式',
  },
  es: {
    adjustLineHeightDescription: (min, max, defaultValue) =>
      `Rango ${min.toFixed(2)}x-${max.toFixed(2)}x, valor por defecto ${defaultValue.toFixed(2)}x.`,
    adjustLineHeightTitle: 'Ajustar altura de línea',
    adjustScrollbackDescription: (min, max, defaultValue) =>
      `Rango ${min}-${max} líneas, valor por defecto ${defaultValue}.`,
    adjustScrollbackTitle: 'Ajustar scrollback',
    adjustSizeDescription: (min, max, defaultValue) =>
      `Rango ${min}px-${max}px, valor por defecto ${defaultValue}px.`,
    adjustSizeTitle: 'Ajustar tamaño',
    cursorBlinkDisabled: 'Desactivado',
    cursorBlinkEnabled: 'Activado',
    cursorBlinkTitle: 'Cursor parpadeante',
    cursorBlinkDescription:
      'La preferencia de parpadeo se guarda en el runtime, pero xterm la desactiva para sesiones finalizadas o fallidas.',
    cursorStyleBar: 'Barra',
    cursorStyleBlock: 'Bloque',
    cursorStyleDescription:
      'La forma del cursor se define mediante el contrato controlado por backend y se aplica a sesiones xterm vivas.',
    cursorStyleTitle: 'Estilo del cursor de terminal',
    cursorStyleUnderline: 'Subrayado',
    currentFontDescription:
      'Los cambios se aplican inmediatamente a todos los terminal widgets y se guardan en runtime state.',
    currentFontTitle: 'Tamaño de fuente actual del terminal',
    currentLineHeightDescription:
      'La altura de línea controla la densidad vertical de xterm y se aplica inmediatamente a terminal widgets vivos.',
    currentLineHeightTitle: 'Altura de línea actual',
    currentScrollbackDescription:
      'Scrollback limita la profundidad del buffer de xterm y también pasa por el runtime-owned contract.',
    currentScrollbackTitle: 'Scrollback actual',
    defaultStateDescription:
      'Estos ajustes de terminal ahora están respaldados por el contrato compartido del runtime.',
    decreaseFontSizeAria: 'Disminuir tamaño de fuente del terminal',
    decreaseLineHeightAria: 'Disminuir altura de línea del terminal',
    decreaseScrollbackAria: 'Disminuir scrollback del terminal',
    enableCursorBlinkAria: 'Activar parpadeo del cursor del terminal',
    increaseFontSizeAria: 'Aumentar tamaño de fuente del terminal',
    increaseLineHeightAria: 'Aumentar altura de línea del terminal',
    increaseScrollbackAria: 'Aumentar scrollback del terminal',
    loading: 'Cargando...',
    resetAllDefaultsAria: 'Restablecer todos los valores del terminal',
    resetCursorBlinkAria: 'Restablecer parpadeo del cursor del terminal',
    resetCursorStyleAria: 'Restablecer estilo del cursor del terminal',
    resetFontSizeAria: 'Restablecer tamaño de fuente del terminal',
    resetLineHeightAria: 'Restablecer altura de línea del terminal',
    resetScrollbackAria: 'Restablecer scrollback del terminal',
    resetThemeModeAria: 'Restablecer modo de tema del terminal',
    resetTitle: 'Restablecer valores del terminal',
    resetDescription:
      'Restauración de una sola acción para la base runtime-owned del terminal: tipografía, paleta, scrollback y cursor.',
    sectionDescription:
      'Valores por defecto del terminal controlados por runtime. Se guardan en backend state y se aplican a todos los terminal widgets vivos en el shell actual.',
    sectionTitle: 'Valores del runtime del terminal',
    terminalCursorStyleAria: 'Estilo del cursor de terminal',
    terminalThemeModeAria: 'Modo de tema del terminal',
    themeModeAdaptive: 'Adaptativo',
    themeModeContrast: 'Contraste',
    themeModeDescription:
      'Adaptativo sigue el chrome del shell actual; contraste fuerza una paleta de terminal de mayor contraste.',
    themeModeTitle: 'Modo de tema del terminal',
  },
}
