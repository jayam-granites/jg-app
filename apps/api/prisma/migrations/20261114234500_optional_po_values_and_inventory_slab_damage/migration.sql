ALTER TABLE "purchase_order_items"
  ALTER COLUMN "ordered_qty" DROP NOT NULL,
  ALTER COLUMN "unit_price" DROP NOT NULL,
  ALTER COLUMN "amount" DROP NOT NULL;

ALTER TABLE "inventory_slabs"
  ADD COLUMN "is_broken" BOOLEAN NOT NULL DEFAULT false;
