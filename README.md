# Wellness 2.0 — monorepo

```
apps/
  wellness/            Wellness 2.0 — the Expo app we are building (build target)
  api/                 Fastify + TypeScript backend
  nutrition-fitness/   the shipped Nutrition + Fitness app (legacy, npm)
packages/
  db/                  Drizzle schema + migrations (source of truth for data)
  shared/              Zod contracts shared by API and app
  config/              shared tsconfig / lint presets
infra/                 docker-compose + Caddy — the whole backend, any host
design/                OpenPencil UI source (gym-coach-ui.fig)
gym_coach_app_product_plan/   product specs
```

## Why this stack

The goal was $0 now without a cliff later. The costs that actually scale on managed
platforms are **per-MAU auth** and **storage egress**, so we own exactly those:

| Concern | Choice | Why |
|---|---|---|
| Database | Postgres in Docker | The domain is relational (plans→days→exercises, meals→ingredients, revenue `SUM…GROUP BY`). Moving hosts is a `pg_dump`. |
| Auth | Own it — JWT + argon2 | Never pay per user. |
| Chat | Postgres + `ws` + Redis pub/sub | No second database, and chat rows join to users. |
| Media | Cloudflare R2 | 10 GB free and **zero egress fees** — the bill that kills photo apps. |
| Food data | Open Food Facts | Free, open, ships photo URLs, so we store links not images. |
| Push | Expo Push | Free. |
| Load balancing | Caddy across `api` replicas | `--scale api=3`; Docker DNS does the rest. No extra component. |

Hosting: an Oracle Cloud **Always Free** ARM box (4 vCPU / 24 GB) runs this
indefinitely for nothing. If ARM capacity is unavailable in your region, Hetzner is
~€4/mo for the same thing — the compose file is identical either way.

## Running the backend

```bash
cp infra/.env.example infra/.env     # fill POSTGRES_PASSWORD + JWT secrets
openssl rand -hex 48                 # for each JWT secret
pnpm infra:up                        # postgres + redis + api + caddy
pnpm db:migrate                      # apply packages/db/migrations
```

`pnpm db:generate` after any schema edit, then commit the generated SQL.

## Notes

- **`apps/nutrition-fitness` is deliberately outside the pnpm workspace.** It is a
  shipping app on npm + patch-package + EAS local builds; pulling it into the
  workspace changes `node_modules` layout and risks its release pipeline. It keeps
  its own `package-lock.json`, `.env.local`, `patches/` and `scripts/`. Run its
  commands from inside that directory.
- Expo in a monorepo needs the `metro.config.js` `watchFolders` /
  `nodeModulesPaths` tweaks — already applied in `apps/wellness`.
