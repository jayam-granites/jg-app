# Vercel Deployment

Deploy the API and web app as two Vercel projects from this repository.

## API Project

- Set the Root Directory to `apps/api`.
- Enable **Include source files outside of the Root Directory** so the workspace packages can be built.
- Let Vercel detect the Hono framework. The app exports its Hono handler from `src/index.ts`.
- Add `DATABASE_URL` as a Vercel environment variable using the Prisma Postgres connection string. Do not commit the value.
- Deploy the API first. Its health endpoint is `/api/health`.

## Web Project

- Set the Root Directory to `apps/web`.
- Enable **Include source files outside of the Root Directory** for the workspace dependencies.
- Add `VITE_API_URL` as a Vercel environment variable with the API deployment origin, for example `https://your-api-project.vercel.app` (no trailing slash).
- Deploy or redeploy the web project after setting the API URL.

The Vercel build settings are in each app's `vercel.json`. Local API development continues to use the Bun server entrypoint.