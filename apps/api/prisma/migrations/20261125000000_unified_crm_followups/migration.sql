-- ============================================================================
-- Enquiries: fold the legacy requirement columns into a single notes column,
-- map the old statuses, then swap the enum type for the follow-up lifecycle.
-- ============================================================================

ALTER TABLE "customer_enquiries"
    ADD COLUMN "requirements_notes" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "follow_up_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "close_reason" TEXT;

UPDATE "customer_enquiries"
SET "requirements_notes" = COALESCE(
    NULLIF(
        concat_ws(
            E'\n',
            CASE WHEN "site_location" IS NOT NULL AND btrim("site_location") <> '' THEN 'Site location: ' || btrim("site_location") END,
            CASE WHEN "material_interest" IS NOT NULL AND btrim("material_interest") <> '' THEN 'Material interest: ' || btrim("material_interest") END,
            CASE WHEN "size_or_unit" IS NOT NULL AND btrim("size_or_unit") <> '' THEN 'Size / unit: ' || btrim("size_or_unit") END,
            CASE WHEN "quantity" IS NOT NULL THEN 'Quantity: ' || "quantity"::text END,
            CASE WHEN "quoted_price" IS NOT NULL THEN 'Quoted price: ' || "quoted_price"::text END,
            CASE WHEN "notes" IS NOT NULL AND btrim("notes") <> '' THEN 'Notes: ' || btrim("notes") END
        ),
        ''
    ),
    'Migrated enquiry - no requirements recorded'
);

UPDATE "customer_enquiries"
SET "close_reason" = 'Migrated from legacy status ' || "status"::text
WHERE "status"::text IN ('WON', 'LOST');

ALTER TABLE "customer_enquiries" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "EnquiryStatus_new" AS ENUM (
    'OPEN',
    'FOLLOW_UP_1',
    'FOLLOW_UP_2',
    'CLOSED_WON',
    'CLOSED_LOST'
);

ALTER TABLE "customer_enquiries"
    ALTER COLUMN "status" TYPE "EnquiryStatus_new"
    USING CASE
        WHEN "status"::text = 'WON' THEN 'CLOSED_WON'::"EnquiryStatus_new"
        WHEN "status"::text = 'LOST' THEN 'CLOSED_LOST'::"EnquiryStatus_new"
        ELSE 'OPEN'::"EnquiryStatus_new"
    END;

ALTER TABLE "customer_enquiries"
    ALTER COLUMN "status" SET DEFAULT 'OPEN'::"EnquiryStatus_new";

DROP TYPE "EnquiryStatus";

ALTER TYPE "EnquiryStatus_new" RENAME TO "EnquiryStatus";

ALTER TABLE "customer_enquiries" ALTER COLUMN "requirements_notes" DROP DEFAULT;

ALTER TABLE "customer_enquiries"
    DROP COLUMN "site_location",
    DROP COLUMN "material_interest",
    DROP COLUMN "size_or_unit",
    DROP COLUMN "quantity",
    DROP COLUMN "quoted_price",
    DROP COLUMN "notes";

-- ============================================================================
-- Resource contacts: normalise the trade categories and tier groups, keep the
-- legacy notes, and allow tasks to point at any contact type.
-- ============================================================================

CREATE TYPE "TradeContactType" AS ENUM ('ENGINEER', 'BUILDER', 'MASTRI');
CREATE TYPE "TierGroup" AS ENUM ('GOLD', 'SILVER', 'BRONZE');

UPDATE "resource_contacts" SET "mobile" = '' WHERE "mobile" IS NULL;

ALTER TABLE "resource_contacts"
    ADD COLUMN "contact_type" TEXT,
    ADD COLUMN "tier_group" TEXT NOT NULL DEFAULT 'BRONZE',
    ADD COLUMN "product_notes" TEXT;

UPDATE "resource_contacts"
SET "contact_type" = CASE
        WHEN "category"::text IN ('PLUMBER', 'ELECTRICIAN', 'LABOR_LOADING', 'OTHER_UTILITY') THEN 'MASTRI'
        ELSE "category"::text
    END,
    "product_notes" = "notes";

ALTER TABLE "resource_contacts"
    DROP COLUMN "std_wage_rate",
    DROP COLUMN "is_available",
    DROP COLUMN "category",
    DROP COLUMN "notes";

DROP TYPE "ResourceCategory";

ALTER TABLE "resource_contacts" ALTER COLUMN "mobile" SET NOT NULL;
ALTER TABLE "resource_contacts" ALTER COLUMN "tier_group" DROP DEFAULT;

ALTER TABLE "resource_contacts"
    ALTER COLUMN "contact_type" TYPE "TradeContactType" USING "contact_type"::"TradeContactType",
    ALTER COLUMN "tier_group" TYPE "TierGroup" USING "tier_group"::"TierGroup";

ALTER TABLE "resource_contacts" ALTER COLUMN "contact_type" SET NOT NULL;
ALTER TABLE "resource_contacts" ALTER COLUMN "tier_group" SET DEFAULT 'BRONZE'::"TierGroup";

CREATE INDEX "resource_contacts_mobile_idx" ON "resource_contacts"("mobile");
CREATE INDEX "resource_contacts_contact_type_idx" ON "resource_contacts"("contact_type");
CREATE INDEX "resource_contacts_tier_group_idx" ON "resource_contacts"("tier_group");

-- ============================================================================
-- Tasks: link to every CRM entity while keeping the existing enquiry/resource
-- relations untouched.
-- ============================================================================

ALTER TABLE "tasks"
    ADD COLUMN "customer_id" INTEGER,
    ADD COLUMN "supplier_id" INTEGER,
    ADD COLUMN "broker_id" INTEGER,
    ADD COLUMN "transport_id" INTEGER;

CREATE INDEX "tasks_customer_id_idx" ON "tasks"("customer_id");
CREATE INDEX "tasks_supplier_id_idx" ON "tasks"("supplier_id");
CREATE INDEX "tasks_broker_id_idx" ON "tasks"("broker_id");
CREATE INDEX "tasks_transport_id_idx" ON "tasks"("transport_id");

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_supplier_id_fkey"
    FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_broker_id_fkey"
    FOREIGN KEY ("broker_id") REFERENCES "brokers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_transport_id_fkey"
    FOREIGN KEY ("transport_id") REFERENCES "transport_providers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
