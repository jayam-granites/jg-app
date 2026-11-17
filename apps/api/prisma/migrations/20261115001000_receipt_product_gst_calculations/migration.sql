ALTER TABLE "purchase_receipts"
  ADD COLUMN "gst_calculation_mode" TEXT NOT NULL DEFAULT 'OVERALL',
  ADD COLUMN "gst_percentage" DECIMAL(5, 2);

ALTER TABLE "purchase_receipt_items"
  ADD COLUMN "gst_invoice_sqft" DECIMAL(12, 3),
  ADD COLUMN "gst_invoice_rate" DECIMAL(12, 2),
  ADD COLUMN "gst_invoice_base_value" DECIMAL(12, 2),
  ADD COLUMN "gst_invoice_gst" DECIMAL(12, 2),
  ADD COLUMN "gst_invoice_total" DECIMAL(12, 2),
  ADD COLUMN "cash_portion" DECIMAL(12, 2);
