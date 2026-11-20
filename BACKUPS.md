# Database backups

The long-running API server creates a PostgreSQL custom-format dump every day at midnight in `EXPENSE_SCHEDULE_TIME_ZONE` (default: `Asia/Kolkata`). Dumps are saved in the repository root's `backup/` folder as `YYYY-MM-DD.dump`; a failed dump is retried by `pg-boss`. Backup files are ignored by Git.

Run the API as a persistent Bun process with `bun run --cwd apps/api start`. The server must have the PostgreSQL client utility `pg_dump` installed and the `DATABASE_URL` environment variable configured. The scheduled job does not run in Vercel serverless functions, and their local filesystem is not a durable backup destination.

The custom-format dump includes the database schema and data. Restore it with PostgreSQL's `pg_restore` utility, for example:

```sh
pg_restore --no-owner --no-acl --dbname="$DATABASE_URL" backup/YYYY-MM-DD.dump
```
