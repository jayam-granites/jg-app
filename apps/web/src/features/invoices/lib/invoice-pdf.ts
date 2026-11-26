import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { generateUPIQR } from '@sk-py/upi-qr'
import { downloadPdf } from '@/lib/pdf'
import {
  COMPANY,
  CONTENT_WIDTH,
  INK,
  LINE,
  MARGIN,
  MUTED,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  SOFT,
  STRIPE,
  drawCompanyHeader,
  drawInfoColumns,
  finalizePdf,
  formatPdfDate,
  money,
  round2,
} from '@/lib/branded-pdf'

function numberToWords(value: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function twoDigits(n: number): string {
    if (n < 20) return ones[n]
    const t = Math.floor(n / 10)
    const o = n % 10
    return `${tens[t]}${o ? `-${ones[o]}` : ''}`
  }

  function threeDigits(n: number): string {
    const h = Math.floor(n / 100)
    const rest = n % 100
    return [h ? `${ones[h]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ')
  }

  const rupees = Math.floor(Math.abs(value))
  const paise = Math.round((Math.abs(value) - rupees) * 100)

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only'

  const parts: string[] = []
  let remaining = rupees
  const crore = Math.floor(remaining / 10000000)
  remaining %= 10000000
  const lakh = Math.floor(remaining / 100000)
  remaining %= 100000
  const thousand = Math.floor(remaining / 1000)
  remaining %= 1000

  if (crore) parts.push(`${threeDigits(crore)} Crore`)
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`)
  if (remaining) parts.push(threeDigits(remaining))

  let words = parts.join(' ').replace(/\s+/g, ' ').trim()
  if (rupees > 0) words += ' Rupees'
  if (paise > 0) words += `${words ? ' and ' : ''}${twoDigits(paise)} Paise`
  return `${words} Only`
}

function drawInfo(doc: jsPDF, inv: any, mode: 'invoice' | 'adjusted' | 'taxInvoice', startY: number) {
  const customer = inv.customer ?? {}
  const transport = inv.invoiceTransports?.[0]
  const vehicleNumber = transport?.vehicleNumber || transport?.transportProvider?.vehicleNumber || inv.vehicleNumber || ''
  const address = [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')

  const invoiceRows: { label: string; value?: string | number | null; wrap?: boolean }[] = [
    { label: 'Invoice No:', value: inv.invoiceNumber },
    { label: 'Invoice Date:', value: formatPdfDate(inv.invoiceDate) },
  ]

  if (mode !== 'invoice' || transport || vehicleNumber) {
    invoiceRows.push(
      { label: 'Transport Mode:', value: transport || vehicleNumber ? 'By Road' : '-' },
      { label: 'Vehicle No:', value: vehicleNumber || '-' },
    )
  }

  if (mode !== 'invoice') {
    invoiceRows.push({
      label: 'Place of Supply:',
      value: mode === 'taxInvoice' ? customer.state || '—' : customer.state || customer.city || '-',
    })
  }

  drawInfoColumns(
    doc,
    {
      title: 'Billed To',
      rows: [
        { label: 'Name:', value: customer.name },
        { label: 'Address:', value: address, wrap: true },
        ...(mode !== 'invoice'
          ? [{ label: 'Party GSTIN:', value: inv.gstNumber || customer.gstNumber || '—' }]
          : []),
        { label: 'Phone:', value: customer.mobile || customer.phone || inv.customerMobile || '-' },
      ],
    },
    { title: 'Invoice Details', rows: invoiceRows },
    startY,
    38,
    { left: 24, right: 24 },
  )
}

async function drawBankAndTerms(
  doc: jsPDF,
  startY: number,
  showBank: boolean,
  payment?: { amount: number; invoiceNumber: string },
) {
  let y = startY
  if (y > 235) {
    doc.addPage()
    y = 24
  }

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)

  const termsText =
    'Goods once sold will not be taken back. Subject to Tiruppur jurisdiction. Payment as per agreed terms.'

  if (showBank) {
    const qr =
      payment && Number.isFinite(payment.amount) && payment.amount > 0
        ? (await generateUPIQR({
            payeeVPA: COMPANY.upiVpa,
            payeeName: COMPANY.upiName,
            amount: payment.amount.toFixed(2),
            transactionNote: `Invoice ${payment.invoiceNumber}`,
            transactionRef: payment.invoiceNumber,
            currency: 'INR',
          })).qr
        : undefined

    doc.rect(MARGIN, y, 100, 34)
    doc.rect(MARGIN + 103, y, CONTENT_WIDTH - 103, 34)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    doc.text(`Bank Details - ${COMPANY.bankName}`, MARGIN + 3, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(30, 41, 59)
    doc.text(`Account Name: ${COMPANY.accountName}`, MARGIN + 3, y + 11)
    doc.text(`Account Number: ${COMPANY.accountNumber}`, MARGIN + 3, y + 16)
    doc.text(`IFSC: ${COMPANY.ifsc}`, MARGIN + 3, y + 21)
    doc.text(`Branch: ${COMPANY.branch}`, MARGIN + 3, y + 26)
    doc.text(`Ph: ${COMPANY.phones}`, MARGIN + 3, y + 31)

    if (qr) {
      const qrX = MARGIN + 73
      doc.addImage(qr, 'PNG', qrX, y + 6, 23, 23)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.8)
      doc.setTextColor(...INK)
      doc.text('Scan to Pay', qrX + 11.5, y + 32, { align: 'center' })
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    doc.text('Terms and Conditions', MARGIN + 106, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.1)
    doc.setTextColor(30, 41, 59)
    const terms = doc.splitTextToSize(termsText, CONTENT_WIDTH - 109)
    doc.text(terms, MARGIN + 106, y + 11)
  } else {
    doc.rect(MARGIN, y, CONTENT_WIDTH, 22)
    doc.setFillColor(...SOFT)
    doc.rect(MARGIN, y, CONTENT_WIDTH, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...INK)
    doc.text('Terms and Conditions', MARGIN + 3, y + 4.4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.2)
    doc.setTextColor(30, 41, 59)
    const terms = doc.splitTextToSize(termsText, CONTENT_WIDTH - 6)
    doc.text(terms, MARGIN + 3, y + 11.5)
    y += 22
  }

  if (showBank) y += 34
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...INK)
  doc.text('For Jayam Granites', PAGE_WIDTH - MARGIN, y + 9, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.setTextColor(...MUTED)
  doc.text('(Proprietor)', PAGE_WIDTH - MARGIN, y + 14, { align: 'right' })
  doc.setTextColor(0, 0, 0)
}

function drawSummary(doc: jsPDF, startY: number, rows: [string, string][]) {
  autoTable(doc, {
    startY,
    margin: { top: 20, left: PAGE_WIDTH - MARGIN - 88, right: MARGIN, bottom: 16 },
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 7.8,
      cellPadding: 1.7,
      lineColor: LINE,
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 52, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 36, halign: 'right' },
    },
    didParseCell: (data) => {
      const isGrand = data.row.index === rows.length - 1
      if (isGrand) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = INK
        data.cell.styles.textColor = [255, 255, 255]
      }
    },
  })
  return (doc as any).lastAutoTable.finalY
}

