-- Indexes for the sales reports date-range scans.
CREATE INDEX "invoices_invoice_date_is_active_status_idx" ON "public"."invoices"("invoice_date" ASC, "is_active" ASC, "status" ASC);

CREATE INDEX "expenses_expense_date_is_active_is_purchase_expense_idx" ON "public"."expenses"("expense_date" ASC, "is_active" ASC, "is_purchase_expense" ASC);
