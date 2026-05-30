# Hearthboard — Project Instructions

## Local dev

```
npm run db:up   # start Postgres Docker container
npm run dev     # runs api + dashboard concurrently
```

## Reserved ports (never use these)

The following ports are in use by other services on this machine:

- `5433` / `5432`
- `31311`
- `6379`
- `4222`

## Architecture

- **API:** `api/` — Node/Express/Postgres, Railway deployment
- **Dashboard:** `apps/dashboard/` — React/Vite, Railway static deployment
- **API URL (prod):** `https://hearthboard-production.up.railway.app`
- **Local API:** `http://localhost:3001`
- **Local dashboard:** `http://localhost:5173`
