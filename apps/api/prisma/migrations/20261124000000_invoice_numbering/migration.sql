-- Independent, configurable invoice numbering sequences (normal + GST).
CREATE TABLE "invoice_number_sequences" (
    "scope" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "current_number" INTEGER NOT NULL DEFAULT 0,
    "padding_digits" INTEGER NOT NULL DEFAULT 3,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_number_sequences_pkey" PRIMARY KEY ("scope"),
    CONSTRAINT "invoice_number_sequences_scope_check" CHECK ("scope" IN ('normal', 'gst')),
    CONSTRAINT "invoice_number_sequences_current_number_check" CHECK ("current_number" >= 0),
    CONSTRAINT "invoice_number_sequences_padding_digits_check" CHECK ("padding_digits" BETWEEN 1 AND 10)
);

-- Explicit invoice type plus the GSTIN printed on the bill. is_gst is kept in
-- sync by the application so existing PDFs and views continue to work.
ALTER TABLE "invoices"
    ADD COLUMN "invoice_type" TEXT NOT NULL DEFAULT 'normal',
    ADD COLUMN "gst_number" TEXT;

UPDATE "invoices" SET "invoice_type" = 'gst' WHERE "is_gst" = true;

ALTER TABLE "invoices"
    ADD CONSTRAINT "invoices_invoice_type_check" CHECK ("invoice_type" IN ('normal', 'gst'));

CREATE INDEX "invoices_invoice_type_idx" ON "invoices"("invoice_type");

-- Backfill each counter from the highest sequence already used for that type
-- (old numbers look like INV/2627/00001). Fall back to 0 when there are none.
INSERT INTO "invoice_number_sequences" ("scope", "prefix", "current_number", "padding_digits", "updated_at")
SELECT 'normal', 'inv/', COALESCE(MAX(CAST(regexp_replace("invoice_number", '^.*/', '') AS INTEGER)), 0), 3, NOW()
FROM "invoices"
WHERE "invoice_type" = 'normal' AND "invoice_number" ~ '/[0-9]+$';

INSERT INTO "invoice_number_sequences" ("scope", "prefix", "current_number", "padding_digits", "updated_at")
SELECT 'gst', 'inv/2627/', COALESCE(MAX(CAST(regexp_replace("invoice_number", '^.*/', '') AS INTEGER)), 0), 3, NOW()
FROM "invoices"
WHERE "invoice_type" = 'gst' AND "invoice_number" ~ '/[0-9]+$';
