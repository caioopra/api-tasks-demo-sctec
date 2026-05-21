# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-05-21

Adds authentication and the supporting infrastructure stubs (cache, queue,
db client) that bring the runtime shape in line with the architecture
diagram. `/tasks/*` is now protected and a new share endpoint exports a
snapshot for sharing. Persistence is still in-memory and the new
infrastructure pieces are deliberate stand-ins — same call-shape as the
real thing, no external services required to run the demo.

### Added

- `POST /auth/register` and `POST /auth/login` — both return
  `{ user: { id, email }, token }`. Token is a three-segment HS256 JWT
  signed with `JWT_SECRET`; login uses a single 401 message for unknown
  email and wrong password so the response does not reveal which failed.
- JWT bearer middleware protecting every `/tasks/*` route. Missing or
  malformed `Authorization` headers and invalid tokens are surfaced as
  `401` through the central error handler, in the canonical
  `{ error, status }` shape. Decoded user is attached to `req.user`
  (typed via a module augmentation on `Express.Request`).
- `POST /tasks/:id/share` — stateless snapshot export. Returns
  `{ task, shared_by: { email }, shared_at }`. Nothing is persisted; the
  cache is neither read nor written, so each call yields a fresh snapshot.
- Read-through cache on `GET /tasks/:id` with a 60s TTL. `PUT` and
  `DELETE` evict the entry so the next read re-populates from the db.
- Queue producer integration: `POST /tasks` publishes `task.created` on
  success, so downstream consumers (notifications, audit log, ...) have
  an event to react to.
- `docs/architecture.md` — Mermaid diagram of the runtime topology
  (Client → API → Auth, DB, Cache, Broker → Workers) with a colour legend.
- Project-local `/update-docs` Claude Code command that drives README,
  `openapi.json`, and `docs/architecture.md` updates from `git diff` output.

### Changed

- `/tasks/*` now requires `Authorization: Bearer <token>`; previously the
  resource was public. Existing callers must register/login first.
- `tasksDb` (`src/storage/tasksDb.ts`) is now a thin repository on top of
  the new `dbClient` seam — behaviour is unchanged from v0.1.0, but the
  "table" abstraction is now visible in the code (and in the architecture
  diagram). `id` and `created_at` are still preserved across updates.
- `env` schema adds `JWT_SECRET` (min 16 chars). A default is wired in
  only so the demo can boot with no `.env`; override in any real setting.
- `openapi.json` regenerated to include `/auth/*`, `/tasks/:id/share`, and
  the `bearerAuth` security scheme.

### Infrastructure stand-ins

These exist so the architecture arrows are real call sites in the code,
not promises in a diagram. Each one matches the call-shape of the
production component it stands in for and can be swapped without
touching the routes.

- `src/services/cache.service.ts` — Redis-shaped `get/set/del` with TTL,
  backed by a `Map`.
- `src/queue/producer.ts` — AMQP-shaped `publish(routingKey, payload)`,
  logs to stdout in dev, silent under `NODE_ENV=test`.
- `src/db/client.ts` — table-oriented
  `selectAll/findById/insert/update/delete` over `Map<table, Map<id, row>>`.
- `src/auth/auth.service.ts` — `hashPassword/verifyPassword/signToken/
  verifyToken`. Hash is salted SHA-256 (not bcrypt/argon2); JWT signing
  is HS256 with a static secret. Demo-only; see the limitations below.

### Tests

- Suite grew from 12 → 25, all passing:
  - New `tests/auth.test.ts` — register success, duplicate-email `409`,
    validation `400`, login success, wrong-password `401`, unknown-email
    `401` (same message), token round-trips on a protected route.
  - `tests/tasks.test.ts` extended to cover the new auth guard, the
    cache hit/eviction paths on `GET`/`PUT`/`DELETE`, the queue publish
    on `POST`, and the `/share` happy path + 404.

### Documentation

- `README.md` refreshed: auth flow, share endpoint, new env var.
- JSDoc added on every new module (auth service, JWT middleware, cache,
  queue, db client) so the OpenAPI registry, types, and prose stay in
  lockstep with the running code.

### Known limitations

- Storage, cache, queue, and "db" are all in-memory; restarting the
  process clears everything. Replacing each stub with its real counterpart
  is the planned next step.
- Auth is demo-grade: SHA-256 (not bcrypt/argon2), no token expiry, no
  refresh, no revocation, and `JWT_SECRET` ships with a default. Not
  suitable for any real deployment.
- Still no rate limiting, structured logging, request IDs, or metrics.
- Single-process only; concurrent writers are not coordinated beyond
  Node's event loop.

[0.2.0]: https://example.com/releases/v0.2.0

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
