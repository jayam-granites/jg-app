-- Prisma cannot express partial unique indexes; this enforces at most one default profile.
CREATE UNIQUE INDEX IF NOT EXISTS "upi_profiles_single_default_key"
    ON "upi_profiles"("is_default")
    WHERE "is_default" = true;
