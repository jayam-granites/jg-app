.PHONY: dev dev-api dev-web build lint typecheck clean setup db-generate db-push db-migrate db-studio db-seed docker-up docker-down docker-dev docker-logs docker-seed deploy deploy-api deploy-web

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

# Docker
docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

docker-logs:
	docker compose logs -f

docker-seed:
	docker compose run --rm api bun run --cwd apps/api prisma:seed

# Cloudflare Workers
deploy:
	bun run deploy

deploy-api:
	bun run deploy:api

deploy-web:
	bun run deploy:web
