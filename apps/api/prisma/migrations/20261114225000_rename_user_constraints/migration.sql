ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";
ALTER INDEX "User_email_key" RENAME TO "users_email_key";
