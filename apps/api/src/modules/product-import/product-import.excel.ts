import ExcelJS from 'exceljs'
import type { Row, Workbook, Worksheet } from 'exceljs'
import type {
  ProductImportIssue,
  ProductImportPreview,
  ProductImportPreviewRow,
  ProductImportTemplateAttribute,
  ProductImportTemplateData,
} from '@jg-app/shared'
import { prisma } from '#/lib/prisma'

type Severity = ProductImportIssue['severity']

type IssueAdder = (column: string, reason: string, severity?: Severity) => void

type CoreHeader =
  | 'Group_Code'
  | 'Product_Name'
  | 'Has_Variants'
  | 'Category'
  | 'HSN_Code'
  | 'Lot_Number'
  | 'Description'
  | 'Width_Reduction'
  | 'Unit'
  | 'SKU'
  | 'Tax_GST'
  | 'Cost_Price'
  | 'Selling_Price'
  | 'MRP'
  | 'Opening_Stock'

type AttributeDefinition = {
  code: string
  name: string
  values: Map<string, string>
}

type TemplateLookups = {
  categories: Map<string, string>
  units: Map<string, string>
  taxRates: number[]
  attributes: Map<string, AttributeDefinition>
  categoryIds: Map<string, number>
}

type ComparisonFields = {
  productName: string
  category: string
  hsnCode: string | null
  lotNumber: string | null
  description: string | null
  widthReduction: number | null
  unit: string
  taxGst: number | null
}

type AttributeColumn = {
  column: number
  code: string
  canonicalColumn: string
  raw: string
}

type ParsedRecord = {
  preview: ProductImportPreviewRow
  comparison: ComparisonFields
  groupKey: string
  hasVariantsValid: boolean
  attributeCombinationKey: string
  attributePresentCodes: Set<string>
}

const CORE_HEADERS: readonly CoreHeader[] = [
  'Group_Code',
  'Product_Name',
  'Has_Variants',
  'Category',
  'HSN_Code',
  'Lot_Number',
  'Description',
  'Width_Reduction',
  'Unit',
  'SKU',
  'Tax_GST',
  'Cost_Price',
  'Selling_Price',
  'MRP',
  'Opening_Stock',
]

const REQUIRED_CORE_HEADERS: readonly CoreHeader[] = [
  'Group_Code',
  'Product_Name',
  'Has_Variants',
  'Category',
  'Unit',
  'Cost_Price',
  'Selling_Price',
]

const TEMPLATE_HEADERS: readonly string[] = [
  'Group_Code*',
  'Product_Name*',
  'Has_Variants*',
  'Category*',
  'HSN_Code',
  'Lot_Number',
  'Description',
  'Width_Reduction',
  'Unit*',
  'SKU',
  'Tax_GST',
  'Cost_Price*',
  'Selling_Price*',
  'MRP',
  'Opening_Stock',
]

const EMPTY_TOKENS = new Set(['', 'n/a', 'na', '-', '--', 'nil', 'none'])
const NUMERIC_TOLERANCE = 1e-6

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function makeIssue(row: number, column: string, reason: string, severity: Severity): ProductImportIssue {
  return { row, column, reason, severity }
}

function emptyPreview(errors: ProductImportIssue[] = [], warnings: ProductImportIssue[] = []): ProductImportPreview {
  return {
    totalRows: 0,
    productCount: 0,
    variantCount: 0,
    rows: [],
    errors,
    warnings,
    canCommit: errors.length === 0,
  }
}

function joinRichText(value: unknown): string | null {
  if (!Array.isArray(value)) return null
  const parts: string[] = []
  for (const item of value) {
    if (typeof item === 'string') {
      parts.push(item)
      continue
    }
    if (isRecord(item) && typeof item.text === 'string') {
      parts.push(item.text)
      continue
    }
    return null
  }
  return parts.join('')
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'bigint') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function normalizeImportCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return EMPTY_TOKENS.has(trimmed.toLowerCase()) ? '' : trimmed
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return String(value)
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString()

  if (Array.isArray(value)) return ''

  if (isRecord(value)) {
    if ('error' in value) return ''
    if ('result' in value) return normalizeImportCell(value.result)
    if (typeof value.text === 'string') return normalizeImportCell(value.text)
    if ('richText' in value) {
      const text = joinRichText(value.richText)
      return text === null ? '' : normalizeImportCell(text)
    }
  }

  return ''
}

