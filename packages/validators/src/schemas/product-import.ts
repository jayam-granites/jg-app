import { maxLength, minLength, object, pipe, string } from 'valibot'

export const UploadProductImportSchema = object({
  fileName: pipe(
    string('File name is required'),
    minLength(1, 'File name is required'),
    maxLength(255, 'File name is too long'),
  ),
  fileBase64: pipe(
    string('Excel file is required'),
    minLength(1, 'Excel file is required'),
    maxLength(12 * 1024 * 1024, 'Excel file must be smaller than 9 MB'),
  ),
})

export const CommitProductImportSchema = object({
  jobId: pipe(
    string('Job ID is required'),
    minLength(1, 'Job ID is required'),
    maxLength(100, 'Job ID is invalid'),
  ),
})

export type UploadProductImportFormData = {
  fileName: string
  fileBase64: string
}

export type CommitProductImportFormData = {
  jobId: string
}
