import * as XLSX from "xlsx"

type Cell = string | number | boolean | null | undefined

interface ExportExcelOptions {
  /** File name WITHOUT extension. ".xlsx" is appended automatically. */
  filename: string
  /** Column header labels (first row of the sheet). */
  headers: Cell[]
  /** Data rows, each an array of cell values aligned to `headers`. */
  rows: Cell[][]
  /** Optional worksheet tab name (max 31 chars, sanitized). */
  sheetName?: string
  /**
   * Optional metadata rows rendered ABOVE the header row (e.g. period, filters).
   * Each entry is a full row of cells.
   */
  meta?: Cell[][]
  /** Optional totals row rendered BELOW the data rows. */
  totals?: Cell[]
}

// Excel worksheet names cannot exceed 31 chars or contain : \ / ? * [ ]
function sanitizeSheetName(name: string): string {
  return (name || "Hoja1").replace(/[:\\/?*[\]]/g, " ").slice(0, 31) || "Hoja1"
}

function sanitizeFileName(name: string): string {
  return (name || "export").replace(/[^\w.-]+/g, "_")
}

/**
 * Builds and downloads a real .xlsx workbook where every value occupies its own
 * cell/column. Use this instead of hand-built CSV strings so Excel opens the
 * file with columns already separated, regardless of the user's locale
 * separator settings.
 */
export function exportToExcel({
  filename,
  headers,
  rows,
  sheetName = "Hoja1",
  meta,
  totals,
}: ExportExcelOptions): void {
  const aoa: Cell[][] = []

  if (meta && meta.length > 0) {
    aoa.push(...meta)
    aoa.push([]) // blank spacer row between metadata and the table
  }

  aoa.push(headers)
  aoa.push(...rows)

  if (totals && totals.length > 0) {
    aoa.push(totals)
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Auto-size columns based on the longest value in each column.
  const allTableRows = [headers, ...rows, ...(totals ? [totals] : [])]
  const colCount = allTableRows.reduce((max, r) => Math.max(max, r.length), 0)
  ws["!cols"] = Array.from({ length: colCount }, (_, c) => {
    let width = 10
    for (const r of allTableRows) {
      const val = r[c]
      const len = val === null || val === undefined ? 0 : String(val).length
      if (len + 2 > width) width = len + 2
    }
    return { wch: Math.min(width, 50) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheetName))
  XLSX.writeFile(wb, `${sanitizeFileName(filename)}.xlsx`)
}
