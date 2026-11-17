CREATE TYPE "ResourceCategory" AS ENUM (
    'ENGINEER',
    'BUILDER',
    'MASTRI',
    'PLUMBER',
    'ELECTRICIAN',
    'LABOR_LOADING',
    'OTHER_UTILITY'
);

CREATE TYPE "EnquiryStatus" AS ENUM (
    'NEW',
    'QUOTED',
    'NEGOTIATING',
    'WON',
    'LOST'
);

CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "resource_contacts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "mobile" TEXT,
    "address" TEXT,
    "std_wage_rate" DECIMAL(10,2),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_enquiries" (
    "id" SERIAL NOT NULL,
    "customer_name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "site_location" TEXT,
    "material_interest" TEXT NOT NULL,
    "size_or_unit" TEXT,
    "quantity" DECIMAL(10,2),
    "quoted_price" DECIMAL(12,2),
    "notes" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_enquiries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "enquiry_id" INTEGER,
    "resource_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_enquiries_mobile_idx" ON "customer_enquiries"("mobile");
CREATE INDEX "customer_enquiries_status_idx" ON "customer_enquiries"("status");
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_enquiry_id_idx" ON "tasks"("enquiry_id");
CREATE INDEX "tasks_resource_id_idx" ON "tasks"("resource_id");

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_enquiry_id_fkey"
    FOREIGN KEY ("enquiry_id") REFERENCES "customer_enquiries"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_resource_id_fkey"
    FOREIGN KEY ("resource_id") REFERENCES "resource_contacts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
