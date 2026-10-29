import writeXlsxFile, { type SheetData } from 'write-excel-file/browser'

export type ExcelCellValue = string | number | boolean | Date | null | undefined

export type ExcelColumn<T> = {
  header: string
  width?: number
  getValue: (row: T) => ExcelCellValue
}

export type ExcelBlock<T> = {
  sheet: string
  columns?: ExcelColumn<T>[]
  rows?: T[]
  /** Column widths for sheets without a column table (e.g. summary sheets). */
  columnWidths?: number[]
  /** Free-form rows rendered above the column table (summary blocks). */
  summary?: { label: string; value: ExcelCellValue }[]
}

type ExcelSheet = Parameters<typeof writeXlsxFile>[0]

function headerCell(text: string) {
  return { value: text, fontWeight: 'bold' as const, backgroundColor: '#F1F5F9' }
}

function sanitizeSheetName(name: string) {
  return name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet1'
}

/**
 * Writes rows to a real .xlsx file. Each block becomes a separate sheet and is
 * optionally prefixed with a summary block.
 */
export async function exportToExcel<T>(fileName: string, blocks: ExcelBlock<T>[]) {
  const sheets = blocks.map((block): ExcelSheet[number] => {
    const data: SheetData = []

    for (const entry of block.summary ?? []) {
      data.push([headerCell(entry.label), entry.value ?? null])
    }

    if (block.summary?.length) {
      data.push([])
    }

    if (block.columns?.length) {
      data.push(block.columns.map((column) => headerCell(column.header)))
      for (const row of block.rows ?? []) {
        data.push(block.columns.map((column) => column.getValue(row) ?? null))
      }
    }

    return {
      sheet: sanitizeSheetName(block.sheet),
      data,
      columns: block.columns?.length
        ? block.columns.map((column) => ({ width: column.width ?? 18 }))
        : block.columnWidths?.map((width) => ({ width })),
    }
  })

  const file = await writeXlsxFile(sheets)
  await file.toFile(fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`)
}

export function safeFileName(name: string) {
  return name.replace(/[^\w\-. ]+/g, '_').trim() || 'export'
}