export function parseImportNumber(value: unknown): number | null {
  const direct = finiteNumber(value)
  if (direct !== null) return direct
  if (value === null || value === undefined || typeof value === 'boolean' || value instanceof Date) return null
  if (Array.isArray(value)) return null

  if (isRecord(value)) {
    if (typeof value.toNumber === 'function') {
      const converted = (value.toNumber as () => unknown)()
      const parsed = finiteNumber(converted)
      if (parsed !== null) return parsed
    }
    if ('result' in value) return parseImportNumber(value.result)
    if ('richText' in value) {
      const text = joinRichText(value.richText)
      if (text !== null) return parseImportNumber(text)
    }
    if (typeof value.text === 'string') return parseImportNumber(value.text)
  }

  let text = String(value).trim()
  if (EMPTY_TOKENS.has(text.toLowerCase())) return null

  text = text
    .replace(/₹/g, '')
    .replace(/["']/g, '')
    .replace(/[% \s,]/g, '')

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return null

  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

function roundNumber(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

function cleanStrings(values: string[]): string[] {
  const byKey = new Map<string, string>()
  for (const raw of values) {
    const value = normalizeImportCell(raw)
    if (!value) continue
    const key = normalizeKey(value)
    if (!byKey.has(key)) byKey.set(key, value)
  }
  return Array.from(byKey.values()).sort((a, b) => normalizeKey(a).localeCompare(normalizeKey(b)))
}

function toFiniteTaxRate(value: unknown): number | null {
  const parsed = parseImportNumber(value)
  if (parsed === null || !Number.isFinite(parsed) || parsed < 0) return null
  return roundNumber(parsed, 4)
}

function buildTaxRates(configValue: string | null | undefined, receiptValues: unknown[]): number[] {
  const rates: number[] = []
  const configured = toFiniteTaxRate(configValue)
  if (configured !== null) rates.push(configured)

  for (const value of receiptValues) {
    const rate = toFiniteTaxRate(value)
    if (rate !== null) rates.push(rate)
  }

  if (rates.length === 0) rates.push(18)

  const unique = new Map<number, number>()
  for (const rate of rates.sort((a, b) => a - b)) {
    if (!Array.from(unique.keys()).some((existing) => Math.abs(existing - rate) <= NUMERIC_TOLERANCE)) {
      unique.set(rate, rate)
    }
  }
  return Array.from(unique.values()).sort((a, b) => a - b)
}

export async function getProductImportTemplateData(): Promise<ProductImportTemplateData> {
  const [categories, units, config, receipts, attributes] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true, type: 'PRODUCT' },
      select: { name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.unit.findMany({
      where: { isActive: true },
      select: { code: true },
      orderBy: { code: 'asc' },
    }),
    prisma.systemConfiguration.findUnique({
      where: { configKey: 'invoice.gstPercent' },
      select: { configValue: true },
    }),
    prisma.purchaseReceipt.findMany({
      where: { gstPercentage: { not: null } },
      select: { gstPercentage: true },
      distinct: ['gstPercentage'],
    }),
    prisma.attribute.findMany({
      where: { isActive: true },
      select: {
        code: true,
        name: true,
        values: {
          where: { isActive: true },
          select: { value: true },
          orderBy: { value: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    }),
  ])

  const hasAnyValues = attributes.some((attribute) => attribute.values.length > 0)
  const templateAttributes: ProductImportTemplateAttribute[] = attributes
    .filter((attribute) => !hasAnyValues || attribute.values.length > 0)
    .map((attribute) => ({
      code: normalizeImportCell(attribute.code),
      name: normalizeImportCell(attribute.name),
      values: cleanStrings(attribute.values.map((value) => value.value)),
    }))

  return {
    categories: cleanStrings(categories.map((category) => category.name)),
    units: cleanStrings(units.map((unit) => unit.code)),
    taxRates: buildTaxRates(config?.configValue, receipts.map((receipt) => receipt.gstPercentage)),
    attributes: templateAttributes,
    generatedAt: new Date().toISOString(),
  }
}

function columnLetter(column: number): string {
  let index = column
  let letters = ''
  while (index > 0) {
    index -= 1
    letters = String.fromCharCode(65 + (index % 26)) + letters
    index = Math.floor(index / 26)
  }
  return letters
}

function quoteSheetName(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`
}

function listReference(sheetName: string, column: string, valueCount: number): string {
  const lastRow = Math.max(2, valueCount + 1)
  return `${quoteSheetName(sheetName)}!$${column}$2:$${column}$${lastRow}`
}

function templateAttributeCode(attribute: ProductImportTemplateAttribute, index: number): string {
  const code = normalizeImportCell(attribute.code).replace(/\*+$/, '').trim()
  return code || `ATTR_${index + 1}`
}

function applyListValidation(worksheet: Worksheet, column: number, formula: string): void {
  for (let row = 3; row <= 202; row += 1) {
    worksheet.getCell(row, column).dataValidation = {
      type: 'list',
      allowBlank: true,
      errorStyle: 'stop',
      showErrorMessage: true,
      errorTitle: 'Invalid value',
      error: 'Select a value from the Lists sheet.',
      formulae: [formula],
    }
  }
}

function writeListValues(worksheet: Worksheet, column: number, values: Array<string | number>): void {
  values.forEach((value, index) => {
    worksheet.getCell(index + 2, column).value = value
  })
}

export async function buildProductImportTemplate(data: ProductImportTemplateData): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  const products = workbook.addWorksheet('Products')
  const lists = workbook.addWorksheet('Lists')

  const categories = data.categories.length > 0 ? data.categories : ['Category']
  const units = data.units.length > 0 ? data.units : ['SQFT']
  const taxRates = data.taxRates.length > 0 ? data.taxRates : [18]
  const attributes = data.attributes.map((attribute, index) => ({
    code: templateAttributeCode(attribute, index),
    values: cleanStrings(attribute.values),
  }))

  const headers = [...TEMPLATE_HEADERS, ...attributes.map((attribute) => `Attr::${attribute.code}*`)]
  const hint =
    'Blank SKU auto-generates. Use blank/N/A/- for unused attributes. Delete SAMPLE rows. Has_Variants=Yes: repeat Group_Code for every variant.'

  products.views = [{ state: 'frozen', ySplit: 2, topLeftCell: 'A3', activeCell: 'A3' }]

  headers.forEach((header, index) => {
    const column = index + 1
    products.getCell(1, column).value = header
    products.getColumn(column).width = header.startsWith('Attr::')
      ? 20
      : header === 'Description'
        ? 34
        : header === 'Product_Name' || header === 'Product_Name*'
          ? 26
          : header === 'Group_Code*'
            ? 24
            : header === 'HSN_Code' || header === 'Lot_Number'
              ? 16
              : 18
  })

  const headerRow = products.getRow(1)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle', wrapText: true }

  products.getCell(2, 1).value = hint
  const hintRow = products.getRow(2)
  hintRow.height = 54
  for (let column = 1; column <= headers.length; column += 1) {
    const cell = hintRow.getCell(column)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F5F9' } }
    cell.alignment = { vertical: 'top', wrapText: true }
  }

  const sampleAttributeValue = (attribute: { values: string[] }, variantIndex: number): string => {
    if (attribute.values.length === 0) return `VALUE_${variantIndex + 1}`
    if (variantIndex === 0) return attribute.values[0]
    if (attribute.values.length > 1) return attribute.values[1]
    return 'N/A'
  }

  const sampleRow = (
    groupCode: string,
    productName: string,
    hasVariants: 'Yes' | 'No',
    variantIndex: number,
    costPrice: number,
    sellingPrice: number,
  ): Array<string | number> => {
    const row: Array<string | number> = [
      groupCode,
      productName,
      hasVariants,
      categories[0],
      '68029900',
      'LOT-SAMPLE',
      hasVariants === 'Yes' ? 'Sample multi-variant product' : 'Sample single-item product',
      0,
      units[0],
      '',
      taxRates[0],
      costPrice,
      sellingPrice,
      sellingPrice + 100,
      0,
    ]
    for (const attribute of attributes) {
      row.push(hasVariants === 'Yes' ? sampleAttributeValue(attribute, variantIndex) : 'N/A')
    }
    return row
  }

  products.addRow(
    sampleRow('SAMPLE_MULTI_001', 'SAMPLE Multi Variant Granite', 'Yes', 0, 1200, 1500),
  )
  products.addRow(
    sampleRow('SAMPLE_MULTI_001', 'SAMPLE Multi Variant Granite', 'Yes', 1, 1250, 1600),
  )
  products.addRow(
    sampleRow('SAMPLE_SINGLE_001', 'SAMPLE Single Item Marble', 'No', 0, 900, 1200),
  )
  products.addRow(
    sampleRow('SAMPLE_SINGLE_002', 'SAMPLE Single Item Slab', 'No', 0, 1500, 1950),
  )

  const listHeaders = ['Category', 'Has_Variants', 'Unit', 'Tax/GST', ...attributes.map((attribute) => `Attr::${attribute.code}`)]
  listHeaders.forEach((header, index) => {
    const cell = lists.getCell(1, index + 1)
    cell.value = header
    cell.font = { bold: true }
    lists.getColumn(index + 1).width = 20
  })

  writeListValues(lists, 1, categories)
  writeListValues(lists, 2, ['Yes', 'No'])
  writeListValues(lists, 3, units)
  writeListValues(lists, 4, taxRates)
  attributes.forEach((attribute, index) => writeListValues(lists, 5 + index, attribute.values))

  const listsName = 'Lists'
  applyListValidation(products, 4, listReference(listsName, columnLetter(1), categories.length))
  applyListValidation(products, 3, listReference(listsName, columnLetter(2), 2))
  applyListValidation(products, 9, listReference(listsName, columnLetter(3), units.length))
  applyListValidation(products, 11, listReference(listsName, columnLetter(4), taxRates.length))
  attributes.forEach((attribute, index) => {
    applyListValidation(
      products,
      TEMPLATE_HEADERS.length + index + 1,
      listReference(listsName, columnLetter(5 + index), attribute.values.length),
    )
  })

  return await workbook.xlsx.writeBuffer()
}

function buildLookups(
  data: ProductImportTemplateData,
  categoryRows: Array<{ id: number; name: string }>,
): TemplateLookups {
  const categories = new Map<string, string>()
  const categoryIds = new Map<string, number>()
  for (const row of categoryRows) {
    const name = normalizeImportCell(row.name)
    const key = normalizeKey(name)
    if (!name || !key || categoryIds.has(key)) continue
    categories.set(key, name)
    categoryIds.set(key, row.id)
  }
  for (const name of data.categories) {
    const clean = normalizeImportCell(name)
    const key = normalizeKey(clean)
    if (clean && key && !categories.has(key)) categories.set(key, clean)
  }

  const units = new Map<string, string>()
  for (const unit of data.units) {
    const clean = normalizeImportCell(unit)
    const key = normalizeKey(clean)
    if (clean && key && !units.has(key)) units.set(key, clean)
  }

  const attributes = new Map<string, AttributeDefinition>()
  for (const attribute of data.attributes) {
    const code = normalizeImportCell(attribute.code).replace(/\*+$/, '').trim()
    const key = normalizeKey(code)
    if (!code || !key) continue
    let definition = attributes.get(key)
    if (!definition) {
      definition = { code, name: normalizeImportCell(attribute.name), values: new Map<string, string>() }
      attributes.set(key, definition)
    }
    for (const rawValue of attribute.values) {
      const value = normalizeImportCell(rawValue)
      const valueKey = normalizeKey(value)
      if (value && valueKey && !definition.values.has(valueKey)) definition.values.set(valueKey, value)
    }
  }

  return {
    categories,
    units,
    taxRates: data.taxRates.filter((rate) => Number.isFinite(rate)),
    attributes,
    categoryIds,
  }
}

function normalizeHeader(value: unknown): string {
  return normalizeImportCell(value).replace(/\*+$/, '').trim()
}

function canonicalTaxRate(value: number, rates: number[]): number | null {
  for (const rate of rates) {
    if (Number.isFinite(rate) && Math.abs(rate - value) <= NUMERIC_TOLERANCE) return rate
  }
  return null
}

function readNumber(
  value: string,
  column: CoreHeader,
  addIssue: IssueAdder,
  options: { required?: boolean; min?: number; exclusiveMin?: boolean },
): number | null {
  if (!value) {
    if (options.required) addIssue(column, `${column} is required`)
    return null
  }

  const parsed = parseImportNumber(value)
  if (parsed === null) {
    addIssue(column, `${column} must be a number`)
    return null
  }

  if (options.min !== undefined && options.exclusiveMin && parsed <= options.min) {
    addIssue(column, `${column} must be greater than ${options.min}`)
  } else if (options.min !== undefined && !options.exclusiveMin && parsed < options.min) {
    addIssue(column, `${column} must be ${options.min} or greater`)
  }

  return parsed
}

function comparableGroupValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(roundNumber(value, 4)) : ''
  return value.trim()
}

function toWorkbookBuffer(input: Buffer | ArrayBuffer): Buffer {
  if (Buffer.isBuffer(input)) return input
  if (ArrayBuffer.isView(input)) return Buffer.from(input.buffer, input.byteOffset, input.byteLength)
  return Buffer.from(input)
}

function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function loadRequiredAttributes(categoryIds: number[]): Promise<Map<number, string[]>> {
  const byCategory = new Map<number, string[]>()
  if (categoryIds.length === 0) return byCategory

  const links = await prisma.categoryAttribute.findMany({
    where: {
      isActive: true,
      isRequired: true,
      categoryId: { in: categoryIds },
      attribute: { isActive: true },
    },
    select: {
      categoryId: true,
      attribute: { select: { code: true } },
    },
  })

  for (const link of links) {
    const code = normalizeImportCell(link.attribute.code).replace(/\*+$/, '').trim()
    if (!code) continue
    const codes = byCategory.get(link.categoryId) ?? []
    if (!codes.some((existing) => normalizeKey(existing) === normalizeKey(code))) codes.push(code)
    byCategory.set(link.categoryId, codes)
  }

  return byCategory
}

export async function parseProductImportWorkbook(
  buffer: Buffer | ArrayBuffer,
  data: ProductImportTemplateData,
): Promise<ProductImportPreview> {
  let workbook: Workbook
  try {
    workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(toWorkbookBuffer(buffer) as never)
  } catch (error) {
    return emptyPreview([makeIssue(0, 'File', `Unable to read workbook: ${errorReason(error)}`, 'error')])
  }

  const sheet = workbook.getWorksheet('Products')
  if (!sheet) {
    return emptyPreview([makeIssue(0, 'Sheet', 'Products sheet is missing', 'error')])
  }

  const globalErrors: ProductImportIssue[] = []
  const globalWarnings: ProductImportIssue[] = []

  const addGlobalIssue = (column: string, reason: string, severity: Severity = 'error'): void => {
    const target = severity === 'error' ? globalErrors : globalWarnings
    target.push(makeIssue(0, column, reason, severity))
  }

  const addRowIssue = (
    record: Pick<ProductImportPreviewRow, 'row' | 'errors' | 'warnings'>,
    column: string,
    reason: string,
    severity: Severity = 'error',
  ): void => {
    const issue = makeIssue(record.row, column, reason, severity)
    if (severity === 'error') {
      record.errors.push(issue)
      globalErrors.push(issue)
    } else {
      record.warnings.push(issue)
      globalWarnings.push(issue)
    }
  }

  const headerColumns = new Map<string, number>()
  const attributeColumns: AttributeColumn[] = []
  const attributeColumnByCode = new Map<string, string>()
  const headerRow = sheet.getRow(1)

  for (let column = 1; column <= headerRow.cellCount; column += 1) {
    const header = normalizeHeader(headerRow.getCell(column).value)
    if (!header) continue
    const key = normalizeKey(header)
    if (!headerColumns.has(key)) headerColumns.set(key, column)

    if (key.startsWith('attr::')) {
      const code = header.slice(6).trim()
      if (!code) {
        addGlobalIssue('Attr::', 'Attribute column is missing a code')
        continue
      }
      const canonicalColumn = `Attr::${code}`
      if (!attributeColumnByCode.has(normalizeKey(code))) {
        attributeColumnByCode.set(normalizeKey(code), canonicalColumn)
      }
      attributeColumns.push({ column, code, canonicalColumn, raw: '' })
    }
  }

  for (const header of REQUIRED_CORE_HEADERS) {
    if (!headerColumns.has(normalizeKey(header))) {
      addGlobalIssue(header, `Required column ${header} is missing`)
    }
  }

  const categoryRows = await prisma.category.findMany({
    where: { isActive: true, type: 'PRODUCT' },
    select: { id: true, name: true },
    orderBy: { id: 'asc' },
  })
  const lookups = buildLookups(data, categoryRows)
  const records: ParsedRecord[] = []

  sheet.eachRow({ includeEmpty: false }, (row: Row, rowNumber: number) => {
    if (rowNumber <= 2) return

    const coreValues = new Map<CoreHeader, string>()
    for (const header of CORE_HEADERS) {
      const column = headerColumns.get(normalizeKey(header))
      coreValues.set(header, column ? normalizeImportCell(row.getCell(column).value) : '')
    }

    const allCoreBlank = Array.from(coreValues.values()).every((value) => !value)
    if (allCoreBlank) return

    const groupCode = coreValues.get('Group_Code') ?? ''
    if (normalizeKey(groupCode).startsWith('sample')) return

    const rowAttributeColumns: AttributeColumn[] = attributeColumns.map((attributeColumn) => ({
      ...attributeColumn,
      raw: normalizeImportCell(row.getCell(attributeColumn.column).value),
    }))

    const preview: ProductImportPreviewRow = {
      row: rowNumber,
      groupCode,
      productName: coreValues.get('Product_Name') ?? '',
      hasVariants: false,
      category: coreValues.get('Category') ?? '',
      hsnCode: coreValues.get('HSN_Code') || null,
      lotNumber: coreValues.get('Lot_Number') || null,
      description: coreValues.get('Description') || null,
      widthReduction: null,
      unit: coreValues.get('Unit') ?? '',
      taxGst: null,
      skuCode: coreValues.get('SKU') || null,
      attributeValues: {},
      costPrice: null,
      sellingPrice: null,
      mrp: null,
      openingStock: null,
      marginPct: null,
      errors: [],
      warnings: [],
    }

    const addIssue: IssueAdder = (column, reason, severity = 'error') => {
      addRowIssue(preview, column, reason, severity)
    }

    if (!preview.groupCode) addIssue('Group_Code', 'Group_Code is required')
    if (!preview.productName) addIssue('Product_Name', 'Product_Name is required')

    let hasVariantsValid = false
    const hasVariantsRaw = coreValues.get('Has_Variants') ?? ''
    if (!hasVariantsRaw) {
      addIssue('Has_Variants', 'Has_Variants is required')
    } else if (normalizeKey(hasVariantsRaw) === 'yes') {
      preview.hasVariants = true
      hasVariantsValid = true
    } else if (normalizeKey(hasVariantsRaw) === 'no') {
      preview.hasVariants = false
      hasVariantsValid = true
    } else {
      addIssue('Has_Variants', 'Has_Variants must be Yes or No')
    }

    const categoryRaw = coreValues.get('Category') ?? ''
    if (!categoryRaw) {
      addIssue('Category', 'Category is required')
    } else {
      const canonical = lookups.categories.get(normalizeKey(categoryRaw))
      if (canonical === undefined) {
        addIssue('Category', 'Category must match an active PRODUCT category')
      } else {
        preview.category = canonical
      }
    }

    const unitRaw = coreValues.get('Unit') ?? ''
    if (!unitRaw) {
      addIssue('Unit', 'Unit is required')
    } else {
      const canonical = lookups.units.get(normalizeKey(unitRaw))
      if (canonical === undefined) {
        addIssue('Unit', 'Unit must match an active unit')
      } else {
        preview.unit = canonical
      }
    }

    const taxRaw = coreValues.get('Tax_GST') ?? ''
    if (taxRaw) {
      const parsedTax = parseImportNumber(taxRaw)
      if (parsedTax === null) {
        addIssue('Tax_GST', 'Tax_GST must be a number')
      } else {
        const canonicalTax = canonicalTaxRate(parsedTax, lookups.taxRates)
        if (canonicalTax === null) {
          addIssue('Tax_GST', 'Tax_GST must be one of the configured tax rates')
        } else {
          preview.taxGst = canonicalTax
        }
      }
    }

    preview.costPrice = readNumber(coreValues.get('Cost_Price') ?? '', 'Cost_Price', addIssue, {
      required: true,
      min: 0,
      exclusiveMin: true,
    })
    preview.sellingPrice = readNumber(coreValues.get('Selling_Price') ?? '', 'Selling_Price', addIssue, {
      required: true,
      min: 0,
      exclusiveMin: true,
    })
    preview.openingStock = readNumber(coreValues.get('Opening_Stock') ?? '', 'Opening_Stock', addIssue, {
      min: 0,
    })
    const widthReduction = readNumber(coreValues.get('Width_Reduction') ?? '', 'Width_Reduction', addIssue, {
      min: 0,
    })
    preview.widthReduction = widthReduction
    preview.mrp = readNumber(coreValues.get('MRP') ?? '', 'MRP', addIssue, {})

    if (
      preview.mrp !== null &&
      preview.sellingPrice !== null &&
      preview.mrp < preview.sellingPrice
    ) {
      addIssue('MRP', 'MRP must not be lower than Selling_Price', 'warning')
    }

    if (
      preview.costPrice !== null &&
      preview.sellingPrice !== null &&
      preview.sellingPrice > 0
    ) {
      preview.marginPct = roundNumber(
        ((preview.sellingPrice - preview.costPrice) / preview.sellingPrice) * 100,
        2,
      )
    }

    const attributePresentCodes = new Set<string>()
    const attributeColumnValues: Array<{ code: string; value: string }> = []
    for (const column of rowAttributeColumns) {
      if (!column.raw) continue
      const codeKey = normalizeKey(column.code)
      attributePresentCodes.add(codeKey)

      const definition = lookups.attributes.get(codeKey)
      if (!definition) {
        addIssue(column.canonicalColumn, `Unknown attribute column ${column.code}`)
        continue
      }

      const canonicalValue = definition.values.get(normalizeKey(column.raw))
      if (canonicalValue === undefined) {
        addIssue(column.canonicalColumn, `${column.code} must be one of the allowed values`)
        continue
      }

      preview.attributeValues[definition.code] = canonicalValue
      attributeColumnValues.push({ code: definition.code, value: canonicalValue })
    }

    const attributeCombinationKey = attributeColumnValues
      .map((entry) => `${normalizeKey(entry.code)}=${normalizeKey(entry.value)}`)
      .sort()
      .join('|')

    records.push({
      preview,
      comparison: {
        productName: preview.productName,
        category: preview.category,
        hsnCode: preview.hsnCode,
        lotNumber: preview.lotNumber,
        description: coreValues.get('Description') || null,
        widthReduction,
        unit: preview.unit,
        taxGst: preview.taxGst,
      },
      groupKey: normalizeKey(groupCode),
      hasVariantsValid,
      attributeCombinationKey,
      attributePresentCodes,
    })
  })

  const skuFirstRows = new Map<string, number>()
  for (const record of records) {
    const sku = record.preview.skuCode
    if (!sku) continue

    const skuKey = normalizeKey(sku)
    const firstRow = skuFirstRows.get(skuKey)
    if (firstRow !== undefined) {
      addRowIssue(record.preview, 'SKU', `SKU ${sku} is duplicated in this file; first used on row ${firstRow}`)
    } else {
      skuFirstRows.set(skuKey, record.preview.row)
    }

    const existing = await prisma.productVariant.findUnique({
      where: { skuCode: sku },
      select: { id: true },
    })
    if (existing) {
      addRowIssue(record.preview, 'SKU', `SKU ${sku} already exists`)
    }
  }

  const usedCategoryIds = Array.from(
    new Set(
      records
        .map((record) => lookups.categoryIds.get(normalizeKey(record.preview.category)))
        .filter((id): id is number => id !== undefined),
    ),
  )
  const requiredByCategoryId = await loadRequiredAttributes(usedCategoryIds)
  const categoryKeyById = new Map<number, string>()
  for (const [key, id] of lookups.categoryIds) {
    if (!categoryKeyById.has(id)) categoryKeyById.set(id, key)
  }
  const requiredByCategoryKey = new Map<string, string[]>()
  for (const [categoryId, codes] of requiredByCategoryId) {
    const key = categoryKeyById.get(categoryId)
    if (key) requiredByCategoryKey.set(key, codes)
  }

  for (const record of records) {
    const requiredCodes = requiredByCategoryKey.get(normalizeKey(record.preview.category)) ?? []
    for (const code of requiredCodes) {
      if (record.attributePresentCodes.has(normalizeKey(code))) continue
      const column = attributeColumnByCode.get(normalizeKey(code)) ?? `Attr::${code}`
      addRowIssue(
        record.preview,
        column,
        `Attribute ${code} is required for category ${record.preview.category}`,
      )
    }
  }

  type GroupState = {
    rowNumber: number
    hasVariants: boolean
    comparison: ComparisonFields
    combinations: Set<string>
  }
  const groups = new Map<string, GroupState>()
  for (const record of records) {
    if (!record.groupKey || !record.hasVariantsValid) continue

    const existing = groups.get(record.groupKey)
    if (!existing) {
      groups.set(record.groupKey, {
        rowNumber: record.preview.row,
        hasVariants: record.preview.hasVariants,
        comparison: record.comparison,
        combinations: new Set([record.attributeCombinationKey]),
      })
      continue
    }

    if (existing.hasVariants !== record.preview.hasVariants) {
      addRowIssue(
        record.preview,
        'Has_Variants',
        `Group_Code ${record.preview.groupCode} is already used with Has_Variants=${existing.hasVariants ? 'Yes' : 'No'} on row ${existing.rowNumber}`,
      )
      continue
    }

    if (!record.preview.hasVariants) {
      addRowIssue(
        record.preview,
        'Group_Code',
        `Group_Code ${record.preview.groupCode} must be unique when Has_Variants=No; first used on row ${existing.rowNumber}`,
      )
      continue
    }

    const mismatches: Array<{
      column: CoreHeader
      expected: string | number | null
      actual: string | number | null
    }> = [
      { column: 'Product_Name', expected: existing.comparison.productName, actual: record.comparison.productName },
      { column: 'Category', expected: existing.comparison.category, actual: record.comparison.category },
      { column: 'HSN_Code', expected: existing.comparison.hsnCode, actual: record.comparison.hsnCode },
      { column: 'Lot_Number', expected: existing.comparison.lotNumber, actual: record.comparison.lotNumber },
      { column: 'Description', expected: existing.comparison.description, actual: record.comparison.description },
      {
        column: 'Width_Reduction',
        expected: existing.comparison.widthReduction,
        actual: record.comparison.widthReduction,
      },
      { column: 'Unit', expected: existing.comparison.unit, actual: record.comparison.unit },
      { column: 'Tax_GST', expected: existing.comparison.taxGst, actual: record.comparison.taxGst },
    ]
    for (const mismatch of mismatches) {
      if (comparableGroupValue(mismatch.expected) !== comparableGroupValue(mismatch.actual)) {
        addRowIssue(
          record.preview,
          mismatch.column,
          `${mismatch.column} must match row ${existing.rowNumber} for Has_Variants=Yes group ${record.preview.groupCode}`,
        )
      }
    }

    if (existing.combinations.has(record.attributeCombinationKey)) {
      const attributeColumn = attributeColumns[0]?.canonicalColumn ?? 'Product_Name'
      addRowIssue(
        record.preview,
        attributeColumn.startsWith('Attr::') ? attributeColumn : 'Product_Name',
        `Duplicate attribute-value combination within group ${record.preview.groupCode}`,
      )
    } else {
      existing.combinations.add(record.attributeCombinationKey)
    }
  }

  const groupCodes = new Set(records.map((record) => normalizeKey(record.preview.groupCode)))

  return {
    totalRows: records.length,
    productCount: groupCodes.size,
    variantCount: records.length,
    rows: records.map((record) => record.preview),
    errors: globalErrors,
    warnings: globalWarnings,
    canCommit: globalErrors.length === 0,
  }
}
