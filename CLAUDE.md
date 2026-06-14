# nestboard — Project Instructions

## Local dev

```
npm run dev     # full stack: starts Postgres, runs migrations, then api + dashboard
```

`npm run dev` brings up the DB (`db:up --wait`), applies migrations (`db:migrate`, idempotent),
then runs api + dashboard concurrently. DB-only helpers still available: `db:up`, `db:down`,
`db:reset`, `db:pull`.

## Reserved ports (never use these)

The following ports are in use by other services on this machine:

- `5433` / `5432`
- `31311`
- `6379`
- `4222`

## Architecture

- **API:** `api/` — Node/Express/Postgres, Railway deployment
- **Dashboard:** `apps/dashboard/` — React/Vite, Railway static deployment
- **API URL (prod):** `https://nestboard-production.up.railway.app`
- **Local API:** `http://localhost:3001`
- **Local dashboard:** `http://localhost:5173`
