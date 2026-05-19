# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-19

First tagged release. Establishes the HTTP surface, the validation and error
contract, and the surrounding tooling that subsequent feature work will build
on. Persistence is still in-memory and the deployment story is a single
`node dist/index.js` process — both intentionally minimal at this stage.

### Added

- HTTP server bootstrap on Express 4 with a TypeScript build target (`tsc`)
  and a `ts-node-dev` development loop (`npm run dev`).
- `GET /` health endpoint returning a static `{ status: 'ok' }` payload for
  liveness probes.
- `/tasks` resource with full CRUD:
  - `GET /tasks` — list all tasks.
  - `POST /tasks` — create. Server owns `id` (UUID v4) and `created_at`
    (ISO-8601, UTC).
  - `GET /tasks/:id` — fetch one.
  - `PUT /tasks/:id` — replace user-supplied fields; `id` and `created_at`
    are preserved by the storage layer.
  - `DELETE /tasks/:id` — remove; returns `204` with an empty body.
- `GET /tasks/search` — filters by `priority` (`low | med | high`) and/or
  case-insensitive `q` title substring. Filters compose with AND semantics.
- `GET /tasks/stats` — aggregate counts: `{ total, byPriority: { low, med, high } }`.
  Counters default to `0` so the response shape is stable for empty stores.
- Request validation with Zod (`title`, `priority`, query parameters);
  validation errors are surfaced as `400` through the central error handler.
- Centralized error middleware enforcing the project-wide response contract:
  every error — validation, not-found, unexpected — is serialized as
  `{ error: string, status: number }`. No raw strings, no HTML.
- In-memory storage backed by a `Map` (`src/storage/tasksDb.ts`), exposed
  behind a small `list/get/create/update/delete` seam so it can be swapped
  for a real database without touching the routes.
- Zod-validated environment loader (`src/config/env.ts`) for `PORT` and
  `NODE_ENV`. Parsed once at startup; misconfiguration fails fast instead
  of surfacing from deep inside a request handler.
- OpenAPI 3 specification derived from the Zod schemas via
  `@asteasolutions/zod-to-openapi`. Spec is generated to `openapi.json`
  (`npm run docs:gen`) and served interactively at `/docs` through
  `swagger-ui-express`.

### Tooling

- Jest test runner with the `ts-jest` preset; tests live under `tests/`.
- ESLint with `@typescript-eslint` for the `src/**/*.ts` glob; `npm run lint`
  and `npm run lint:fix` wired up.
- Strict TypeScript configuration (no implicit `any`); types are inferred
  from Zod schemas via `z.infer` rather than duplicated by hand.
- Project-local `/ship` Claude Code command capturing the test → commit →
  PR workflow used by contributors.

### Tests

- Supertest coverage of the `/tasks` surface (12 tests, all passing):
  - Happy-path CRUD and the full create → get → update → delete lifecycle.
  - `400` shape assertions on invalid input (empty `title`, invalid
    `priority` on `/search`).
  - `404` on unknown ids.
  - `/tasks/search` matrix: no-filter, by `priority`, by `q`, combined.
  - `/tasks/stats` empty-store and populated-store aggregation.

### Documentation

- `README.md` with setup, available scripts, endpoint reference, validation
  rules, error contract, and project conventions.
- JSDoc across every source module (routes, schemas, storage, middlewares,
  config, OpenAPI registry) — the spec, the types, and the prose stay in
  lockstep.
- `CLAUDE.md` recording the stack, Conventional Commits convention,
  branching scheme, error-shape rule, and the "tests must pass before
  commit" guard.

### Known limitations

- Storage is in-memory only; restarting the process clears all tasks.
  Replacing `tasksDb` with a real driver is the planned next step.
- No authentication, authorization, or rate limiting on any route.
- No structured logging, request IDs, or metrics export yet.
- Single-process only; concurrent writers are not coordinated beyond
  Node's event loop.

[0.1.0]: https://example.com/releases/v0.1.0
