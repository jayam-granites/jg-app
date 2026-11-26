# Bulk Product & Variant Excel Import

The bulk import flow creates products, their variants, and optional opening-stock inventory batches from a single Excel workbook. Validation runs as a background job before anything is written; only a preview that passes validation can be committed.

## Workflow

1. Open **Products → Bulk Upload**.
2. Download the generated `.xlsx` template. The **Products** sheet is for data; the **Lists** sheet drives strict dropdowns.
3. Fill one row per variant. Repeat `Group_Code` for every variant in a group when `Has_Variants = Yes`.
4. Validate the file. The UI polls the job until the preview is ready.
5. Review row-level errors/warnings and margin percentages.
6. Commit the import. The UI polls progress and refreshes the product list on completion.

## Template columns

Core columns on the **Products** sheet:

| Column | Required | Notes |
|---|---:|---|
| `Group_Code*` | Yes | Groups variants. Unique per product when `Has_Variants = No`. |
| `Product_Name*` | Yes | Must be identical for all rows in a variant group. |
| `Has_Variants*` | Yes | `Yes` or `No` (strict dropdown). |
| `Category*` | Yes | Must match an active PRODUCT category. |
| `HSN_Code` | No | Copied to the product. |
| `Lot_Number` | No | Copied to the product. |
| `Description` | No | Copied to the product. |
| `Width_Reduction` | No | Must be `>= 0`. |
| `Unit*` | Yes | Must match an active unit code. |
| `SKU` | No | Blank values are auto-generated at commit time. Duplicate SKUs are rejected. |
| `Tax_GST` | No | Must match a configured or observed GST rate. Stored on the variant. |
| `Cost_Price*` | Yes | Used for `buyingPrice` and `landingPrice` on the opening-stock batch. |
| `Selling_Price*` | Yes | Used for the variant selling price and batch selling price. |
| `MRP` | No | Falls back to selling price if blank. Must be `>= Selling_Price` (warning only). |
| `Opening_Stock` | No | Defaults to `0`; creates one `InventoryBatch` per variant when provided. |

Dynamic attribute columns are named `Attr::<ATTRIBUTE_CODE>*`. Values must match the **Lists** sheet for that attribute. Blank is allowed unless the category marks the attribute as required via `CategoryAttribute.isRequired`. The tokens `N/A`, `NA`, `-`, `--`, `nil`, and `none` are treated as empty.

Rows whose `Group_Code` starts with `SAMPLE` are ignored. Delete sample rows before validating.

## Required attributes

Required attributes are resolved from `CategoryAttribute` for the selected category. If the category has a required attribute, every row in that group must provide a valid value from the **Lists** sheet. Validation reports the exact `Attr::<CODE>` column and spreadsheet row.

## Margins

Preview margin is computed per row:

```text
margin % = (Selling_Price - Cost_Price) / Selling_Price * 100
```

The value is rounded to two decimals and shown in the preview table.

## API endpoints

All endpoints are under `/api/products/import` and inherit product permissions. Downloads require `catalog:read`; uploads and commits require `cost_control:write` (in addition to `catalog:write` in the UI):

| Method | Path | Description |
|---|---|---|
| `GET` | `/template` | Downloads the generated workbook. |
| `POST` | `/validate` | Uploads the workbook as base64 JSON and enqueues the preview job. Returns `202 { data: { jobId, statusUrl } }`. |
| `POST` | `/commit` | Commits a validated preview by `jobId`. Returns `202 { data: { jobId } }`. |
| `GET` | `/jobs/:jobId` | Returns status, progress, preview, result, and error details. |

## Jobs and workers

Two `pg-boss` queues are used:

- `products.bulk-import.validate`
- `products.bulk-import.commit`

Both use three retries with exponential backoff. Job state is persisted in the `product_import_jobs` table so the UI can poll progress independently of pg-boss internals. Background work is registered by the long-running Bun/Docker API process (`apps/api/src/server.ts`); Cloudflare Workers serve HTTP but do not run workers.

Apply migrations before using the feature:

```sh
bun run --cwd apps/api prisma migrate deploy
```

The import migration adds the `product_import_jobs` table and the optional `product_variants.gst_percent` column.
