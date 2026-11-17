-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AccountTransactionType" AS ENUM ('INVOICE_PAYMENT', 'EXPENSE', 'INITIAL_BALANCE', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."AccountType" AS ENUM ('CASH', 'UPI', 'BANK_ACCOUNT');

-- CreateEnum
CREATE TYPE "public"."CategoryType" AS ENUM ('PRODUCT', 'EXPENSE', 'SERVICE', 'PURCHASE');

-- CreateEnum
CREATE TYPE "public"."ExpenseFrequency" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PARTIAL_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ItemType" AS ENUM ('PRODUCT', 'SERVICE', 'CHARGE');

-- CreateEnum
CREATE TYPE "public"."PurchaseStatus" AS ENUM ('DRAFT', 'APPROVED', 'PARTIAL_RECEIVED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."account_transactions" (
    "id" SERIAL NOT NULL,
    "account_id" INTEGER NOT NULL,
    "type" "public"."AccountTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "note" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."AccountType" NOT NULL,
    "owner_tag" TEXT,
    "initial_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attribute_values" (
    "id" SERIAL NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "value" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attributes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_sessions" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auth_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."brokers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "address" TEXT,
    "commission_percent" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "name" TEXT NOT NULL,
    "type" "public"."CategoryType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."category_attributes" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "alternate_mobile" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "gst_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_allocations" (
    "id" SERIAL NOT NULL,
    "expense_id" INTEGER NOT NULL,
    "purchase_receipt_item_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_schedules" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "frequency" "public"."ExpenseFrequency" NOT NULL,
    "amount" DECIMAL(12,2),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "interval_days" INTEGER,
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" SERIAL NOT NULL,
    "expense_number" TEXT NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "category_id" INTEGER NOT NULL,
    "expense_schedule_id" INTEGER,
    "purchase_receipt_id" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "from_date" TIMESTAMP(3),
    "to_date" TIMESTAMP(3),
    "remarks" TEXT,
    "payment_mode" TEXT,
    "reference_number" TEXT,
    "is_purchase_expense" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_date" TIMESTAMP(3),
    "account_id" INTEGER,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_batches" (
    "id" SERIAL NOT NULL,
    "purchase_receipt_item_id" INTEGER,
    "product_variant_id" INTEGER NOT NULL,
    "batch_no" TEXT NOT NULL,
    "slab_count" INTEGER,
    "total_qty" DECIMAL(12,3) NOT NULL,
    "available_qty" DECIMAL(12,3) NOT NULL,
    "damaged_qty" DECIMAL(12,3),
    "buying_price" DECIMAL(12,2) NOT NULL,
    "landing_price" DECIMAL(12,2) NOT NULL,
    "selling_price_from" DECIMAL(12,2),
    "selling_price_to" DECIMAL(12,2),
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inventory_slabs" (
    "id" SERIAL NOT NULL,
    "inventory_batch_id" INTEGER NOT NULL,
    "serial_no" TEXT,
    "length" DECIMAL(12,2),
    "width" DECIMAL(12,2),
    "thickness" DECIMAL(12,2),
    "sqft" DECIMAL(12,3),
    "is_sold" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "crack_area" DECIMAL(12,3),
    "crack_height" DECIMAL(12,2),
    "crack_width" DECIMAL(12,2),
    "is_crack" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inventory_slabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_commissions" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "broker_id" INTEGER NOT NULL,
    "commission_percent" DECIMAL(5,2),
    "commission_amount" DECIMAL(12,2) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_date" TIMESTAMP(3),
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_items" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "item_type" "public"."ItemType" NOT NULL,
    "product_variant_id" INTEGER,
    "inventory_batch_id" INTEGER,
    "inventory_slab_id" INTEGER,
    "description" TEXT,
    "unit_id" INTEGER,
    "qty" DECIMAL(12,3) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2),
    "tax_percent" DECIMAL(5,2),
    "tax_amount" DECIMAL(12,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_loading_applicable" BOOLEAN NOT NULL DEFAULT true,
    "slab_count" INTEGER,
    "secondary_unit_id" INTEGER,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_payments" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" TEXT,
    "account_id" INTEGER,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_transports" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "transport_provider_id" INTEGER NOT NULL,
    "transport_date" TIMESTAMP(3) NOT NULL,
    "vehicle_number" TEXT,
    "from_location" TEXT,
    "to_location" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_date" TIMESTAMP(3),
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_transports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" SERIAL NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "is_gst" BOOLEAN NOT NULL DEFAULT false,
    "is_tax_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "gst_percent" DECIMAL(5,2),
    "subtotal" DECIMAL(12,2),
    "discount_amount" DECIMAL(12,2),
    "taxable_amount" DECIMAL(12,2),
    "cgst_amount" DECIMAL(12,2),
    "sgst_amount" DECIMAL(12,2),
    "igst_amount" DECIMAL(12,2),
    "total_tax_amount" DECIMAL(12,2),
    "round_off_amount" DECIMAL(12,2),
    "grand_total" DECIMAL(12,2),
    "remarks" TEXT,
    "converted_from_invoice_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "balance_amount" DECIMAL(12,2),
    "is_half_gst" BOOLEAN NOT NULL DEFAULT false,
    "loading_amount" DECIMAL(12,2),
    "loading_rate" DECIMAL(12,2),
    "payment_method" TEXT,
    "received_amount" DECIMAL(12,2) DEFAULT 0,
    "account_id" INTEGER,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lookup_options" (
    "id" SERIAL NOT NULL,
    "group" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lookup_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."measurements" (
    "id" SERIAL NOT NULL,
    "measurement_number" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "phone" TEXT,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_variant_attributes" (
    "id" SERIAL NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "attribute_value_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variant_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "sku_code" TEXT NOT NULL,
    "mrp" DECIMAL(12,2) NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "secondary_unit_id" INTEGER,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hsn_code" TEXT,
    "lot_number" TEXT,
    "width_reduction" DECIMAL(12,2) DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_order_items" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "ordered_qty" DECIMAL(12,3) NOT NULL,
    "expected_slab_count" INTEGER,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_orders" (
    "id" SERIAL NOT NULL,
    "po_number" TEXT NOT NULL,
    "supplier_id" INTEGER NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "expected_date" TIMESTAMP(3),
    "status" "public"."PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "remarks" TEXT,
    "subtotal" DECIMAL(12,2),
    "total_expense" DECIMAL(12,2),
    "grand_total" DECIMAL(12,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_receipt_items" (
    "id" SERIAL NOT NULL,
    "purchase_receipt_id" INTEGER NOT NULL,
    "purchase_order_item_id" INTEGER,
    "product_variant_id" INTEGER NOT NULL,
    "batch_no" TEXT NOT NULL,
    "received_qty" DECIMAL(12,3) NOT NULL,
    "slab_count" INTEGER,
    "damaged_qty" DECIMAL(12,3),
    "accepted_qty" DECIMAL(12,3),
    "rejected_qty" DECIMAL(12,3),
    "rate" DECIMAL(12,2),
    "buying_price" DECIMAL(12,2) NOT NULL,
    "landing_price" DECIMAL(12,2),
    "selling_price_from" DECIMAL(12,2),
    "selling_price_to" DECIMAL(12,2),
    "width_allowance" DECIMAL(12,2),
    "height_allowance" DECIMAL(12,2),
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_receipt_slabs" (
    "id" SERIAL NOT NULL,
    "purchase_receipt_item_id" INTEGER NOT NULL,
    "serial_no" TEXT,
    "length" DECIMAL(12,2),
    "width" DECIMAL(12,2),
    "thickness" DECIMAL(12,2),
    "sqft" DECIMAL(12,3),
    "is_crack" BOOLEAN NOT NULL DEFAULT false,
    "is_broken" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receipt_slabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_receipts" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "vehicle_number" TEXT,
    "invoice_number" TEXT,
    "received_date" TIMESTAMP(3) NOT NULL,
    "total_sqfts" DECIMAL(12,3),
    "total_slabs" INTEGER,
    "subtotal" DECIMAL(12,2),
    "adjustment" DECIMAL(12,2),
    "net_total" DECIMAL(12,2),
    "gst_invoice_sqft" DECIMAL(12,3),
    "gst_invoice_rate" DECIMAL(12,2),
    "gst_invoice_base_value" DECIMAL(12,2),
    "gst_invoice_gst" DECIMAL(12,2),
    "gst_invoice_total" DECIMAL(12,2),
    "cash_portion" DECIMAL(12,2),
    "bill_payment" DECIMAL(12,2),
    "cash_payment" DECIMAL(12,2),
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_transports" (
    "id" SERIAL NOT NULL,
    "purchase_receipt_id" INTEGER NOT NULL,
    "transport_provider_id" INTEGER NOT NULL,
    "transport_date" TIMESTAMP(3) NOT NULL,
    "vehicle_number" TEXT,
    "from_location" TEXT,
    "to_location" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_date" TIMESTAMP(3),
    "remarks" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_transports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "public"."slabs" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "measurement_id" INTEGER,
    "slab_number" INTEGER NOT NULL,
    "width" DECIMAL(12,2) NOT NULL,
    "height" DECIMAL(12,2) NOT NULL,
    "area" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "address" TEXT,
    "gst_number" TEXT,
    "bank_name" VARCHAR(255),
    "account_number" VARCHAR(100),
    "ifsc_code" VARCHAR(20),
    "branch_name" VARCHAR(100),
    "upi_id" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transport_providers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "vehicle_number" TEXT,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."units" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."upi_profiles" (
    "id" SERIAL NOT NULL,
    "payee_vpa" TEXT NOT NULL,
    "payee_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upi_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'sales',
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_transactions_account_id_idx" ON "public"."account_transactions"("account_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "attribute_values_attribute_id_value_key" ON "public"."attribute_values"("attribute_id" ASC, "value" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "attributes_code_key" ON "public"."attributes"("code" ASC);

-- CreateIndex
CREATE INDEX "auth_accounts_userId_idx" ON "public"."auth_accounts"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "public"."auth_sessions"("token" ASC);

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "public"."auth_sessions"("userId" ASC);

-- CreateIndex
CREATE INDEX "auth_verifications_identifier_idx" ON "public"."auth_verifications"("identifier" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_parent_id_name_key" ON "public"."categories"("parent_id" ASC, "name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "category_attributes_category_id_attribute_id_key" ON "public"."category_attributes"("category_id" ASC, "attribute_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expense_number_key" ON "public"."expenses"("expense_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_batches_purchase_receipt_item_id_key" ON "public"."inventory_batches"("purchase_receipt_item_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_slabs_serial_no_key" ON "public"."inventory_slabs"("serial_no" ASC);

-- CreateIndex
CREATE INDEX "invoice_commissions_broker_id_idx" ON "public"."invoice_commissions"("broker_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_commissions_invoice_id_idx" ON "public"."invoice_commissions"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_items_inventory_batch_id_idx" ON "public"."invoice_items"("inventory_batch_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_items_inventory_slab_id_idx" ON "public"."invoice_items"("inventory_slab_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "public"."invoice_items"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_items_product_variant_id_idx" ON "public"."invoice_items"("product_variant_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_items_secondary_unit_id_idx" ON "public"."invoice_items"("secondary_unit_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_items_unit_id_idx" ON "public"."invoice_items"("unit_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_payments_invoice_id_idx" ON "public"."invoice_payments"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_transports_invoice_id_idx" ON "public"."invoice_transports"("invoice_id" ASC);

-- CreateIndex
CREATE INDEX "invoice_transports_transport_provider_id_idx" ON "public"."invoice_transports"("transport_provider_id" ASC);

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "public"."invoices"("customer_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "public"."invoices"("invoice_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "lookup_options_group_value_key" ON "public"."lookup_options"("group" ASC, "value" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "measurements_measurement_number_key" ON "public"."measurements"("measurement_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_attributes_product_variant_id_attribute_id_key" ON "public"."product_variant_attributes"("product_variant_id" ASC, "attribute_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_code_key" ON "public"."product_variants"("sku_code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "public"."purchase_orders"("po_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_receipt_number_key" ON "public"."purchase_receipts"("receipt_number" ASC);

-- CreateIndex
CREATE INDEX "purchase_transports_purchase_receipt_id_idx" ON "public"."purchase_transports"("purchase_receipt_id" ASC);

-- CreateIndex
CREATE INDEX "purchase_transports_transport_provider_id_idx" ON "public"."purchase_transports"("transport_provider_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_account_number_key" ON "public"."suppliers"("account_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "public"."units"("code" ASC);

-- CreateIndex
CREATE INDEX "upi_profiles_is_default_idx" ON "public"."upi_profiles"("is_default" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."users"("email" ASC);

-- AddForeignKey
ALTER TABLE "public"."account_transactions" ADD CONSTRAINT "account_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attribute_values" ADD CONSTRAINT "attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auth_accounts" ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."category_attributes" ADD CONSTRAINT "category_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."category_attributes" ADD CONSTRAINT "category_attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_allocations" ADD CONSTRAINT "expense_allocations_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_allocations" ADD CONSTRAINT "expense_allocations_purchase_receipt_item_id_fkey" FOREIGN KEY ("purchase_receipt_item_id") REFERENCES "public"."purchase_receipt_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_schedules" ADD CONSTRAINT "expense_schedules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_expense_schedule_id_fkey" FOREIGN KEY ("expense_schedule_id") REFERENCES "public"."expense_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_purchase_receipt_id_fkey" FOREIGN KEY ("purchase_receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_batches" ADD CONSTRAINT "inventory_batches_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_batches" ADD CONSTRAINT "inventory_batches_purchase_receipt_item_id_fkey" FOREIGN KEY ("purchase_receipt_item_id") REFERENCES "public"."purchase_receipt_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inventory_slabs" ADD CONSTRAINT "inventory_slabs_inventory_batch_id_fkey" FOREIGN KEY ("inventory_batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_commissions" ADD CONSTRAINT "invoice_commissions_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "public"."brokers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_commissions" ADD CONSTRAINT "invoice_commissions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_inventory_batch_id_fkey" FOREIGN KEY ("inventory_batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_inventory_slab_id_fkey" FOREIGN KEY ("inventory_slab_id") REFERENCES "public"."inventory_slabs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_secondary_unit_id_fkey" FOREIGN KEY ("secondary_unit_id") REFERENCES "public"."units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_payments" ADD CONSTRAINT "invoice_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_transports" ADD CONSTRAINT "invoice_transports_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_transports" ADD CONSTRAINT "invoice_transports_transport_provider_id_fkey" FOREIGN KEY ("transport_provider_id") REFERENCES "public"."transport_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_converted_from_invoice_id_fkey" FOREIGN KEY ("converted_from_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variant_attributes" ADD CONSTRAINT "product_variant_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "public"."attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variant_attributes" ADD CONSTRAINT "product_variant_attributes_attribute_value_id_fkey" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variant_attributes" ADD CONSTRAINT "product_variant_attributes_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_secondary_unit_id_fkey" FOREIGN KEY ("secondary_unit_id") REFERENCES "public"."units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_receipt_id_fkey" FOREIGN KEY ("purchase_receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_receipt_slabs" ADD CONSTRAINT "purchase_receipt_slabs_purchase_receipt_item_id_fkey" FOREIGN KEY ("purchase_receipt_item_id") REFERENCES "public"."purchase_receipt_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_transports" ADD CONSTRAINT "purchase_transports_purchase_receipt_id_fkey" FOREIGN KEY ("purchase_receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_transports" ADD CONSTRAINT "purchase_transports_transport_provider_id_fkey" FOREIGN KEY ("transport_provider_id") REFERENCES "public"."transport_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."slabs" ADD CONSTRAINT "slabs_measurement_id_fkey" FOREIGN KEY ("measurement_id") REFERENCES "public"."measurements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."slabs" ADD CONSTRAINT "slabs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma cannot express partial unique indexes; preserve the database constraint.
CREATE UNIQUE INDEX "upi_profiles_single_default_key"
    ON "public"."upi_profiles"("is_default")
    WHERE "is_default" = true;
