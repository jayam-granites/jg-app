ALTER TABLE "expense_schedules"
ADD COLUMN "last_processed_occurrence_date" TIMESTAMP(3);

ALTER TABLE "expenses"
ADD COLUMN "schedule_occurrence_date" TIMESTAMP(3);

CREATE UNIQUE INDEX "expenses_expense_schedule_id_schedule_occurrence_date_key"
ON "expenses"("expense_schedule_id", "schedule_occurrence_date");
