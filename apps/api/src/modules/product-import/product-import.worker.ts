import type { ProductImportPayload } from '@jg-app/shared'
import type { PgBoss } from 'pg-boss'
import { logger } from '#/lib/logger'
import {
  PRODUCT_IMPORT_COMMIT_QUEUE,
  PRODUCT_IMPORT_QUEUE_OPTIONS,
  PRODUCT_IMPORT_VALIDATE_QUEUE,
  productImportService,
} from './product-import.service'

export async function registerProductImportWorkers(boss: PgBoss): Promise<void> {
  await boss.createQueue(PRODUCT_IMPORT_VALIDATE_QUEUE, PRODUCT_IMPORT_QUEUE_OPTIONS)
  await boss.createQueue(PRODUCT_IMPORT_COMMIT_QUEUE, PRODUCT_IMPORT_QUEUE_OPTIONS)

  await boss.work<ProductImportPayload>(PRODUCT_IMPORT_VALIDATE_QUEUE, async (jobs) => {
    for (const job of jobs) {
      logger.info(
        { importJobId: job.data.importJobId, jobId: job.data.jobId },
        'Processing product import validation',
      )
      await productImportService.runValidation(job.data)
      logger.info({ jobId: job.data.jobId }, 'Completed product import validation')
    }
  })

  await boss.work<ProductImportPayload>(PRODUCT_IMPORT_COMMIT_QUEUE, async (jobs) => {
    for (const job of jobs) {
      logger.info(
        { importJobId: job.data.importJobId, jobId: job.data.jobId },
        'Processing product import commit',
      )
      await productImportService.runCommit(job.data)
      logger.info({ jobId: job.data.jobId }, 'Completed product import commit')
    }
  })
}