function drawWords(doc: jsPDF, startY: number, text: string) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...INK)
  doc.text('Total Invoice amount in words:', MARGIN, startY)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH)
  doc.text(lines, MARGIN, startY + 4.5)
  return startY + 5 + (Array.isArray(lines) ? lines.length : 1) * 3.6
}

function drawInvoiceWords(doc: jsPDF, startY: number, text: string) {
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 8)
  const height = 14 + (Array.isArray(lines) ? lines.length - 1 : 0) * 3.6

  doc.setFillColor(...SOFT)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.rect(MARGIN, startY, CONTENT_WIDTH, height, 'FD')
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.8)
  doc.line(MARGIN, startY, MARGIN, startY + height)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...MUTED)
  doc.text('TOTAL INVOICE AMOUNT IN WORDS', MARGIN + 4, startY + 5)
  doc.setFontSize(8)
  doc.setTextColor(...INK)
  doc.text(lines, MARGIN + 4, startY + 11)
  doc.setTextColor(0, 0, 0)
  return startY + height
}

async function drawInvoicePaymentAndSummary(
  doc: jsPDF,
  startY: number,
  rows: [string, string][],
  payment: { amount: number; invoiceNumber: string },
) {
  const qr =
    Number.isFinite(payment.amount) && payment.amount > 0
      ? (await generateUPIQR({
          payeeVPA: COMPANY.upiVpa,
          payeeName: COMPANY.upiName,
          amount: payment.amount.toFixed(2),
          transactionNote: `Invoice ${payment.invoiceNumber}`,
          transactionRef: payment.invoiceNumber,
          currency: 'INR',
        })).qr
      : undefined

  let y = startY
  const headerHeight = 8
  const paymentWidth = 85
  const summaryX = MARGIN + paymentWidth
  const summaryWidth = CONTENT_WIDTH - paymentWidth
  const estimatedHeight = Math.max(40, headerHeight + rows.length * 8.5)
  if (y + estimatedHeight > PAGE_HEIGHT - 15) {
    doc.addPage()
    y = 24
  }

  autoTable(doc, {
    startY: y + headerHeight,
    margin: { left: summaryX, right: MARGIN, bottom: 16 },
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 7.8,
      cellPadding: 1.7,
      lineColor: LINE,
      lineWidth: 0.2,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 47, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: summaryWidth - 47, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = INK
        data.cell.styles.textColor = [255, 255, 255]
      }
    },
  })

  const tableEndY = (doc as any).lastAutoTable.finalY
  const panelHeight = Math.max(40, tableEndY - y)

  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.3)
  doc.setFillColor(...SOFT)
  doc.rect(MARGIN, y, paymentWidth, headerHeight, 'F')
  doc.rect(summaryX, y, summaryWidth, headerHeight, 'F')
  doc.rect(MARGIN, y, CONTENT_WIDTH, panelHeight)
  doc.line(summaryX, y, summaryX, y + panelHeight)
  doc.line(MARGIN, y + headerHeight, PAGE_WIDTH - MARGIN, y + headerHeight)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor(...INK)
  doc.text('PAYMENT DETAILS (UPI & BANK)', MARGIN + 3, y + 5.3)
  doc.text('TAX & AMOUNT SUMMARY', summaryX + summaryWidth / 2, y + 5.3, { align: 'center' })

  const detailsX = qr ? MARGIN + 28 : MARGIN + 3
  if (qr) {
    doc.addImage(qr, 'PNG', MARGIN + 3, y + 15, 22, 22)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.1)
    doc.text('Scan to Pay', detailsX, y + 19.5)
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`A/c No: ${COMPANY.accountNumber}`, detailsX, y + 25)
  doc.text(`IFSC: ${COMPANY.ifsc}`, detailsX, y + 30)
  doc.text(`Branch: ${COMPANY.branch}`, detailsX, y + 35)
  doc.setTextColor(0, 0, 0)

  return y + panelHeight
}

