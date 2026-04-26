export type PreviewTable = {
  columns: string[]
  delimiterLabel: 'CSV' | 'TSV'
  rows: string[][]
  truncatedColumns: boolean
  truncatedRows: boolean
}

const maxPreviewTableColumns = 12
const maxPreviewTableRows = 50

function getDelimitedPreviewConfig(path: string) {
  const normalizedPath = path.toLowerCase()

  if (normalizedPath.endsWith('.csv')) {
    return { delimiter: ',', delimiterLabel: 'CSV' as const }
  }

  if (normalizedPath.endsWith('.tsv') || normalizedPath.endsWith('.tab')) {
    return { delimiter: '\t', delimiterLabel: 'TSV' as const }
  }

  return null
}

function parseDelimitedRows(content: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const nextChar = content[index + 1]

    if (quoted) {
      if (char === '"' && nextChar === '"') {
        cell += '"'
        index += 1
        continue
      }

      if (char === '"') {
        quoted = false
        continue
      }

      cell += char
      continue
    }

    if (char === '"') {
      quoted = true
      continue
    }

    if (char === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    if (char === '\r') {
      continue
    }

    cell += char
  }

  row.push(cell)

  if (row.some((value) => value.length > 0) || rows.length === 0) {
    rows.push(row)
  }

  return rows
}

function normalizeColumns(row: string[]) {
  return row.map((value, index) => {
    const label = value.trim()

    return label || `Column ${index + 1}`
  })
}

export function createPreviewTable(path: string, content: string): PreviewTable | null {
  const config = getDelimitedPreviewConfig(path)
  const trimmedContent = content.trim()

  if (!config || !trimmedContent) {
    return null
  }

  const parsedRows = parseDelimitedRows(trimmedContent, config.delimiter)
  const [headerRow, ...bodyRows] = parsedRows

  if (!headerRow || headerRow.length === 0) {
    return null
  }

  const columns = normalizeColumns(headerRow)
  const visibleColumns = columns.slice(0, maxPreviewTableColumns)
  const visibleRows = bodyRows
    .slice(0, maxPreviewTableRows)
    .map((row) => visibleColumns.map((_column, index) => row[index] ?? ''))

  return {
    columns: visibleColumns,
    delimiterLabel: config.delimiterLabel,
    rows: visibleRows,
    truncatedColumns: columns.length > visibleColumns.length,
    truncatedRows: bodyRows.length > visibleRows.length,
  }
}
