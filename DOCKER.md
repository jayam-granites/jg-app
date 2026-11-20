# Docker

The stack runs three services: Postgres 15, the Hono/Bun API, and the Vite web app
(served as static files by nginx in production). Migrations are applied by the API
container on startup.

## Quick start

```sh
docker compose up -d --build
```

- Web app: http://localhost:5173
- API health: http://localhost:3001/api/health
- API docs: http://localhost:3001/api/reference

Stop with `docker compose down`. Add `-v` to also remove the database and backup
volumes (`docker compose down -v`).

## Configuration

Defaults are defined in `docker-compose.yml`. To change them, copy the template and
edit it; Compose reads the root `.env` automatically:

```sh
cp .env.docker.example .env
docker compose up -d --build
```

Key points:

- `VITE_API_URL` is baked into the production web bundle at **build time**. Rebuild
  the web image (`docker compose up -d --build web`) after changing it.
- `WEB_ORIGIN` and `BETTER_AUTH_URL` must match the URLs the browser actually uses
  (especially when changing `WEB_PORT` / `API_PORT`).
- Set a random `BETTER_AUTH_SECRET` (32+ characters) for anything beyond local dev.
- URL-encode special characters in `POSTGRES_PASSWORD` before it is interpolated into
  `DATABASE_URL`.

## Development (hot reload)

```sh
make docker-dev
# or: docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This uses the `development` targets, bind-mounts the source, and runs the API with
watch mode. Both images still listen on container port 80 (web) and 3001 (API).

## Database helpers

```sh
# Apply migrations manually (they also run automatically on API start)
docker compose exec api bun run --cwd apps/api prisma migrate deploy

# Seed lookup data and the optional admin account
docker compose run --rm api bun run --cwd apps/api prisma:seed

# Prisma Studio (add a port mapping if needed)
docker compose run --rm --service-ports api bun run --cwd apps/api prisma:studio

# Restore a daily dump
docker compose exec -T db pg_restore --no-owner --no-acl --clean \
  -U admin -d jg_app < backup/2026-11-20.dump
```

Daily `pg_dump` files are written to the `backup-data` volume mounted at
`/app/backup` in the API container. Copy one out with:

```sh
docker compose cp api:/app/backup/2026-11-20.dump ./backup/2026-11-20.dump
```

## Troubleshooting

- **Port already in use:** set `API_PORT`, `WEB_PORT`, or `DB_PORT` in `.env`, and
  update `VITE_API_URL`, `WEB_ORIGIN`, and `BETTER_AUTH_URL` to match.
- **Web loads but API calls fail / CORS error:** confirm `VITE_API_URL` points at the
  host-reachable API URL and `WEB_ORIGIN` matches the web URL, then rebuild.
- **API exits during startup:** check `docker compose logs api`; the command runs
  `prisma migrate deploy` before starting the server, so migration errors are shown
  there.