function itemHsn(item: any): string {
  return item?.productVariant?.product?.hsnCode || item?.hsnCode || '-'
}

function genericDescription(name: string): string {
  const value = (name || '').toLowerCase()
  if (value.includes('leather')) return 'Leather Granites'
  if (value.includes('tile')) return 'Tiles'
  if (value.includes('kotta') || value.includes('stone')) return 'Kotta Stone'
  return 'Polished Granites'
}

function genericDescriptions(items: any[]): string[] {
  const base = items.map((item) => genericDescription(String(item.description ?? '')))
  const counts = base.reduce<Record<string, number>>((acc, label) => {
    acc[label] = (acc[label] ?? 0) + 1
    return acc
  }, {})
  const running: Record<string, number> = {}
  return base.map((label) => {
    if ((counts[label] ?? 0) <= 1) return label
    running[label] = (running[label] ?? 0) + 1
    return `${label} ${running[label]}`
  })
}

function adjustedTransportRate(rate: number): number {
  const original = Number(rate) || 0
  const halved = Math.round((original * 0.5) / 5) * 5
  return Math.min(100, Math.max(65, halved || 65))
}

function baseDoc() {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
}

const tableStyles = {
  theme: 'grid' as const,
  styles: {
    fontSize: 7.4,
    cellPadding: 1.8,
    lineColor: LINE,
    lineWidth: 0.2,
    textColor: [30, 41, 59] as [number, number, number],
  },
  headStyles: {
    fillColor: INK,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    halign: 'center' as const,
    cellPadding: 2.2,
  },
  footStyles: {
    fillColor: SOFT,
    textColor: INK,
    fontStyle: 'bold' as const,
  },
  alternateRowStyles: { fillColor: STRIPE },
}

