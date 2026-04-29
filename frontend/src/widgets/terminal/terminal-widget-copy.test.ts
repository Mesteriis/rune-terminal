import { describe, expect, it } from 'vitest'

import { terminalWidgetCopy } from '@/widgets/terminal/terminal-widget-copy'

describe('terminal widget copy', () => {
  it('ships dedicated copy for every supported terminal locale', () => {
    expect(terminalWidgetCopy.es.newSession).toBe('Nueva sesión')
    expect(terminalWidgetCopy.es.explainAndFixPromptIntro).toBe(
      'Revisa y ayuda a explicar y corregir el último error en este terminal.',
    )
    expect(terminalWidgetCopy.es.toolbar.toggleSearchAria).toBe('Alternar búsqueda en terminal')
    expect(terminalWidgetCopy.es.toolbar.typeQuery).toBe('Escribe una consulta')

    expect(terminalWidgetCopy['zh-CN'].newSession).toBe('新建会话')
    expect(terminalWidgetCopy['zh-CN'].explainLatestCommandPromptIntro).toBe(
      '解释最新终端命令的结果，并建议下一个实际步骤。',
    )
    expect(terminalWidgetCopy['zh-CN'].toolbar.toggleSearchAria).toBe('切换终端搜索')
    expect(terminalWidgetCopy['zh-CN'].toolbar.typeQuery).toBe('输入查询')
  })
})
