# Cloudflare deployment

Vercel/Netlify configuration has been removed. Both apps are deployed to Cloudflare Workers.

## Architecture

| Package | Worker | What it does |
| --- | --- | --- |
| `apps/api` | `jg-app-api` | Hono API + Prisma (client engine + `pg` driver adapter) |
| `apps/web` | `jg-app-web` | Built Vite SPA as static assets + `/api/*` proxy |

The Web Worker forwards `/api/*` to the API Worker through a **service binding**, so the browser talks to a single origin. That avoids CORS preflight and keeps auth cookies same-site. No `VITE_API_URL` is baked into production builds (`apps/web/.env.production` sets it to empty).

## Why the old error happened

Wrangler's auto-detection refuses to run from a workspace root. This repo declares `"workspaces": ["apps/*", "packages/*"]` in the root `package.json`, so `wrangler deploy` at the root produced:

```
The Cloudflare application detection logic has been run in the root of a workspace...
```

Always run deploy from an app directory (or use the root npm scripts, which do that for you). Every app now has its own `wrangler.jsonc`, so Wrangler never has to guess.

## Prerequisites

- A Cloudflare account
- Wrangler authenticated: `bunx wrangler login`
- Bun installed
- An external PostgreSQL database reachable from Workers (the configured `db.prisma.io` instance works with the `nodejs_compat` flag)

## First-time setup

1. Deploy the API first so the Web Worker's service binding can resolve it:

   ```sh
   bun run deploy:api
   ```

   Wrangler will create the Worker and print its URL (for example `https://jg-app-api.<account>.workers.dev`).

2. Set the API secrets (never commit these):

   ```sh
   cd apps/api
   bunx wrangler secret put DATABASE_URL
   bunx wrangler secret put BETTER_AUTH_SECRET
   ```

   `DATABASE_URL` is the same connection string used locally. `BETTER_AUTH_SECRET` must be at least 32 characters.

3. Update the two URL vars in `apps/api/wrangler.jsonc` to your real **Web** Worker URL, then redeploy the API:

   ```jsonc
   "BETTER_AUTH_URL": "https://jg-app-web.<account>.workers.dev",
   "WEB_ORIGIN": "https://jg-app-web.<account>.workers.dev"
   ```

4. Deploy the Web Worker:

   ```sh
   bun run deploy:web
   ```

   Wrangler prints the Web Worker URL. It may differ from the placeholder above — if it does, update the API vars again and redeploy the API once more.

## Deploy commands

```sh
bun run deploy        # API then web
bun run deploy:api
bun run deploy:web
```

Or from an app directory: `cd apps/api && bun run deploy`, `cd apps/web && bun run deploy`.

Tail logs with `bun run --cwd apps/api tail` / `bun run --cwd apps/web tail`.

## Local development

Unchanged. The API still runs as a Bun server (`bun run dev:api`) and Vite proxies `/api` to `http://localhost:3001` (`apps/web/vite.config.ts`). The Prisma client now uses the `@prisma/adapter-pg` driver adapter locally as well, which is required by the client engine.

## Scheduled jobs / backups (important)

Expense-schedule generation, task reminders, and daily database backups are started by `apps/api/src/server.ts` using `pg-boss`, which needs a long-running process with a direct TCP connection. These jobs are **not** started by the Worker entry point (`apps/api/src/index.ts`).

Keep at least one persistent Bun or Docker API instance running for those jobs (see `DOCKER.md` and `BACKUPS.md`). The Cloudflare API Worker serves HTTP requests only.

## Validation performed

- `bun run typecheck` — passes
- `bun run --cwd apps/web build` — passes
- `wrangler deploy --dry-run` for both apps — passes
- Prisma client generated with `engineType = "client"` and a live query verified
