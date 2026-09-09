# SalesCore — Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 frontend for SalesCore.

See the [project root README](../README.md) for the full architecture overview,
setup instructions (Docker or native), environment variables, and demo credentials.

## Quick start (native, no Docker)

```bash
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 > .env.local
npm run dev
```

Requires the backend running separately (`../backend`) — see the root README.

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build (also type-checks)
- `npm run lint` — ESLint
