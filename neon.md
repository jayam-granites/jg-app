# Postgres — your database connection
DATABASE_URL="postgresql://neondb_owner:npg_S2gzdPQA9IxG@ep-late-brook-b39lylws.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DATABASE_URL_POOLED="postgresql://neondb_owner:npg_S2gzdPQA9IxG@ep-late-brook-b39lylws-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Neon Managed Better Auth — sign-in for your app
NEON_AUTH_BASE_URL="<your-auth-base-url>"



Set up this app on Neon.
1. `npm i -g neon@latest`. If that fails, use `npx neon@latest` in place of `neon`.
   If a neon command opens a browser sign-in, tell me to finish it there. If that times out or fails, ask me to run `neon login`, then retry.
2. In the project root:
   neon init -y --org-id org-autumn-breeze-82163390 --project-id wild-bonus-49152991 --branch production --services postgres,auth
3. `neon deploy`. It provisions the services in neon.ts and pulls their env vars into `.env.local` (or `.env` if it exists).
4. Wire each service into the app's code using those env vars. Consult the installed Neon agent skills for best practices, e.g., what database driver to use given the app architecture and hosting runtime.
5. Prove it works: `npm run build` must pass, then start the app, each wired service must be tested to prove it works end to end.
6. Report what changed, the command output that proves step 5, and anything that failed.