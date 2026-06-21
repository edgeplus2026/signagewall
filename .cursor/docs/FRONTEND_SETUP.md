# Frontend Setup Guide

## Prerequisites

- Node.js 20+
- npm

## Quick start

```bash
cd edge-fe
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Environment variables

Create `edge-fe/.env` for local development (copy from `.env.example`). Do not commit `.env`.

| Variable | Description | Local default |
|----------|-------------|---------------|
| `VITE_API_URL` | Backend API base URL (must include `/api/v1`) | `http://localhost:3000/api/v1` |

If unset, axios falls back to `/api/v1` (same-origin proxy in production builds).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run type-check` | TypeScript validation only |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run format` / `format:check` | Prettier |

## Project structure

```
edge-fe/src/
├── components/
│   ├── layout/       # AppLayout, sidebar, org switcher
│   ├── ui/           # shadcn primitives
│   └── common/       # ErrorFallback, BlankPage
├── features/         # Feature-sliced domains
├── lib/              # axios, cn(), initials
├── providers/        # Theme, Query, AppProviders
├── router/           # Route definitions
├── i18n/             # Translations (en, sr)
├── config/           # Feature flags
└── styles/           # Tailwind + design tokens
```

## Path alias

`@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.json`).

## Connecting to the backend

1. Start backend: `cd edge-be && npm run start:dev` (MongoDB replica set required — see `BACKEND_SETUP.md`)
2. Set `VITE_API_URL=http://localhost:3000/api/v1` in `edge-fe/.env`
3. Register or log in at `/login`
4. Create an organization when prompted (`/create-organization`)

### Super-admin UI (optional)

Set `role: "super-admin"` on your user in MongoDB, then log out and back in. The **Super Admin** sidebar item appears at `/super-admin`.

### Member invites (local dev)

With `MAIL_ENABLED=false` on the backend, invite links are printed in the server console — copy them to test `/register?invite=` or `/accept-invite?invite=` flows.

## shadcn components

Config: `components.json` (style: `radix-nova`).

Add new primitives:

```bash
npx shadcn@latest add <component>
```

Keep generated files in `src/components/ui/`.