export async function buildInvoicePdf(inv: any): Promise<jsPDF> {
  const doc = baseDoc()
  const infoY = drawCompanyHeader(doc, {
    showGstin: true,
    rightTitle: 'TAX INVOICE',
    rightSubtitle: 'Original for Recipient',
  })
  drawInfo(doc, inv, 'taxInvoice', infoY)

  const items = inv.items ?? []
  const computedSubtotal = round2(
    items.reduce((sum: number, item: any) => sum + Number(item.qty) * Number(item.rate), 0),
  )
  const subtotal = Number(inv.subtotal ?? computedSubtotal)
  const loadingAmount = Number(inv.loadingAmount ?? 0)
  const transportAmount = Number(inv.invoiceTransports?.[0]?.amount ?? 0)
  const roundOffAmount = Number(inv.roundOffAmount ?? 0)
  const grandTotal = Number(inv.grandTotal ?? 0)

  autoTable(doc, {
    startY: infoY + 43,
    head: [['S.No', 'Description of Goods', 'HSN Code', 'Unit', 'Secondary Unit', 'Rate (Rs.)', 'Amount (Rs.)']],
    body: items.map((item: any, index: number) => [
      index + 1,
      item.description ?? '-',
      itemHsn(item) === '-' ? '—' : itemHsn(item),
      `${Number(item.qty ?? 0).toFixed(2)}${item.unit?.code ? ` ${item.unit.code}` : ''}`,
      item.slabCount && (item.secondaryUnitId || !item.unitId)
        ? `${item.slabCount}${item.secondaryUnit?.code ? ` ${item.secondaryUnit.code}` : ''}`
        : '—',
      Number(item.rate ?? 0).toFixed(2),
      Number(item.amount ?? 0).toFixed(2),
    ]),
    ...tableStyles,
    margin: { top: 20, left: MARGIN, right: MARGIN, bottom: 16 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 58 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
    },
  })

  let y = (doc as any).lastAutoTable.finalY + 5
  const discountAmount = Number(inv.discountAmount ?? 0)
  const summaryRows: [string, string][] = [['Total Taxable', money(subtotal)]]
  if (loadingAmount > 0) summaryRows.push(['Loading / Unloading', money(loadingAmount)])
  if (transportAmount > 0) summaryRows.push(['Transport Charges', money(transportAmount)])
  if (discountAmount > 0) summaryRows.push(['Discount', `- ${money(discountAmount)}`])
  if (inv.isGst) {
    const suffix = inv.isHalfGst ? ' (Half GST)' : ''
    summaryRows.push([`CGST @ 9%${suffix}`, money(Number(inv.cgstAmount ?? 0))])
    summaryRows.push([`SGST @ 9%${suffix}`, money(Number(inv.sgstAmount ?? 0))])
  }
  if (Math.abs(roundOffAmount) > 0.001) summaryRows.push(['Round Off', money(roundOffAmount)])
  summaryRows.push(['GRAND TOTAL', money(grandTotal)])

  y = drawInvoiceWords(doc, y + 5, numberToWords(grandTotal)) + 5
  await drawInvoicePaymentAndSummary(doc, y, summaryRows, {
    amount: grandTotal,
    invoiceNumber: String(inv.invoiceNumber ?? ''),
  })
  finalizePdf(doc, { footerLeft: 'This is a computer generated document.' })
  doc.setProperties({ title: invoicePdfFilename(inv).replace(/\.pdf$/i, '') })
  return doc
}

