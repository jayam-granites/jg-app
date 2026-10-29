import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { exportToExcel, safeFileName } from '@/lib/excel'
import { downloadPdf, sharePdf } from '@/lib/pdf'
import { roundTotalArea, formatAreaValue } from '@/lib/area'
import dayjs from '@/lib/dayjs'
import {
  CONTENT_WIDTH,
  INK,
  LINE,
  MARGIN,
  MUTED,
  PAGE_WIDTH,
  SOFT,
  STRIPE,
  drawCompanyHeader,
  drawInfoColumns,
  finalizePdf,
  formatPdfDate,
} from '@/lib/branded-pdf'

export type MeasurementSlabExport = {
  slabNumber: number
  width: number
  height: number
  area: number
  productName: string
}

export type MeasurementExport = {
  id: number
  measurementNumber: string
  name: string
  phone: string
  address: string
  notes: string
  createdAt: string
  slabs: MeasurementSlabExport[]
}

export function toMeasurementExport(measurement: any): MeasurementExport {
  const slabs: MeasurementSlabExport[] = (measurement?.slabs ?? []).map((slab: any) => ({
    slabNumber: Number(slab.slabNumber),
    width: Number(slab.width),
    height: Number(slab.height),
    area: Number(slab.area),
    productName: slab.product?.name ?? 'Unknown',
  }))

  return {
    id: Number(measurement?.id),
    measurementNumber: measurement?.measurementNumber ?? '',
    name: measurement?.name ?? '',
    phone: measurement?.phone ?? '',
    address: measurement?.address ?? '',
    notes: measurement?.notes ?? '',
    createdAt: measurement?.createdAt ?? '',
    slabs,
  }
}

export function measurementTotalArea(measurement: MeasurementExport) {
  return roundTotalArea(measurement.slabs.reduce((sum, slab) => sum + slab.area, 0))
}

export function measurementFileBaseName(measurement: MeasurementExport) {
  const parts = [measurement.measurementNumber, measurement.name].filter(Boolean)
  return safeFileName(parts.join('-') || `measurement-${measurement.id}`)
}

function groupByProduct(slabs: MeasurementSlabExport[]) {
  const groups = new Map<string, MeasurementSlabExport[]>()
  for (const slab of slabs) {
    const list = groups.get(slab.productName) ?? []
    list.push(slab)
    groups.set(slab.productName, list)
  }
  return Array.from(groups.entries())
}

function formatArea(val: number) {
  return formatAreaValue(val)
}

