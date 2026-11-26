-- Ensure existing contact names follow the same capitalization rule as new writes:
-- trim surrounding whitespace and uppercase only the first character.
UPDATE "customers"
SET "name" = UPPER(LEFT(BTRIM("name"), 1)) || SUBSTRING(BTRIM("name") FROM 2)
WHERE BTRIM("name") <> ''
  AND ("name" <> BTRIM("name") OR LEFT(BTRIM("name"), 1) <> UPPER(LEFT(BTRIM("name"), 1)));

UPDATE "measurements"
SET "name" = UPPER(LEFT(BTRIM("name"), 1)) || SUBSTRING(BTRIM("name") FROM 2)
WHERE BTRIM("name") <> ''
  AND ("name" <> BTRIM("name") OR LEFT(BTRIM("name"), 1) <> UPPER(LEFT(BTRIM("name"), 1)));

UPDATE "suppliers"
SET "name" = UPPER(LEFT(BTRIM("name"), 1)) || SUBSTRING(BTRIM("name") FROM 2)
WHERE BTRIM("name") <> ''
  AND ("name" <> BTRIM("name") OR LEFT(BTRIM("name"), 1) <> UPPER(LEFT(BTRIM("name"), 1)));

UPDATE "brokers"
SET "name" = UPPER(LEFT(BTRIM("name"), 1)) || SUBSTRING(BTRIM("name") FROM 2)
WHERE BTRIM("name") <> ''
  AND ("name" <> BTRIM("name") OR LEFT(BTRIM("name"), 1) <> UPPER(LEFT(BTRIM("name"), 1)));

UPDATE "transport_providers"
SET "name" = UPPER(LEFT(BTRIM("name"), 1)) || SUBSTRING(BTRIM("name") FROM 2)
WHERE BTRIM("name") <> ''
  AND ("name" <> BTRIM("name") OR LEFT(BTRIM("name"), 1) <> UPPER(LEFT(BTRIM("name"), 1)));

UPDATE "resource_contacts"
SET "name" = UPPER(LEFT(BTRIM("name"), 1)) || SUBSTRING(BTRIM("name") FROM 2)
WHERE BTRIM("name") <> ''
  AND ("name" <> BTRIM("name") OR LEFT(BTRIM("name"), 1) <> UPPER(LEFT(BTRIM("name"), 1)));
