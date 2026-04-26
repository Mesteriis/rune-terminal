import { describe, expect, it } from 'vitest'

import { createPreviewTable } from './preview-table'

describe('createPreviewTable', () => {
  it('creates bounded CSV table data from a text preview', () => {
    expect(createPreviewTable('/repo/data.csv', 'name,count\nalpha,1\nbeta,2')).toEqual({
      columns: ['name', 'count'],
      delimiterLabel: 'CSV',
      rows: [
        ['alpha', '1'],
        ['beta', '2'],
      ],
      truncatedColumns: false,
      truncatedRows: false,
    })
  })

  it('handles quoted CSV cells and escaped quotes', () => {
    expect(createPreviewTable('/repo/data.csv', 'name,note\n"alpha, beta","say ""hi"""')).toMatchObject({
      columns: ['name', 'note'],
      rows: [['alpha, beta', 'say "hi"']],
    })
  })

  it('supports TSV files', () => {
    expect(createPreviewTable('/repo/data.tsv', 'name\tcount\nalpha\t1')).toMatchObject({
      columns: ['name', 'count'],
      delimiterLabel: 'TSV',
      rows: [['alpha', '1']],
    })
  })

  it('returns null for non-table paths or empty content', () => {
    expect(createPreviewTable('/repo/README.md', 'name,count\nalpha,1')).toBeNull()
    expect(createPreviewTable('/repo/data.csv', '')).toBeNull()
  })

  it('caps rendered rows and columns', () => {
    const header = Array.from({ length: 14 }, (_value, index) => `c${index + 1}`).join(',')
    const rows = Array.from({ length: 52 }, (_value, rowIndex) =>
      Array.from({ length: 14 }, (_cell, columnIndex) => `${rowIndex}:${columnIndex}`).join(','),
    )
    const table = createPreviewTable('/repo/data.csv', [header, ...rows].join('\n'))

    expect(table?.columns).toHaveLength(12)
    expect(table?.rows).toHaveLength(50)
    expect(table?.truncatedColumns).toBe(true)
    expect(table?.truncatedRows).toBe(true)
  })
})
