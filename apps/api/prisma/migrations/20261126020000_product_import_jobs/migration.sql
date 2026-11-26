-- Store the optional per-variant GST rate captured by the Excel import.
ALTER TABLE "product_variants" ADD COLUMN "gst_percent" DECIMAL(5,2);

-- Durable status/preview/result store for pg-boss product import jobs.
CREATE TABLE "product_import_jobs" (
    "id" SERIAL NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "phase" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "file_name" TEXT NOT NULL,
    "file_bytes" BYTEA,
    "requested_by_id" TEXT,
    "preview" JSONB,
    "result" JSONB,
    "error" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_import_jobs_job_id_key" ON "product_import_jobs"("job_id");
CREATE INDEX "product_import_jobs_status_idx" ON "product_import_jobs"("status");
CREATE INDEX "product_import_jobs_created_at_idx" ON "product_import_jobs"("created_at");
