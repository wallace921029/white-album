# white-album agent guide

## Overview

- This repository now has two projects:
	- the root app is a Vite 8 + React 19 + TypeScript 6 frontend
	- `backend/` is a Fastify 5 + TypeScript service (Drizzle ORM + better-sqlite3). Source in `backend/src/`, compiled to `backend/dist/`. See `backend/doc/api.md` for the API and the backend section of `CLAUDE.md` for architecture.
- `README.md` is still the stock Vite template. Use the source files and package scripts as the authoritative project context.

## Commands

- Frontend install: `npm install`
- Frontend dev server: `npm run dev`
- Frontend build: `npm run build`
- Frontend lint: `npm run lint`
- Frontend preview: `npm run preview`
- Backend install: `cd backend && npm install`
- Backend dev server: `cd backend && npm run dev` (tsc watch + fastify watch)
- Backend build / typecheck: `cd backend && npm run build` / `npm run typecheck`
- Backend production start: `cd backend && npm start`
- Backend tests: `cd backend && npm test`
- Backend DB migration after editing `src/db/schema.ts`: `cd backend && npm run db:generate` (applied on boot)

## Project structure

- `src/main.tsx` mounts the app with `StrictMode`.
- `src/App.tsx` is the current top-level feature surface.
- `src/index.css` defines the global tokens and base typography.
- `src/App.css` contains component-level layout and styling for the landing page.
- `src/components/ui/` contains the full shadcn/ui component set.
- `src/lib/utils.ts` provides the shared `cn()` helper used by generated components.
- `src/hooks/use-mobile.ts` is used by the generated sidebar component.
- `public/` contains static assets served directly by Vite.
- `backend/src/app.ts` is the Fastify entry point; `backend/src/routes/` and `backend/src/plugins/` follow the standard Fastify CLI layout (autoloaded).
- `backend/src/db/schema.ts` is the Drizzle schema (single source of truth for tables and types); generated migrations live in `backend/drizzle/`.

## Conventions that matter

- Keep changes minimal and consistent with the existing Vite/React template style: functional components, no semicolons, single quotes, and simple local state.
- TypeScript is strict enough to reject unused locals and parameters. Remove dead code instead of leaving placeholders.
- The frontend uses Tailwind CSS v4 through `@tailwindcss/vite` and imports Tailwind in `src/index.css`.
- The frontend also uses shadcn/ui with the `radix-nova` style and `@/*` path aliases. Reuse existing components from `src/components/ui/` before creating new ones.
- CSS uses native nesting in `.css` files. Preserve that style instead of converting files to a different styling system unless requested.
- Asset imports in `src/` are handled through Vite modules. Use imports for bundled assets and `public/` only for directly served files.
- `axios` is installed in both frontend and backend projects.
- There is no frontend routing setup, state library, or test framework. Do not introduce one for small changes unless the task requires it.

## Validation guidance

- Prefer `npm run build` after meaningful code changes because it runs TypeScript build mode before Vite bundling.
- Use `npm run lint` as a secondary check.
- Use `cd backend && npm test` after backend changes.
- If a task only changes documentation or agent customization files, validation can be limited to a quick file review or diff.

## Working rules for agents

- Start from the relevant file in `src/` instead of exploring broadly.
- Reuse the existing CSS variables in `src/index.css` before adding new tokens.
- Prefer existing shadcn/ui components and helpers over introducing parallel primitives.
- Backend work should stay within the existing Fastify CLI structure unless the task explicitly calls for a larger reorganization.