export function buildMeasurementPdf(measurement: MeasurementExport): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const infoY = drawCompanyHeader(doc, { title: 'MEASUREMENT SHEET', showGstin: true })

  const grandTotal = measurementTotalArea(measurement)
  drawInfoColumns(
    doc,
    {
      title: 'Customer Details',
      rows: [
        { label: 'Name:', value: measurement.name },
        { label: 'Phone:', value: measurement.phone },
        { label: 'Address:', value: measurement.address, wrap: true },
      ],
    },
    {
      title: 'Measurement Details',
      rows: [
        { label: 'Measurement ID:', value: measurement.measurementNumber },
        { label: 'Date:', value: formatPdfDate(measurement.createdAt) },
      ],
    },
    infoY,
    37,
    { left: 24, right: 30 },
  )

  let y = infoY + 42
  const groups = groupByProduct(measurement.slabs)

  for (const [productName, slabs] of groups) {
    if (y > 225) {
      doc.addPage()
      y = 24
    }

    const subtotal = roundTotalArea(slabs.reduce((sum, slab) => sum + slab.area, 0))

    doc.setFillColor(...SOFT)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 9, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.6)
    doc.setTextColor(...MUTED)
    doc.text('MATERIAL', MARGIN + 3, y + 3.7)

    doc.setFontSize(9)
    doc.setTextColor(...INK)
    doc.text(productName.toUpperCase(), MARGIN + 3, y + 7.6)

    const slabLabel = slabs.length === 1 ? 'slab' : 'slabs'
    doc.setFontSize(8.8)
    doc.text(`${slabs.length} ${slabLabel}`, PAGE_WIDTH - MARGIN - 3, y + 4.3, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.4)
    doc.setTextColor(...MUTED)
    doc.text(`${subtotal} sq.ft`, PAGE_WIDTH - MARGIN - 3, y + 7.8, { align: 'right' })

    const rows = slabs.map((slab, index) => [
      index + 1,
      slab.width || '',
      slab.height || '',
      formatArea(slab.area),
    ])

    autoTable(doc, {
      startY: y + 9,
      head: [['Slab No', 'Width (in)', 'Height (in)', 'Area (sq.ft)']],
      body: rows,
      margin: { top: 20, left: MARGIN, right: MARGIN, bottom: 16 },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 1.2,
        lineColor: LINE,
        lineWidth: 0.2,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: INK,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        cellPadding: 2.2,
      },
      alternateRowStyles: { fillColor: STRIPE },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' },
        1: { cellWidth: 44, halign: 'right' },
        2: { cellWidth: 44, halign: 'right' },
        3: { cellWidth: 72, halign: 'right' },
      },
    })

    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (groups.length === 0) {
    doc.setDrawColor(...LINE)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 16)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(100, 116, 139)
    doc.text('No slabs measured yet.', PAGE_WIDTH / 2, y + 9, { align: 'center' })
    y += 16
  }

  if (groups.length > 1) {
    if (y > 245) {
      doc.addPage()
      y = 24
    }

    const leftWidth = 100
    const rightX = MARGIN + leftWidth + 5
    const rightWidth = CONTENT_WIDTH - leftWidth - 5

    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.3)
    doc.setFillColor(255, 255, 255)
    doc.rect(MARGIN, y, leftWidth, 18, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.4)
    doc.setTextColor(...MUTED)
    doc.text('OVERALL SLABS', MARGIN + 4, y + 5.5)
    doc.setFontSize(15)
    doc.setTextColor(...INK)
    doc.text(String(measurement.slabs.length), MARGIN + 4, y + 13.5)

    doc.setFillColor(...INK)
    doc.rect(rightX, y, rightWidth, 18, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.4)
    doc.setTextColor(203, 213, 225)
    doc.text('OVERALL MEASURED AREA', rightX + 4, y + 5.5)
    doc.setFontSize(15)
    doc.setTextColor(255, 255, 255)
    doc.text(`${grandTotal} sq.ft`, rightX + rightWidth - 4, y + 13.5, { align: 'right' })

    y += 18
  }

  if (measurement.notes?.trim()) {
    if (y > 235) {
      doc.addPage()
      y = 24
    }
    y += 8
    doc.setFillColor(...SOFT)
    doc.setDrawColor(...LINE)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 20, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.6)
    doc.setTextColor(...INK)
    doc.text('NOTES', MARGIN + 3, y + 5.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(30, 41, 59)
    const notes = doc.splitTextToSize(measurement.notes.trim(), CONTENT_WIDTH - 6)
    doc.text(notes, MARGIN + 3, y + 10.5)
    y += 20
  }

  if (y > 255) {
    doc.addPage()
    y = 24
  }

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.line(PAGE_WIDTH - MARGIN - 48, y + 14, PAGE_WIDTH - MARGIN, y + 14)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...INK)
  doc.text('For Jayam Granites', PAGE_WIDTH - MARGIN, y + 19, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.setTextColor(...MUTED)
  doc.text('Authorized Signatory', PAGE_WIDTH - MARGIN, y + 24, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  finalizePdf(doc, { footerLeft: 'Thank you for choosing Jayam Granites!' })
  return doc
}


export async function exportMeasurementToExcel(measurement: MeasurementExport) {
  const fileName = measurementFileBaseName(measurement)

  await exportToExcel<MeasurementSlabExport>(`${fileName}.xlsx`, [
    {
      sheet: 'Summary',
      columnWidths: [24, 48],
      summary: [
        { label: 'Measurement ID', value: measurement.measurementNumber },
        { label: 'Name', value: measurement.name },
        { label: 'Phone', value: measurement.phone },
        { label: 'Address', value: measurement.address },
        { label: 'Notes', value: measurement.notes },
        {
          label: 'Created',
          value: measurement.createdAt ? dayjs(measurement.createdAt).format('DD MMM YYYY') : '',
        },
        { label: 'Total Slabs', value: measurement.slabs.length },
        { label: 'Total Area (sq.ft)', value: measurementTotalArea(measurement) },
      ],
    },
    {
      sheet: 'Slabs',
      columns: [
        { header: 'Slab No', width: 12, getValue: (row) => row.slabNumber },
        { header: 'Product', width: 28, getValue: (row) => row.productName },
        { header: 'Width (in)', width: 14, getValue: (row) => row.width },
        { header: 'Height (in)', width: 14, getValue: (row) => row.height },
        { header: 'Area (sq.ft)', width: 16, getValue: (row) => {
          if (!Number.isFinite(row.area) || row.area <= 0) return '-'
          if (row.area > 200) return Math.round(row.area)
          return Math.round(row.area)
        } },
      ],
      rows: measurement.slabs.map((slab, index) => ({ ...slab, slabNumber: index + 1 })),
    },
  ])
}

export function saveMeasurementPdf(measurement: MeasurementExport) {
  const doc = buildMeasurementPdf(measurement)
  downloadPdf(doc, `${measurementFileBaseName(measurement)}.pdf`)
}

export async function shareMeasurementPdf(measurement: MeasurementExport) {
  const doc = buildMeasurementPdf(measurement)
  return sharePdf(doc, `${measurementFileBaseName(measurement)}.pdf`)
}