async function buildAdjustedBill(inv: any, mode: 'transport' | 'original'): Promise<jsPDF> {
  const doc = baseDoc()
  const infoY = drawCompanyHeader(doc, { showGstin: true })
  drawInfo(doc, inv, 'adjusted', infoY)

  const items = inv.items ?? []
  const descriptions = genericDescriptions(items)
  const rates = items.map((item: any) =>
    mode === 'transport' ? adjustedTransportRate(Number(item.rate ?? 0)) : Number(item.rate ?? 0),
  )
  const subtotal = round2(
    items.reduce((sum: number, item: any, index: number) => sum + Number(item.qty ?? 0) * rates[index], 0),
  )

  const gstEnabled = mode === 'transport' ? true : Boolean(inv.isGst)
  const halfGst = mode === 'transport' ? false : Boolean(inv.isHalfGst)
  const taxableAmount = gstEnabled ? round2(halfGst ? subtotal / 2 : subtotal) : 0
  const cgstAmount = round2(taxableAmount * 0.09)
  const sgstAmount = round2(taxableAmount * 0.09)
  const totalTaxAmount = round2(cgstAmount + sgstAmount)
  const grandTotal = round2(subtotal + totalTaxAmount)
  const totalSlabs = items.reduce((sum: number, item: any) => sum + Number(item.slabCount ?? 0), 0)
  const totalSqft = items.reduce((sum: number, item: any) => sum + Number(item.qty ?? 0), 0)

  autoTable(doc, {
    startY: infoY + 43,
    head: [['S.No', 'Description of Goods', 'HSN Code', 'Unit', 'Secondary Unit', 'Rate (Rs.)', 'Amount (Rs.)']],
    body: items.map((item: any, index: number) => [
      index + 1,
      descriptions[index],
      itemHsn(item),
      `${Number(item.qty ?? 0).toFixed(2)}${item.unit?.code ? ` ${item.unit.code}` : ''}`,
      item.slabCount && (item.secondaryUnitId || !item.unitId)
        ? `${item.slabCount}${item.secondaryUnit?.code ? ` ${item.secondaryUnit.code}` : ''}`
        : '-',
      rates[index].toFixed(2),
      round2(Number(item.qty ?? 0) * rates[index]).toFixed(2),
    ]),
    foot: [[
      '',
      `Total Units: ${totalSqft.toFixed(2)}   |   Total Secondary: ${totalSlabs}`,
      '',
      '',
      '',
      '',
      Number(subtotal).toFixed(2),
    ]],
    showFoot: 'lastPage',
    ...tableStyles,
    margin: { top: 20, left: MARGIN, right: MARGIN, bottom: 16 },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 58 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 30, halign: 'right' },
    },
  })

  let y = (doc as any).lastAutoTable.finalY + 5
  const summaryRows: [string, string][] = [['Products Total', money(subtotal)]]
  if (gstEnabled) {
    const suffix = halfGst ? ' (Half GST)' : ''
    summaryRows.push([`CGST @ 9%${suffix}`, money(cgstAmount)])
    summaryRows.push([`SGST @ 9%${suffix}`, money(sgstAmount)])
  }
  summaryRows.push(['GRAND TOTAL', money(grandTotal)])

  y = drawSummary(doc, y, summaryRows) + 7
  y = drawWords(doc, y, numberToWords(grandTotal))
  await drawBankAndTerms(doc, y + 3, true, {
    amount: grandTotal,
    invoiceNumber: String(inv.invoiceNumber ?? ''),
  })
  finalizePdf(doc, { footerLeft: 'This is a computer generated document.' })
  return doc
}

export function buildTransportBillPdf(inv: any): Promise<jsPDF> {
  return buildAdjustedBill(inv, 'transport')
}

export function buildOriginalBillPdf(inv: any): Promise<jsPDF> {
  return buildAdjustedBill(inv, 'original')
}

export function invoicePdfFilename(inv: any): string {
  const invoiceNumber = String(inv.invoiceNumber ?? inv.id ?? 'invoice').replace(/[<>:"/\\|?*]/g, '-')
  return `Tax Invoice - ${COMPANY.upiName} (${invoiceNumber}).pdf`
}

export async function downloadInvoicePdf(inv: any): Promise<void> {
  downloadPdf(await buildInvoicePdf(inv), invoicePdfFilename(inv))
}
