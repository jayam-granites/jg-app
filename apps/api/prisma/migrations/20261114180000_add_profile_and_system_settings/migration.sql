CREATE TABLE "organization_profiles" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "company_name" TEXT NOT NULL DEFAULT 'Jayam Granites',
    "address" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "primary_phone" TEXT,
    "secondary_phone" TEXT,
    "email" TEXT,
    "gst_number" TEXT,
    "pan_number" TEXT,
    "tan_number" TEXT,
    "bank_name" TEXT,
    "account_holder_name" TEXT,
    "account_number" TEXT,
    "ifsc_code" TEXT,
    "branch" TEXT,
    "upi_id" TEXT,
    "upi_qr_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "organization_profiles_singleton_id_check" CHECK ("id" = 1)
);

CREATE TABLE "system_configurations" (
    "id" TEXT NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_label" TEXT NOT NULL,
    "config_value" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "options" JSONB,
    "category" TEXT NOT NULL DEFAULT 'General',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configurations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_configurations_config_key_key" ON "system_configurations"("config_key");
CREATE INDEX "system_configurations_category_config_label_idx" ON "system_configurations"("category", "config_label");
