import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type PdfTable = {
  title?: string
  headers: string[]
  rows: (string | number | null | undefined)[][]
  foot?: (string | number)[][] | (string | number | null)[][]
}

export type PdfMeta = {
  label: string
  value: string
}

export type PdfDocumentOptions = {
  title: string
  subtitle?: string
  meta?: PdfMeta[]
  tables: PdfTable[]
}

export function createPdfDoc(options: PdfDocumentOptions) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  let y = 20

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(options.title, pageWidth / 2, y, { align: 'center' })
  y += 10

  if (options.subtitle) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(options.subtitle, pageWidth / 2, y, { align: 'center' })
    y += 8
  }

  if (options.meta?.length) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80)
    for (const item of options.meta) {
      doc.text(`${item.label}: ${item.value}`, 14, y)
      y += 5
    }
    y += 2
  }

  doc.setTextColor(0)

  for (const table of options.tables) {
    if (table.title) {
      y += 4
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(table.title, 14, y)
      y += 6
    }

    const hasFoot = table.foot && table.foot.length > 0

    autoTable(doc, {
      startY: y,
      head: [table.headers],
      body: table.rows as any[],
      foot: hasFoot ? (table.foot as any) : undefined,
      margin: { left: 14, right: 14 },
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      footStyles: { fontSize: 9, fontStyle: 'bold', fillColor: [243, 244, 246] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  return doc
}

export function generatePdf(options: PdfDocumentOptions & { filename: string }) {
  const doc = createPdfDoc(options)
  window.open(doc.output('bloburl'), '_blank')
}

export function previewPdf(doc: jsPDF) {
  const bloburl = doc.output('bloburl')
  window.open(bloburl, '_blank')
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

export type SharePdfResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Shares the PDF through the native share sheet. Falls back to downloading the
 * file when the platform does not support sharing files.
 */
export async function sharePdf(doc: jsPDF, filename: string): Promise<SharePdfResult> {
  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  const blob = doc.output('blob')
  const file = new File([blob], name, { type: 'application/pdf' })

  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>
    canShare?: (data: ShareData) => boolean
  }

  const canShareFiles =
    typeof nav.share === 'function' && (typeof nav.canShare !== 'function' || nav.canShare({ files: [file] }))

  if (canShareFiles) {
    try {
      await nav.share({ files: [file], title: name })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }

  downloadPdf(doc, name)
  return 'downloaded'
}
