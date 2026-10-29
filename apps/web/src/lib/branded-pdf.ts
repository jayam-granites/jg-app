import jsPDF from 'jspdf'
import dayjs from '@/lib/dayjs'
import { jayamGranitesLogoBase64 } from '@/features/measurements/lib/logo'

export const COMPANY = {
  name: 'JAYAM GRANITES',
  address: 'Avinashi Road, Lingam Palayam Bus Stop, Palangarai (Vill), Tiruppur (Dt).',
  email: 'jayamgranitestn39@gmail.com',
  phones: '7530044200, 7530044722',
  gstin: '33GSYPD6667L1ZS',
  bankName: 'HDFC BANK',
  accountName: 'JAYAM GRANITES',
  accountNumber: '50200097002262',
  ifsc: 'HDFC0002225',
  branch: 'AVINASHI',
}

export const PAGE_WIDTH = 210
export const PAGE_HEIGHT = 297
export const MARGIN = 10
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

export const INK = [15, 23, 42] as [number, number, number]
export const MUTED = [100, 116, 139] as [number, number, number]
export const LINE = [210, 214, 220] as [number, number, number]
export const SOFT = [241, 245, 249] as [number, number, number]
export const STRIPE = [249, 250, 251] as [number, number, number]

export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatPdfDate(value?: string | Date | null) {
  if (!value) return dayjs().format('DD MMM YYYY')
  return dayjs(value).format('DD MMM YYYY')
}

export type InfoRow = {
  label: string
  value?: string | number | null
  wrap?: boolean
}

function drawInfoBox(
  doc: jsPDF,
  title: string,
  rows: InfoRow[],
  x: number,
  y: number,
  width: number,
  height: number,
  labelWidth: number,
) {
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.setFillColor(...SOFT)
  doc.rect(x, y, width, 7, 'F')
  doc.rect(x, y, width, height, 'S')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...INK)
  doc.text(title, x + 3, y + 4.7)

  let rowY = y + 12
  const valueX = x + labelWidth
  const valueWidth = width - labelWidth - 3

  for (const row of rows) {
    const value = row.value === undefined || row.value === null || row.value === '' ? '-' : String(row.value)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.4)
    doc.setTextColor(...INK)
    doc.text(row.label, x + 3, rowY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)

    if (row.wrap) {
      const lines = doc.splitTextToSize(value, valueWidth)
      doc.text(lines, valueX, rowY)
      rowY += Math.max(5, (Array.isArray(lines) ? lines.length : 1) * 3.6 + 1.4)
    } else {
      doc.text(value, valueX, rowY)
      rowY += 5
    }
  }
}

export function drawInfoColumns(
  doc: jsPDF,
  left: { title: string; rows: InfoRow[] },
  right: { title: string; rows: InfoRow[] },
  startY: number,
  height = 37,
  labelWidths: { left?: number; right?: number } = {},
) {
  const leftWidth = 101
  const rightX = MARGIN + leftWidth
  const rightWidth = CONTENT_WIDTH - leftWidth

  drawInfoBox(doc, left.title, left.rows, MARGIN, startY, leftWidth, height, labelWidths.left ?? 24)
  drawInfoBox(doc, right.title, right.rows, rightX, startY, rightWidth, height, labelWidths.right ?? 24)
  doc.setTextColor(0, 0, 0)
}

export function drawCompanyHeader(
  doc: jsPDF,
  options: { title?: string; showGstin?: boolean } = {},
) {
  const showGstin = options.showGstin !== false
  try {
    doc.addImage(jayamGranitesLogoBase64, 'PNG', MARGIN, 8, 24, 19)
  } catch {
    // ignore logo failures
  }

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(COMPANY.name, 40, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.4)
  doc.text(COMPANY.address, 40, 20)
  doc.text(`Email: ${COMPANY.email}   |   Phones: ${COMPANY.phones}`, 40, 24.5)
  if (showGstin) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.text(`GSTIN: ${COMPANY.gstin}`, 40, 29)
  }

  const lineY = showGstin ? 34 : 30
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, lineY, PAGE_WIDTH - MARGIN, lineY)

  if (options.title) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.text(options.title, PAGE_WIDTH / 2, lineY + 7, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    return lineY + 11
  }

  doc.setTextColor(0, 0, 0)
  return lineY + 6
}

export function finalizePdf(
  doc: jsPDF,
  options: { footerLeft?: string; showContinuationHeader?: boolean },
) {
  const pages = doc.getNumberOfPages()

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)

    if (page > 1 && options.showContinuationHeader !== false) {
      doc.setDrawColor(...INK)
      doc.setLineWidth(0.5)
      doc.line(MARGIN, 15, PAGE_WIDTH - MARGIN, 15)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...INK)
      doc.text(COMPANY.name, MARGIN, 11)
    }

    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, PAGE_HEIGHT - 9, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 9)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...MUTED)
    if (options.footerLeft) doc.text(options.footerLeft, MARGIN, PAGE_HEIGHT - 5)
    doc.text(`Page ${page} of ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 5, { align: 'right' })
  }

  doc.setTextColor(0, 0, 0)
}
