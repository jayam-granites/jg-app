-- Normalize legacy role strings to the canonical RBAC roles.
-- Middleware also normalizes at runtime for databases that have not migrated yet.
UPDATE "users"
SET role = 'superadmin'
WHERE lower(btrim(role)) IN ('super_admin', 'superadmin');

UPDATE "users"
SET role = 'admin'
WHERE lower(btrim(role)) IN ('manager', 'admin');

UPDATE "users"
SET role = 'sales'
WHERE lower(btrim(role)) = 'sales';
