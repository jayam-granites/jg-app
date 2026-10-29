.PHONY: dev dev-api dev-web build lint typecheck clean setup db-generate db-push db-migrate db-studio db-seed

dev:
	bun run dev

dev-api:
	bun run dev:api

dev-web:
	bun run dev:web

build:
	bun run build

lint:
	bun run lint

typecheck:
	bun run typecheck

clean:
	rm -rf apps/web/dist
	rm -rf apps/api/.wrangler
	rm -rf node_modules/.cache

setup:
	bun install
	bun run --cwd apps/api prisma:generate

# Prisma commands
db-generate:
	bun run --cwd apps/api prisma:generate

db-push:
	bun run --cwd apps/api prisma:push

db-migrate:
	bun run --cwd apps/api prisma:migrate

db-studio:
	bun run --cwd apps/api prisma:studio

db-seed:
	bun run --cwd apps/api prisma:seed
