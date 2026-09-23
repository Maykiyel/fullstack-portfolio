# Better Auth with Fastify — research findings

Resolves [#8](https://github.com/Maykiyel/fullstack-portfolio/issues/8).

Research only. **No application code was written.** Every code block below is quoted
from a primary source or is an illustrative sketch of a pattern that a primary source
describes — none of it has been run against this repository.

## How to read this document

Every claim is tagged:

- **[VERIFIED]** — read directly in Better Auth / Fastify primary documentation or in
  the published source of the exact version named, with the URL given.
- **[ASSUMPTION]** — a reasonable inference that the documentation does not state. Not
  yet proven. Treat as a thing to check during implementation, not as a fact.
- **[UNVERIFIED]** — something the ticket asks about that the primary docs do not
  answer at all. Stated plainly rather than guessed at.

Primary sources are pinned to the `v1.7.5` and `v5.12.5` git tags rather than the live
docs site, so the citations keep meaning as the projects move on. The live doc URL is
given alongside where it exists.

## Versions this research is against

Verified from `apps/api/package.json`, `apps/web/package.json`, `pnpm-lock.yaml` and
`compose.yaml` on `main` at the time of writing.

| Thing | Version present in this repo | Note |
| --- | --- | --- |
| `fastify` | `5.12.5` (lockfile) | |
| `@fastify/cors` | `11.3.0` (lockfile) | latest is also `11.3.0` |
| `@fastify/env` | `^7.0.0` | |
| `drizzle-orm` | `1.0.0-rc.4` (lockfile) | release candidate, not stable 1.0 |
| `drizzle-kit` | `1.0.0-rc.4` (lockfile) | |
| `pg` | `8.23.0` | |
| PostgreSQL | `postgres:18` (`compose.yaml`) | |
| `react` / `react-dom` | `19.3.0` (lockfile) | |
| `react-router` | **`8.4.0`** (lockfile) | **8**, not 7 — see §5 |
| `@tanstack/react-query` | `^5.103.1` | |
| `axios` | `1.20.0` (lockfile) | |
| `vite` | `8.3.0` (lockfile) | |
| `typescript` | `7.0.2` (api, root), `6.0.3` (web) | |
| `better-auth` | **not installed** | latest published is `1.7.5` |

**[VERIFIED] Better Auth is not yet a dependency of this repository.** `pnpm-lock.yaml`
contains no `better-auth` entry, and `apps/api/src/index.ts` is a bare Fastify server
with a single `/api/v1/health` route. Everything below is greenfield.

**[VERIFIED] Better Auth `1.7.5` is the current `latest` on npm** (published
2026‑09‑14; npm registry `dist-tags`: `latest: 1.7.5`, with maintenance line
`release-1.6: 1.6.33`).

### Peer-dependency compatibility with what is installed

**[VERIFIED]** `better-auth@1.7.5` declares these peers (npm registry metadata for
`better-auth@1.7.5`):

- `drizzle-orm`: `^0.45.2 || >=1.0.0-rc.1 <2.0.0` → `1.0.0-rc.4` **satisfies**.
- `drizzle-kit`: `>=0.31.4 || >=1.0.0-beta.1` → `1.0.0-rc.4` **satisfies**.
- `react`: `^18.0.0 || ^19.0.0` → `19.3.0` **satisfies**.
- `pg`: `^8.0.0` → `8.23.0` **satisfies**.

`@better-auth/drizzle-adapter@1.7.5` declares `drizzle-orm: ^0.45.2 || >=1.0.0-rc.1
<2.0.0` as an **optional** peer.

**[ASSUMPTION]** Because Drizzle 1.0 is still a release candidate, "the range accepts
it" is not the same as "it is tested against it". Expect the Drizzle Relations v2 path
(`@better-auth/drizzle-adapter/relations-v2`) to be the relevant one for `drizzle-orm@1.x`,
and expect some friction. Not verified — nothing in the Better Auth docs names an rc
version explicitly.

### Baseline documents respected

- `docs/adr/0006-cookie-based-authentication.md` — HTTP-only cookie sessions via
  established auth infrastructure. Nothing below re-opens that.
- `docs/spec/portfolio-v3-implementation.md` — Better Auth, cookie sessions, public
  registration disabled, one seeded administrator, simple role model with room to grow,
  `/api/v1/admin/*` protected tree, separate web/API hosts initially with same-origin
  `/api` as the eventual preferred shape.
- `docs/development.md` — the authenticated session is a prerequisite for slice 1.
- `CONTEXT.md` — **User** is the domain term; *Admin* is avoided for the person.
- Per the ticket: the `users` table in `apps/api/src/db/schema.ts` and its migration
  `apps/api/drizzle/20260922044227_ordinary_captain_marvel/` are **disposable
  scaffolding**. This document does not attempt to reconcile Better Auth against them.

---

## 1. Mounting the handler in Fastify

### There is no first-party Fastify adapter

**[VERIFIED]** Better Auth ships framework helpers for Next.js, SvelteKit, SolidStart,
TanStack Start, Node (`better-auth/node`), Lynx and Expo (the package's `exports` map in
`better-auth@1.7.5`). There is **no** `./fastify` export and **no** `@better-auth/fastify`
package on npm (registry returns nothing for that name). The Fastify integration is a
documentation page describing manual wiring, not an adapter.

**[VERIFIED]** A community package `fastify-better-auth` exists (`1.2.0`, published
2025‑09‑10, peers `better-auth: 1.x` / `fastify: 5.x`,
<https://github.com/flaviodelgrosso/fastify-better-auth>). It is **not** maintained by
the Better Auth team and is not referenced from Better Auth's own docs. Useful as a
worked example; adopting it is a dependency decision, not a documented path.

### What the official docs actually say

**[VERIFIED]** `docs/content/docs/integrations/fastify.mdx` at tag `v1.7.5`
(<https://raw.githubusercontent.com/better-auth/better-auth/v1.7.5/docs/content/docs/integrations/fastify.mdx>,
live: <https://www.better-auth.com/docs/integrations/fastify>) documents a catch-all
route that **re-builds a Web `Request` from Fastify's already-parsed body**:

```ts
fastify.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const headers = fromNodeHeaders(request.headers);
    const req = new Request(url.toString(), {
      method: request.method,
      headers,
      ...(request.body ? { body: JSON.stringify(request.body) } : {}),
    });
    const response = await auth.handler(req);
    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    return reply.send(response.body ? await response.text() : null);
  }
});
```

**[VERIFIED] The Fastify page never mentions body parsing, `addContentTypeParser`,
`removeContentTypeParser`, or `reply.hijack()`.** Its answer to the raw-body problem is
to let Fastify parse and then re-serialize with `JSON.stringify`.

**[VERIFIED] The Express page says the opposite thing**, and says it as a warning —
`docs/content/docs/integrations/express.mdx` at `v1.7.5`:

> Mount the Better Auth handler before body-parsing middleware such as `express.json()`.
> Body parsers consume the incoming request stream before passing control to the next
> handler.

So Better Auth's own position is: for Express, keep the stream raw; for Fastify, the
docs settle for re-serialization instead.

### So: must Fastify body parsing be disabled? — the real answer

**[VERIFIED] It is not strictly required, and the documented snippet works for the
JSON email/password flows — but it is lossy, and the loss is invisible.** Three failure
modes, each traced to source:

**(a) Non-JSON content types are rejected before the handler runs.** Fastify natively
supports only `application/json` and `text/plain`; anything else raises
`FST_ERR_CTP_INVALID_MEDIA_TYPE` (`docs/Reference/ContentTypeParser.md` and
`docs/Reference/Errors.md` at `fastify@v5.12.5`; confirmed in `lib/handle-request.js`,
which replies `415` on an invalid media type *before* the route handler is reached).
Better Auth's own security page states that some routes deliberately accept
`application/x-www-form-urlencoded`:

> Some routes intentionally accept `application/x-www-form-urlencoded` requests for
> progressive enhancement or protocol interoperability, including sign-in/sign-up email
> flows and some callback/token-style endpoints.
> — `docs/content/docs/reference/security.mdx` @ `v1.7.5`

With the documented Fastify snippet and no extra parser, those requests 415 at the
Fastify layer and Better Auth never sees them.

**(b) Empty-bodied POSTs.** Fastify raises `FST_ERR_CTP_EMPTY_JSON_BODY` /
`FST_ERR_CTP_INVALID_JSON_BODY` when `content-type: application/json` is set with an
empty body (`docs/Reference/Errors.md` @ `v5.12.5`). **[VERIFIED]** this particular
case does *not* bite for `/sign-out`: `@better-fetch/fetch@1.3.2` (`dist/index.js`,
`isJSONSerializable`/`detectContentType`/`getBody`) omits the `content-type` header
entirely when there is no body, and Fastify's `lib/handle-request.js` @ `v5.12.5` has an
explicit branch — no `content-type` + no `content-length`/`transfer-encoding` ⇒ *skip
parsing and call the handler*, leaving `request.body === undefined`, which the snippet's
`...(request.body ? … : {})` handles. **[ASSUMPTION]** any *other* HTTP client (curl,
Axios configured with a JSON default `Content-Type`, a test helper) that sends
`Content-Type: application/json` with no body against an auth route will get a Fastify
`400` that never reaches Better Auth. Worth a test.

**(c) Stale `content-length`.** `fromNodeHeaders` copies **every** Node header verbatim
into the `Headers` object — including `host`, `connection` and `content-length`
(source: `packages/better-auth/src/integrations/node.ts` @ `v1.7.5`). `JSON.stringify`
of a parsed body is not guaranteed to be byte-identical to the original payload.
**[UNVERIFIED]** whether Node/undici strips or honours a forbidden request header such
as `content-length` on a `new Request(...)` with a stream body. The Fetch spec treats
`Content-Length` as a forbidden request header; undici has historically been permissive.
Not verified either way — flagging it as the kind of thing that produces an opaque
failure, which is exactly what this ticket exists to pre-empt.

### The alternative: bypass parsing in an encapsulated scope, then use `toNodeHandler`

**[VERIFIED]** `better-auth/node` exports `toNodeHandler(auth)`, which returns a
`(req, res)` Node handler (`packages/better-auth/src/integrations/node.ts` @ `v1.7.5`,
delegating to `better-call/node`).

**[VERIFIED]** `better-call@1.4.0`'s `getRequest` (`dist/adapters/node/request.mjs`) is
explicitly written to cope with a consumed stream:

```js
if (canReadRawBody(request)) body = get_raw_body(request, bodySizeLimit);
else if (maybeConsumedReq.body !== void 0) {
  const parsedBody = maybeConsumedReq.body;
  const bodyContent = serializeParsedBody(parsedBody, isFormUrlEncoded);
  …
}
```

**[VERIFIED] — and this is the trap.** That fallback reads `body` off the *Node
`IncomingMessage`*. Express assigns `req.body` onto the `IncomingMessage` itself, so the
fallback fires. **Fastify assigns `request.body` onto the Fastify `Request` wrapper, not
onto `request.raw`.** So `toNodeHandler(auth)(request.raw, reply.raw)` *after* Fastify
has parsed the body finds `request.raw.body === undefined` **and** a fully-consumed
stream — and silently sends an empty body to Better Auth. That is the "raw-body
mismatch" the ticket anticipated, and it fails quietly as a validation error, not a
crash.

**[VERIFIED]** Therefore, if `toNodeHandler` is used, Fastify parsing **must** be
bypassed on the auth routes. Fastify supports this cleanly, and — crucially — with
encapsulation:

> As with other APIs, `addContentTypeParser` is encapsulated in the scope in which it is
> declared. If declared in the root scope, it is available everywhere; if declared in a
> plugin, it is available only in that scope and its children.
> — `docs/Reference/ContentTypeParser.md` @ `fastify@v5.12.5`

and `removeAllContentTypeParsers` "supports encapsulation and is useful for registering
a catch-all content type parser" (same file). So a child plugin can neutralise parsing
for `/api/auth/*` **without** touching the rest of the API.

**[VERIFIED]** The community plugin does exactly this shape
(`flaviodelgrosso/fastify-better-auth`, `src/index.ts`): `fastify.register(…)` child
scope → no-op `application/json` parser → `fastify.all(`${basePath}/*`)` →
`reply.raw.setHeaders(mapHeaders(reply.getHeaders()))` → `await authHandler(request.raw,
reply.raw)`.

Note the `reply.raw.setHeaders(...)` line: headers set on the Fastify `reply` (by
`@fastify/cors`, for instance) are **not** automatically present on `reply.raw`, so they
must be copied across before the Node handler writes the response. **[ASSUMPTION]** this
is the reason that line exists; the package has no comment explaining it. It is a real
consideration either way.

**[VERIFIED]** Fastify's documented way to write to `reply.raw` is `reply.hijack()`:

> `reply.hijack()` … allows you to prevent Fastify from sending the response, and from
> running the remaining hooks (and user handler if the reply was hijacked before).
> … If `reply.raw` is used to send a response back to the user, the `onResponse` hooks
> will still be executed.
> — `docs/Reference/Reply.md` @ `v5.12.5`

**[VERIFIED]** The community plugin does *not* call `hijack()`, and gets away with it
because of `lib/wrap-thenable.js` @ `v5.12.5`: when an async handler resolves
`undefined`, Fastify only calls `reply.send()` if `reply.raw.headersSent === false`.
Since the Node handler has already written headers, Fastify does nothing.
**[ASSUMPTION]** `reply.hijack()` is still the safer choice because it removes the race
entirely and stops later hooks from trying to touch a response that is already being
written. The docs recommend `hijack()` for this situation; they do not forbid the
other.

### Recommendation for this repo

**[ASSUMPTION — a judgement call, not a documented rule.]** Two defensible options:

1. **Documented catch-all + `JSON.stringify`** — the path Better Auth publishes for
   Fastify. Fewest moving parts. Accept (a)/(b)/(c) above; add
   `addContentTypeParser('application/x-www-form-urlencoded', …)` *inside the auth
   plugin scope* if the form-encoded routes are ever needed.
2. **Encapsulated plugin + no-op parser + `toNodeHandler` + `reply.hijack()`** — closer
   to how Better Auth wants to be fed (a genuine raw stream), streams correctly,
   supports every content type Better Auth accepts, and keeps the bypass scoped so the
   rest of `/api/v1/*` retains normal Fastify validation and parsing. Slightly more code
   and it leans on Fastify mechanics rather than a Better Auth doc.

Option 2 is the better fit for a project whose spec calls for an encapsulated
`/api/v1/admin` tree anyway — but it is **not** what Better Auth's Fastify page shows,
and that divergence should be a conscious choice.

### Base path

**[VERIFIED]** Better Auth's `basePath` defaults to `/api/auth`
(`docs/content/docs/reference/options.mdx` @ `v1.7.5`, and confirmed as the fallback in
`packages/better-auth/src/client/config.ts`). This repo's API is versioned under
`/api/v1/*`. Setting `basePath: "/api/v1/auth"` (and the matching `baseURL`) keeps auth
inside the versioned tree; leaving the default puts auth routes outside it. Either
works; it is a naming decision, not a technical constraint. **[ASSUMPTION]** matching
`/api/v1/auth` is more consistent with `docs/spec/portfolio-v3-implementation.md`.

---

## 2. Route protection and where the admin guard belongs

### Reading a session

**[VERIFIED]** The Fastify page documents exactly one idiom
(`docs/content/docs/integrations/fastify.mdx` @ `v1.7.5`):

```ts
import { fromNodeHeaders } from "better-auth/node";

fastify.get("/api/me", async (request, reply) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  return reply.send(session);
});
```

**[VERIFIED]** `auth.api.*` is the documented server-side surface — "Unlike the client,
the server needs the values to be passed as an object with the key `body` for the body,
`headers` for the headers, and `query` for query parameters"
(`docs/content/docs/concepts/api.mdx` @ `v1.7.5`).

**[VERIFIED]** Server-side `auth.api` calls are **not** rate limited: "Server-side
requests made using `auth.api` aren't affected by rate limiting"
(`docs/content/docs/concepts/rate-limit.mdx` @ `v1.7.5`). So a `getSession` call in a
hook on every admin request is not competing with the client's rate-limit budget.

**[VERIFIED]** By default every `getSession` hits the database. Session cookie caching
(`session.cookieCache: { enabled: true, maxAge }`) lets the server validate from a
signed cookie instead, at the cost of revocation latency up to `maxAge`
(`docs/content/docs/concepts/session-management.mdx` @ `v1.7.5`, "Cookie Cache").
`disableCookieCache: true` can be passed for sensitive operations.

**[ASSUMPTION]** For a single-owner portfolio admin, cookie cache is an optimisation
that is not needed on day one and adds a revocation caveat. Start without it.

### Where the guard belongs

**[VERIFIED]** Better Auth's documentation says nothing about Fastify hooks, plugins or
decorators. That question is answered entirely by Fastify's own docs.

**[VERIFIED]** Fastify's lifecycle is
`onRequest → preParsing → Parsing → preValidation → Validation → preHandler → handler`
(`docs/Reference/Lifecycle.md` @ `v5.12.5`). Hooks "are affected by Fastify's
encapsulation, and can thus be applied to selected routes"
(`docs/Reference/Hooks.md` @ `v5.12.5`).

**[VERIFIED]** Fastify's own encapsulation documentation uses *this exact scenario* as
its worked example: "a basic scenario of a REST API server with three routes: the first
route (`/one`) requires authentication, the second route (`/two`) does not…", implemented
as `fastify.register(async function authenticatedContext (childServer) { … })`
(`docs/Reference/Encapsulation.md` @ `v5.12.5`).

**[VERIFIED]** `decorateRequest` + a hook that populates it is the documented pattern
for attaching per-request data, with the caveat that the decorator must be initialised
with a value type (`''` for strings, `null` for objects) — reference types throw at
startup (`docs/Reference/Decorators.md` @ `v5.12.5`).

So, answering the ticket's three candidates — **it is not either/or; the idiomatic
Fastify answer uses all three together**:

- **Encapsulated plugin over `/api/v1/admin`** — the container. Fastify's own docs
  present this as *the* way to scope authentication to a route subtree, and it means a
  new admin route is protected by virtue of where it is registered rather than by
  remembering to add a hook.
- **`preHandler` hook inside that plugin** — the guard itself, running for every route
  in the scope and no others.
- **`decorateRequest('user', null)` (or a `session` decorator)** — how the resolved
  session reaches the handlers, declared in the same scope.

**[ASSUMPTION] `onRequest` vs `preHandler`:** `onRequest` runs before body parsing, so
rejecting an unauthenticated request there avoids parsing a body that will be thrown
away. `preHandler` runs after validation, so it composes with route schemas and is where
Fastify's own examples put auth. Either is correct. `preHandler` is the more
conventional choice and is what `@fastify/auth`-style ecosystem plugins use; `onRequest`
is the micro-optimisation. Nothing in the docs mandates one.

**[VERIFIED] The admin plugin's own guard does not protect your routes.** Better Auth's
`adminMiddleware` and `hasPermission` checks apply to Better Auth's own
`/admin/*` endpoints (`packages/better-auth/src/plugins/admin/routes.ts` @ `v1.7.5`).
Protecting `/api/v1/admin/projects` is entirely the project's own code. Better Auth can
be *asked* whether a role has a permission (§7), but it does not guard application
routes.

---

## 3. The Drizzle schema Better Auth requires

### Tables it owns

**[VERIFIED]** `docs/content/docs/concepts/database.mdx` @ `v1.7.5` — "Core Schema:
Better Auth requires the following tables to be present in the database."

| Table | Columns |
| --- | --- |
| `user` | `id` (PK), `name`, `email` (unique), `emailVerified` (bool), `image` (opt), `createdAt`, `updatedAt` |
| `session` | `id` (PK), `userId` (FK → `user.id`, indexed, `onDelete: cascade`), `token` (unique), `expiresAt`, `ipAddress` (opt), `userAgent` (opt), `createdAt`, `updatedAt` |
| `account` | `id` (PK), `userId` (FK → `user.id`, indexed, cascade), `accountId`, `providerId`, `accessToken` (opt), `refreshToken` (opt), `accessTokenExpiresAt` (opt), `refreshTokenExpiresAt` (opt), `scope` (opt), `idToken` (opt), `password` (opt), `createdAt`, `updatedAt` |
| `verification` | `id` (PK), `identifier` (indexed), `value`, `expiresAt`, `createdAt`, `updatedAt` |

**[VERIFIED]** Email/password credentials live in `account`, not `user`: "Credential
accounts use the `credential` provider ID and the linked user's stable `id` as
`accountId`", and `account.password` is "mainly used for email and password
authentication" (same doc). Confirmed in
`packages/better-auth/src/plugins/admin/routes.ts` @ `v1.7.5`, which on user creation
calls `ctx.context.password.hash(...)` then `internalAdapter.linkAccount({ providerId:
"credential", accountId: user.id, password: hashedPassword, userId: user.id })`.

**[VERIFIED]** The **admin plugin** adds, per
`docs/content/docs/plugins/admin.mdx` @ `v1.7.5`:
- to `user`: `role` (string, optional), `banned` (bool, optional), `banReason` (string,
  optional), `banExpires` (date, optional);
- to `session`: `impersonatedBy` (string, optional).

**[VERIFIED]** `rateLimit` storage is **in memory by default**; only
`rateLimit.storage: "database"` adds a `rateLimit` table
(`docs/content/docs/concepts/rate-limit.mdx` @ `v1.7.5`). Not required.

### How the schema is declared

**[VERIFIED]** Install `@better-auth/drizzle-adapter` and pass
`drizzleAdapter(db, { provider: "pg" })`
(`docs/content/docs/adapters/drizzle.mdx` @ `v1.7.5`). `better-auth/adapters/drizzle`
also exists in the package's `exports` map; the docs point at the standalone package.

**[VERIFIED]** The CLI generates the Drizzle schema:

```
npx auth@latest generate
```

The npm package is literally named **`auth`** (`auth@1.7.5`, repository directory
`packages/cli` of `better-auth/better-auth`), superseding the older
`@better-auth/cli` (stalled at `1.4.21`).

**[VERIFIED]** Default output path is **`./auth-schema.ts`** in the project root
(`packages/cli/src/generators/drizzle.ts` @ `v1.7.5`: `const filePath = file ||
"./auth-schema.ts"`), overridable with `--output`. The generator sets `overwrite: true`
when the file already exists — so the generated file is a **derived artifact that gets
regenerated**, and must not be hand-edited.

**[VERIFIED]** Generation does not need a live database for Drizzle:
`npx auth@latest generate --adapter drizzle --dialect postgresql` (Drizzle maps
`postgresql` → `pg`); the CLI still loads the config so plugins and customisations are
included (`docs/content/docs/concepts/cli.mdx` @ `v1.7.5`).

**[VERIFIED]** Writing the tables by hand instead is explicitly sanctioned: "If you
prefer adding tables manually, you can do that as well. The core schema required by
Better Auth is described below" (`concepts/database.mdx` @ `v1.7.5`).

**[VERIFIED]** For `drizzle-orm@1.x` Relations v2, the docs direct you to
`@better-auth/drizzle-adapter/relations-v2` and to merge `authRelations` after the app's
own relations in the `drizzle()` call. "You do not need to run database migrations when
upgrading to Relations v2. The database structure remains the same"
(`adapters/drizzle.mdx` @ `v1.7.5`).

### Migrations — how they coexist

**[VERIFIED] Better Auth does not run migrations for Drizzle projects.** `npx auth
migrate` works **only** with the built-in Kysely adapter; and `getMigrations` from
`better-auth/db/migration` carries an explicit warning: "It does **not** work with Prisma
or Drizzle ORM adapters — use CLI migrations with those ORMs instead"
(`concepts/database.mdx` @ `v1.7.5`).

**[VERIFIED] There is therefore no second migration history and no collision to
manage.** The documented loop is (`adapters/drizzle.mdx` @ `v1.7.5`):

```
npx auth@latest generate   # writes/refreshes the Drizzle schema TS file
npx drizzle-kit generate   # diffs it into a normal migration
npx drizzle-kit migrate    # applies it
```

Better Auth contributes **schema source**; `drizzle-kit` owns the single migration
history. This repo's existing `db:generate` / `db:migrate` scripts in
`apps/api/package.json` already are that history — nothing extra is needed.

**[VERIFIED]** Better Auth validates the schema at runtime and reports mismatches
through the configured logger, "enabled by default, including in production". For
Drizzle it "checks the configured schema object … without querying the database", so it
"cannot detect migrations that were not applied to the database"
(`concepts/database.mdx` @ `v1.7.5`, "Schema Validation"). Useful: a forgotten
`auth generate` is caught at boot, a forgotten `drizzle-kit migrate` is not.

**[ASSUMPTION — a practical arrangement, not a documented one.]** Point
`--output` at something like `apps/api/src/db/auth-schema.ts`, keep the project's own
tables in `apps/api/src/db/schema.ts`, and re-export both from a barrel that
`drizzle.config.ts` points at (`schema` accepts a glob/array in drizzle-kit). This keeps
the regenerated file physically separate from hand-written domain tables so a
regeneration can never clobber Project/Media/Inquiry definitions. Not prescribed by
either project's docs — it is just hygiene.

### Interaction with this repo's UUIDv7 convention

**[VERIFIED]** `docs/spec/portfolio-v3-implementation.md` asks for UUIDv7/ULID IDs, and
the scaffolding `users` table uses `default(sql`uuidv7()`)` (PostgreSQL 18 provides
`uuidv7()`). Better Auth's `advanced.database.generateId` accepts
(`concepts/database.mdx` @ `v1.7.5`):

- `false` — **the database generates all IDs** (so a column default of `uuidv7()` wins);
- `"uuid"` — UUID type in the generated schema; "except adapters that use `PostgreSQL`
  where we allow the database to generate the UUID automatically";
- `"serial"`;
- a function, which may return `false`/`undefined` per model to defer to the database.

So `generateId: false` plus `uuidv7()` column defaults is supported, and the CLI will
emit a `uuid` id type under `"uuid"`. **[ASSUMPTION]** `generateId: false` with
`uuidv7()` defaults is the cleanest fit for this project's stated convention — but
whether the CLI's generated Drizzle schema emits a `uuid` column *with* a database
default (rather than a bare `uuid` PK expecting an inserted value) was **not verified**;
the generated file may need the default added, which conflicts with it being
regenerated. Check this early — it is cheap to check and annoying to discover late.

---

## 4. Cross-origin cookie behaviour

### Local development: Vite dev server + Fastify on a separate port

`apps/web` runs on Vite's dev server (default `http://localhost:5173`), `apps/api` on
`http://localhost:3000` (`apps/api/src/index.ts`). Different ports ⇒ **different
origins** ⇒ cross-origin requests with credentials.

**[VERIFIED] `trustedOrigins`** — Better Auth rejects cross-origin requests by default:
"When a request is made from a different origin, the request will be blocked by default.
You can add trusted origins to the `auth` instance"
(`integrations/fastify.mdx` @ `v1.7.5`). The security reference explains why: "Each
request's `Origin` header is verified… Requests from untrusted origins are rejected"
(`reference/security.mdx` @ `v1.7.5`). So `trustedOrigins: ["http://localhost:5173"]` is
**required** in dev.

**[VERIFIED] `sameSite`** — "Session cookies use the `SameSite=Lax` attribute by
default" (`reference/security.mdx` @ `v1.7.5`), overridable via
`advanced.defaultCookieAttributes` (`reference/options.mdx` @ `v1.7.5`).

**[VERIFIED] `secure`** — "All cookies are `httpOnly` and `secure` when the server is
running in production mode" (`concepts/cookies.mdx` @ `v1.7.5`).
`advanced.useSecureCookies: true` forces `Secure` in all environments. Note that
`Secure` cookies are **not** sent over plain `http://` — which matters only if someone
force-enables it locally.

**[ASSUMPTION — important, and not stated by the docs.]** `SameSite=Lax` is **not sent
on cross-site XHR/fetch**. `http://localhost:5173` and `http://localhost:3000` are
different *origins* but the same *site* (registrable domain `localhost`), so the browser
treats them as **same-site** and `Lax` cookies are sent. That is why the two-port local
setup usually "just works" with `Lax`. The moment production puts web and API on
different registrable domains, `Lax` stops working and `SameSite=None; Secure` becomes
mandatory. Better Auth's docs do not spell this out; it follows from the cookie spec.
**Verify empirically in a browser before relying on it.**

**[VERIFIED] CORS** — register `@fastify/cors` with `credentials: true`
(`integrations/fastify.mdx` @ `v1.7.5` shows exactly this). Two concrete traps, both
from `@fastify/cors@v11.3.0`'s README:

- **`origin` defaults to `*`** ("The special `*` value (default) allows any origin").
  `Access-Control-Allow-Origin: *` is **incompatible with credentialed requests** — the
  browser rejects the response. `origin` must be the explicit web origin (or `true` to
  reflect the request origin).
- `@fastify/cors` runs on the **`onRequest`** hook by default, so preflights are handled
  before routing/parsing — which is what you want for the auth catch-all.

**[VERIFIED]** The docs' sample CORS config lists `allowedHeaders: ["Content-Type",
"Authorization", "X-Requested-With"]`. `@fastify/cors` otherwise reflects
`Access-Control-Request-Headers`, so an over-narrow explicit list can break a request
that sends a header you forgot.

**[ASSUMPTION]** If cookies prove awkward in dev, Vite's `server.proxy` can put the API
behind the web origin (`/api` → `http://localhost:3000`), making everything same-origin
and removing CORS and `SameSite` from the dev picture entirely. The repo's
`apps/web/vite.config.ts` currently has **no** proxy configured. This mirrors the
production shape the spec says is eventually preferred, which is an argument for doing it
now. Not a Better Auth recommendation — a project-level choice.

### Production

**[VERIFIED] Same-origin `/api`** — the arrangement `docs/spec/portfolio-v3-implementation.md`
calls "the eventual preferred browser architecture". Better Auth's cookies doc endorses
exactly this as the fix for the hardest case:

> Instead of calling your API directly, you can proxy it through the same domain as your
> frontend… This makes the request appear first-party to Safari, allowing cookies to
> function correctly.
> — `concepts/cookies.mdx` @ `v1.7.5`

With same-origin, `SameSite=Lax` + `Secure` + `httpOnly` suffice, CORS is unnecessary,
and `trustedOrigins` collapses to the single site origin.

**[VERIFIED] Separate subdomains** (`app.example.com` / `api.example.com`) — supported,
via `advanced.crossSubDomainCookies: { enabled: true, domain: "example.com" }` plus
`trustedOrigins` listing each origin (`concepts/cookies.mdx` @ `v1.7.5`). The doc
carries a security warning: "Only enable cross-subdomain cookies if it's necessary… Set
the domain to the most specific scope needed… Be cautious of untrusted subdomains that
could potentially access these cookies."

**[VERIFIED] Genuinely different domains** — Safari ITP blocks them: "If your Better
Auth API is hosted on a different domain than your frontend, Safari may block
authentication cookies entirely… sessions not persisting, `Set-Cookie` being ignored,
users appearing logged out after login or auth working in Chrome but failing in Safari."
The two sanctioned fixes are a reverse proxy or a shared parent domain
(`concepts/cookies.mdx` @ `v1.7.5`). **There is no cookie-attribute workaround.**

**[VERIFIED]** `baseURL`/`BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` (≥32 chars, high
entropy; `openssl rand -base64 32`) are the required environment inputs
(`installation.mdx` @ `v1.7.5`). `BETTER_AUTH_SECRETS` (plural) exists for
non-destructive rotation (`reference/security.mdx` @ `v1.7.5`). These belong in the
repo's startup config validation per `docs/development.md` §10.

**Summary table**

| | local dev (5173 ↔ 3000) | prod, same-origin `/api` | prod, separate subdomains |
| --- | --- | --- | --- |
| `sameSite` | `Lax` (default) | `Lax` (default) | `Lax` works with `crossSubDomainCookies` |
| `secure` | off (http) | on (prod default) | on |
| `trustedOrigins` | `["http://localhost:5173"]` | site origin only | both origins, or `https://*.example.com` |
| CORS | `@fastify/cors`, explicit `origin`, `credentials: true` | not needed | explicit `origin`, `credentials: true` |
| client credentials | `include` (Better Auth client default) | same | same |
| extra | — | — | `advanced.crossSubDomainCookies` |

---

## 5. Client side — Better Auth client vs plain Axios

### What the client gives you

**[VERIFIED]** `createAuthClient` from `better-auth/react` with `baseURL` pointed at the
API (`concepts/client.mdx` @ `v1.7.5`). It is built on `@better-fetch/fetch`, not Axios.

**[VERIFIED — decisive for the `withCredentials` question.]** The Better Auth client
sets `credentials: "include"` **by default**
(`packages/better-auth/src/client/config.ts` @ `v1.7.5`):

```ts
const isCredentialsSupported = "credentials" in Request.prototype;
const $fetch = createFetch({
  baseURL,
  ...(isCredentialsSupported ? { credentials: "include" } : {}),
  …
});
```

So there is **nothing to configure** for cookies on the auth calls themselves.

**[VERIFIED]** Axios's default is the opposite: `withCredentials: false`
(axios `v1.20.0` README). Any Axios call to the API — including every
`/api/v1/admin/*` call — **must** set `withCredentials: true` (best done once on a
shared instance), or the session cookie is simply not sent and every admin request 401s
with no visible cause. This is a likely first bug.

**[VERIFIED]** Axios note from the same README: "In older Axios versions, setting
`withCredentials: true` implicitly caused Axios to set the XSRF header for cross-origin
requests. Newer Axios separates these concerns" — so `withCredentials: true` alone does
**not** add an XSRF header in 1.20. Better Auth does not use one anyway (its CSRF
defence is origin validation + Fetch Metadata + `SameSite`, per
`reference/security.mdx` @ `v1.7.5`), so this is a non-issue — just don't expect Axios
to be doing something it isn't.

### Client library or plain Axios?

**[ASSUMPTION — the docs express a preference by only documenting one path, but do not
forbid the other.]**

Plain Axios against `/api/auth/*` is perfectly possible: they are ordinary JSON HTTP
endpoints and `auth.api` mirrors them server-side. What is lost by going Axios-only:

- `credentials: "include"` by default (must be set manually);
- typed, inferred endpoint signatures — `better-call` "lets you call REST API endpoints
  as if they were regular functions and allows us to easily infer client types from the
  server" (`concepts/api.mdx` @ `v1.7.5`);
- plugin client surfaces — the admin plugin ships `adminClient()` for
  `better-auth/client/plugins` (`plugins/admin.mdx` @ `v1.7.5`);
- session reactivity — `useSession`, plus a broadcast channel that syncs sign-out across
  tabs (`packages/better-auth/src/client/config.ts` atom listeners for `/sign-out`,
  `/update-user`, …).

**[ASSUMPTION]** The pragmatic split for this project: **Better Auth client for auth
operations** (`signIn.email`, `signOut`, `getSession`) and **Axios with
`withCredentials: true` for the project's own `/api/v1/*` domain API**. Two HTTP clients
in one app is mild duplication, but each is used where it is actually better, and the
alternative (hand-rolling auth calls in Axios) trades type-safety for uniformity. This is
a judgement, not a documented recommendation.

### TanStack Query holding session state

**[VERIFIED]** `authClient.useSession()` is a **nanostores**-backed reactive atom
(`packages/better-auth/src/client/config.ts`, `session-atom.ts` @ `v1.7.5`) — a cache
entirely separate from TanStack Query. It has its own refetch policy via
`sessionOptions` (`refetchInterval`, `refetchOnWindowFocus` default `true`,
`refetchWhenOffline`) (`concepts/client.mdx` @ `v1.7.5`).

**[VERIFIED]** `authClient.getSession()` is a plain promise
(`concepts/session-management.mdx` @ `v1.7.5`) and therefore drops straight into a
TanStack Query `queryFn`.

**[ASSUMPTION]** Running `useSession()` **and** a TanStack Query session query gives two
caches that can disagree — e.g. after sign-out, one is cleared and the other is not.
Pick one owner of session state:

- **`useSession()` owns it** — simplest, gets cross-tab sign-out sync for free; TanStack
  Query is then used only for domain data. Requires calling
  `queryClient.clear()`/`invalidateQueries()` on sign-out so admin data does not outlive
  the session.
- **TanStack Query owns it** — one cache, one set of devtools, uniform loading/error
  handling, and it composes with React Router 8 loaders; costs the cross-tab broadcast
  and the built-in refetch policy, which would need re-implementing.

Nothing in Better Auth's docs addresses TanStack Query. This is genuinely a project
decision.

### React Router 8

**[VERIFIED] Better Auth 1.7.5 has no React Router 8 documentation.** Its page is
titled "React Router v7 Integration" (`integrations/react-router.mdx` @ `v1.7.5`,
sidebar "React Router v7"), and it targets React Router's **framework/SSR mode** —
`auth.server.ts`, a server resource route mounting `auth.handler`, loaders reading the
session server-side.

**[VERIFIED]** This repo runs React Router **8.4.0** as a client-side SPA
(`apps/web/package.json`; `apps/web/src/main.tsx`; `STACK.md` says "Data Mode"), with the
API in a separate Fastify process. So that integration page **does not apply** — none of
its server-side pieces exist here.

**[UNVERIFIED]** Whether Better Auth has any React Router 8-specific concern at all.
Nothing in the 1.7.5 docs mentions version 8. **[ASSUMPTION]** there is none: the React
client is framework-agnostic (`better-auth/react` peers only on `react`/`react-dom`, not
on any router), and in SPA mode the router is irrelevant to Better Auth. Reasonable, but
unproven.

---

## 6. Bootstrapping the first administrator

This is the sharpest finding in the ticket, and it has a clean answer.

### Disabling public registration

**[VERIFIED]** `emailAndPassword.disableSignUp: true`
(`authentication/email-password.mdx` @ `v1.7.5`, default `false`).

**[VERIFIED — and this rules out the obvious seed script.]** `disableSignUp` is enforced
*inside the endpoint handler*, not at the HTTP layer
(`packages/better-auth/src/api/routes/sign-up.ts` @ `v1.7.5`):

```ts
if (
  !ctx.context.options.emailAndPassword?.enabled ||
  ctx.context.options.emailAndPassword?.disableSignUp
) {
  throw APIError.from("BAD_REQUEST", {
    message: "Email and password sign up is not enabled",
    code: "EMAIL_PASSWORD_SIGN_UP_DISABLED",
  });
}
```

Because `auth.api.signUpEmail(...)` invokes the same handler, **a seed script calling
`auth.api.signUpEmail` fails too.** The "seed script calling Better Auth's server API"
option only works against the *right* server API.

### What Better Auth actually sanctions

**[VERIFIED] There is a first-party CLI command for exactly this problem.**
`docs/content/docs/concepts/cli.mdx` @ `v1.7.5`:

> ### Create Admin
> The `create-admin` command creates an initial admin user through your configured
> Better Auth instance. It requires the Admin plugin and a persistent database, and it
> uses the same server-side `auth.api.createUser` path as the Admin plugin so passwords
> are hashed and database hooks still run.

```
npx auth@latest create-admin --email admin@example.com --name "Admin" --role admin
```

Options: `--email`, `--password` (prompts if omitted), `--name` (default `Admin`),
`--role` (default `admin`), `--data` (JSON of extra user fields), `--no-email-verified`
(CLI marks the email verified by default), `--config`, `--force`, `--yes`.

**[VERIFIED]** The admin plugin page repeats it as *the* bootstrap instruction: "To
create the first admin user, run the CLI after adding the Admin plugin and applying the
schema" (`plugins/admin.mdx` @ `v1.7.5`).

**[VERIFIED]** The CLI is a thin wrapper — `packages/cli/src/commands/create-admin.ts`
@ `v1.7.5` loads the project's config, refuses without a persistent database ("No
database is configured…"), refuses without the plugin ("The admin plugin is required.
Add `admin()` to your Better Auth plugins before running this command."), and then calls
`auth.api.createUser({ body: { email, password, name, role, data } })`.

**[VERIFIED — the mechanism that makes an unauthenticated bootstrap legal.]**
`packages/better-auth/src/plugins/admin/routes.ts` @ `v1.7.5`, `/admin/create-user`:

```ts
const session = await getAuthoritativeSessionFromCtx<{ role: string }>(ctx);
if (!session && (ctx.request || ctx.headers)) {
  throw ctx.error("UNAUTHORIZED");
}
```

Over HTTP there is always a `request`, so the endpoint demands an admin session. Called
**server-side** via `auth.api.createUser({ body })` with no `request`/`headers`, there is
no session *and* no request, so the guard does not fire and creation proceeds. The same
handler then hashes the password with `ctx.context.password.hash(...)` and links a
`credential` account. **This is a deliberate, guarded escape hatch, not an oversight —
and it is the one Better Auth's own CLI uses.**

**[VERIFIED]** Password hashing is `scrypt` by default
(`reference/security.mdx` @ `v1.7.5`), customisable via the `password` option.

### Verdict on the three candidates in the ticket

| Candidate | Verdict |
| --- | --- |
| Seed script calling `auth.api.signUpEmail` | **Does not work** with `disableSignUp: true` — the guard is inside the handler (source above). |
| Seed script calling `auth.api.createUser` (admin plugin) | **Sanctioned.** Exactly what `auth create-admin` does. Passwords hashed, DB hooks run. |
| `npx auth@latest create-admin` | **Sanctioned and first-party.** Same path, no code to write or maintain. |
| One-time bootstrap route | Not mentioned anywhere in Better Auth's docs. Would have to be built, guarded and then removed. Unnecessary given the above. |
| Direct row insertion with a hand-hashed password | Never suggested by the docs. Would require re-implementing scrypt parameters exactly and hand-building the `credential` `account` row — precisely the "custom password hashing" that ADR-0006 puts out of scope. **Reject.** |

**[ASSUMPTION]** For this project: add `admin()`, run `auth generate` + `drizzle-kit
generate` + `drizzle-kit migrate`, then `npx auth@latest create-admin`. If a repeatable
seed is wanted later (CI, a fresh environment), a tiny script calling
`auth.api.createUser` gives the same guarantees under the project's own control. Do not
build a bootstrap route.

**[UNVERIFIED]** Whether `create-admin` is exercised in Better Auth's CI, and whether it
behaves correctly with `generateId: false` + database-generated UUIDv7 ids. Unknown —
worth running once against the local Docker Postgres before depending on it.

---

## 7. The role model — native vs project-owned

Two supported routes, and the choice has real consequences.

### Option A — the admin plugin (`better-auth/plugins` → `admin()`)

**[VERIFIED]** (`plugins/admin.mdx` @ `v1.7.5`):

- Two roles out of the box: `admin` (full control over other users) and `user` (none).
  "A user can have multiple roles. Multiple roles are stored as string separated by
  comma (`,`)."
- Adds `role`, `banned`, `banReason`, `banExpires` to `user` and `impersonatedBy` to
  `session` (§3).
- Ships a permission system over resources: `user` (`create`, `list`, `set-role`, `ban`,
  `impersonate`, `impersonate-admins`, `delete`, `set-password`, `set-email`, `get`,
  `update`) and `session` (`list`, `revoke`, `delete`), extensible with custom
  statements via `better-auth/plugins/access`.
- Server-side checks: `auth.api.userHasPermission({ body: { userId | role, permissions:
  { project: ["create"] } } })` — **arbitrary resource names are allowed**, so the
  project's own `project` / `media` / `inquiry` resources can be expressed in Better
  Auth's access control and checked from a Fastify `preHandler`.
- Client-side: `adminClient()` plus `authClient.admin.hasPermission(...)` and a
  synchronous `authClient.admin.checkRolePermission({ role, permissions })` for UI
  gating without a round trip.
- Options include `defaultRole`, `adminRoles`, `adminUserIds` ("An admin is any user
  assigned the `admin` role **or** any user whose ID is included in the `adminUserIds`
  option").
- **Required for `auth create-admin`** (§6).

**Cost:** user management endpoints (`/admin/list-users`, `/admin/ban-user`,
`/admin/impersonate-user`, …) and the ban/impersonation columns come along whether or
not this project wants them.

### Option B — a plain `role` additional field, project-owned authorization

**[VERIFIED]** The core "Extending Core Schema" docs use `role` as their *worked
example* (`concepts/database.mdx` @ `v1.7.5`):

```ts
export const auth = betterAuth({
  user: {
    additionalFields: {
      role: {
        type: ["user", "admin"],
        required: false,
        defaultValue: "user",
        input: false, // don't allow user to set role
      },
    },
  },
});
```

**[VERIFIED]** `input: false` means "API input and provider profile mapping cannot
supply the field" — the docs call this out explicitly: "Set this to `false` for
server-owned fields such as `role`." A configured `defaultValue` still initialises it;
otherwise it takes "an application-owned database write". `returned` controls whether it
appears in responses, independently of `input`.

**[VERIFIED]** Additional fields are type-inferred through `useSession`, `signUp.email`
and the other endpoints, so `session.user.role` stays typed with no casting.

**Cost:** no `create-admin` CLI (§6) — the first User would need an application-owned
write or a `defaultValue` plus a manual promotion. All authorization logic is the
project's own.

### Recommendation

**[ASSUMPTION — a judgement, explicitly labelled.]** Use **`admin()`**. Reasons, each
tied to a verified fact:

1. It is the **only** documented path to `auth create-admin`, which is the only
   sanctioned, hash-correct way to bootstrap the first account with registration
   disabled (§6). Choosing Option B means solving §6 from scratch.
2. The spec asks for "a simple role model initially while leaving the domain/data model
   capable of supporting more granular permissions later". `admin()` **is** simple at
   first (`role: "admin"` vs `"user"`) and its `createAccessControl` statements are the
   documented growth path — exactly the shape the spec describes.
3. The unwanted endpoints are inert on a single-User system; `banned`/`banExpires` are
   four nullable columns.

The project still writes its own `/api/v1/admin` guard (§2) either way. Better Auth
supplies the role and, optionally, answers permission questions; it does not protect
application routes.

---

## Open questions and things NOT verified

Listed plainly rather than glossed:

1. **`content-length` on the reconstructed `Request`.** `fromNodeHeaders` forwards it
   verbatim; whether Node/undici strips forbidden request headers or honours a stale
   value is **unverified**. (§1c)
2. **`generateId: false` + `uuidv7()` column defaults.** Supported per the options docs,
   but whether the CLI's generated Drizzle schema emits the `DEFAULT uuidv7()` — or
   needs hand-editing a regenerated file — was **not verified**. (§3)
3. **Drizzle `1.0.0-rc.4` in practice.** Inside Better Auth's declared peer range, but
   Better Auth's docs name no rc version. Relations v2 vs v1 adapter choice for
   `drizzle-orm@1.x` is documented; actual behaviour against `rc.4` is **unverified**.
4. **React Router 8.** Better Auth 1.7.5 documents React Router **v7** only, in
   framework/SSR mode. No v8 guidance exists. The assumption that the React client is
   router-agnostic is reasonable but **unproven**. (§5)
5. **`SameSite=Lax` across `localhost:5173` ↔ `localhost:3000`.** The same-site (not
   same-origin) reasoning is a cookie-spec inference, **not** a Better Auth doc
   statement. Verify in a real browser. (§4)
6. **`auth create-admin` against this exact stack** (Drizzle rc.4, Postgres 18,
   database-generated ids) — **untested**. Run it once early. (§6)
7. **Whether the docs' Fastify snippet has been validated against form-encoded
   sign-in/sign-up.** The two doc pages appear to be in tension (§1); no Better Auth
   source resolves it. Anything relying on form-encoded auth routes needs its own
   content-type parser in the auth plugin scope.
8. **`reply.hijack()` necessity.** `wrap-thenable.js` shows omitting it *happens to*
   work; whether that is contract or coincidence is **unverified**. Fastify's docs
   recommend `hijack()` for writing to `reply.raw`.

---

## Sources

All Better Auth citations pinned to tag **`v1.7.5`**; all Fastify citations to
**`v5.12.5`**; `@fastify/cors` to **`v11.3.0`**; `axios` to **`v1.20.0`**.

**Better Auth documentation** (`https://raw.githubusercontent.com/better-auth/better-auth/v1.7.5/docs/content/docs/…`,
live equivalents at `https://www.better-auth.com/docs/…`):
`integrations/fastify.mdx`, `integrations/express.mdx`, `integrations/react-router.mdx`,
`installation.mdx`, `adapters/drizzle.mdx`, `concepts/database.mdx`, `concepts/cli.mdx`,
`concepts/cookies.mdx`, `concepts/session-management.mdx`, `concepts/api.mdx`,
`concepts/client.mdx`, `concepts/rate-limit.mdx`, `authentication/email-password.mdx`,
`plugins/admin.mdx`, `reference/options.mdx`, `reference/security.mdx`.

**Better Auth source** (`https://raw.githubusercontent.com/better-auth/better-auth/v1.7.5/…`):
`packages/better-auth/src/integrations/node.ts`,
`packages/better-auth/src/client/config.ts`,
`packages/better-auth/src/api/routes/sign-up.ts`,
`packages/better-auth/src/api/routes/sign-out.ts`,
`packages/better-auth/src/plugins/admin/routes.ts`,
`packages/cli/src/commands/create-admin.ts`,
`packages/cli/src/generators/drizzle.ts`.

**Transitive source:** `better-call@1.4.0` `dist/node.mjs` and
`dist/adapters/node/request.mjs`; `@better-fetch/fetch@1.3.2` `dist/index.js`
(both via unpkg).

**Fastify** (`https://raw.githubusercontent.com/fastify/fastify/v5.12.5/…`):
`docs/Reference/ContentTypeParser.md`, `docs/Reference/Reply.md`,
`docs/Reference/Hooks.md`, `docs/Reference/Decorators.md`,
`docs/Reference/Encapsulation.md`, `docs/Reference/Lifecycle.md`,
`docs/Reference/Errors.md`, `lib/handle-request.js`, `lib/wrap-thenable.js`.

**Other:** `@fastify/cors` `v11.3.0` README; `axios` `v1.20.0` README;
`flaviodelgrosso/fastify-better-auth` `src/index.ts` (community, not first-party);
npm registry metadata for `better-auth`, `auth`, `@better-auth/drizzle-adapter`,
`@better-auth/cli`, `fastify-better-auth`, `@fastify/cors`.

**This repository:** `STACK.md`, `CONTEXT.md`, `docs/development.md`,
`docs/spec/portfolio-v3-implementation.md`, `docs/adr/0006-cookie-based-authentication.md`,
`apps/api/package.json`, `apps/web/package.json`, `apps/web/vite.config.ts`,
`apps/api/src/index.ts`, `apps/api/src/db/schema.ts`, `apps/api/drizzle.config.ts`,
`pnpm-lock.yaml`, `compose.yaml`.
