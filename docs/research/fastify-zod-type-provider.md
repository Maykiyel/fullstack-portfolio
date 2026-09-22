# `fastify-type-provider-zod` against the pinned Fastify and Zod versions — research findings

Resolves [#11](https://github.com/Maykiyel/fullstack-portfolio/issues/11), a child of the
Wayfinder decision map [#1](https://github.com/Maykiyel/fullstack-portfolio/issues/1).

Research only. **No application code was written.** Every code block below is quoted from
a primary source (published npm registry metadata, the package's own source at a pinned
git tag, or Fastify/Zod's own docs at a pinned tag) — none of it has been run against this
repository.

## How to read this document

Every claim is tagged:

- **[VERIFIED]** — read directly in primary documentation or in the published source of
  the exact version named, with the source cited.
- **[ASSUMPTION]** — a reasonable inference that the primary sources do not state
  outright. Not yet proven; flagged as a thing to check during implementation.
- **[UNVERIFIED]** — something the ticket asks about that the primary sources do not
  answer at all.

Citations are pinned to exact tags/versions (`fastify-type-provider-zod@v7.0.0`,
`zod@v4.6.5`, `fastify@v5.12.5`, `react-hook-form@v7.88.0`), not "latest" or a live docs
site, so they keep meaning as the projects move on.

## Bottom line

**[VERIFIED] `fastify-type-provider-zod` behaves as issue #7 assumed, on the exact
versions this repo pins — with one correction to the ticket's premise and one real gap in
the `path.join(".")` claim.** `fastify-type-provider-zod@7.0.0` is the version to pin. Its
declared peers — `fastify: ^5.5.0`, `zod: >=4.1.5`, `@fastify/swagger: >=9.5.1`,
`openapi-types: ^12.1.3` — are all satisfied by what this repo already has resolved
(`fastify@5.12.5`, `zod@4.6.5`). Validation errors surface through the ordinary Fastify
`setErrorHandler` path as an `FST_ERR_VALIDATION`-coded error with `.validation` populated
by Zod-shaped entries; `hasZodFastifySchemaValidationErrors` narrows to exactly that
shape. The 422 override is the same pattern Fastify's own docs show. Response
serialization strips unrecognized keys silently by default, confirmed in Zod's own object
schema source, independent of parse direction. A schema-rejecting response throws and
reaches `setErrorHandler` rather than leaking. The OpenAPI transform exists and is
documented against `@fastify/swagger`. No fallback is needed.

**Correction to the ticket's premise: [VERIFIED]** `zod` and `react-hook-form` are
**already** dependencies of this repo, at exactly the pinned versions — `apps/web/package.json`
declares `"zod": "^4.6.5"` and `"react-hook-form": "^7.88.0"`, and `pnpm-lock.yaml`
resolves `zod@4.6.5`, `react-hook-form@7.88.0`, and `fastify@5.12.5` (checked on this
research branch, forked from `main`). Only `fastify-type-provider-zod` is genuinely
absent from both `package.json` files and the lockfile — that part of the ticket's premise
holds. Also note: `zod` is only declared in `apps/web/package.json`, not
`apps/api/package.json` — the API will need its own dependency entry.

---

## Versions this research is against

| Thing | Version | Source |
| --- | --- | --- |
| `fastify` | `5.12.5` (locked) | `apps/api/package.json` (`^5.12.5`), `pnpm-lock.yaml` |
| `zod` | `4.6.5` (locked) | `apps/web/package.json` (`^4.6.5`), `pnpm-lock.yaml` — **not yet in `apps/api/package.json`** |
| `react-hook-form` | `7.88.0` (locked) | `apps/web/package.json`, `pnpm-lock.yaml` |
| `fastify-type-provider-zod` | **not installed anywhere** | checked `apps/api/package.json`, `apps/web/package.json`, `pnpm-lock.yaml` |
| `fastify-type-provider-zod` latest on npm | `7.0.0` (published 2026-06-24) | npm registry `dist-tags` |
| `@fastify/swagger` latest on npm | `9.9.0` | npm registry `dist-tags` |

**[VERIFIED]** `zod@4.6.5` is npm's current `latest` for the `zod` package (`dist-tags:
{"latest":"4.6.5", ...}` at the time of writing) — this repo is pinned to the tip of Zod 4,
not an old point release.

**[VERIFIED]** `react-hook-form@7.88.0` is likewise npm's current `latest`.

---

## 1. Zod 4 support and the peer-dependency resolution

**[VERIFIED]** `fastify-type-provider-zod`'s own compatibility table (`README.md` @
`v7.0.0`):

| `fastify-type-provider-zod` | `zod` |
| --- | --- |
| `<=4.x` | v3 |
| `>=5.x <7.x` | v4 |
| `>=7.x` | v4.2+ |

**[VERIFIED]** Peer dependencies by version, read from npm registry metadata for each
published version:

| Version | `zod` peer | `fastify` peer | `@fastify/swagger` peer |
| --- | --- | --- | --- |
| `4.0.2` | `^3.14.2` | `^5.0.0` | — |
| `5.0.0`–`5.1.0` | `>=3.25.56` (the Zod-4-under-3.25 preview channel) | `^5.0.0` | `>=9.5.1` (from `5.0.0`) |
| `6.0.0`–`6.1.0` | `>=4.1.5` | `^5.0.0` (`6.0.0`), `^5.5.0` (`6.1.0`) | `>=9.5.1` |
| **`7.0.0`** | `>=4.1.5` | `^5.5.0` | `>=9.5.1` |

`fastify@5.12.5` satisfies `^5.5.0` (5.12.5 ≥ 5.5.0), and `zod@4.6.5` satisfies `>=4.1.5`
comfortably. **`7.0.0` is the version to pin.**

**[ASSUMPTION]** The README's compatibility table says `>=7.x` needs "v4.2+", one step
more specific than the raw `peerDependencies` range of `>=4.1.5` in `package.json` for
that same version — a minor documentation/manifest mismatch upstream. Moot here:
`zod@4.6.5` clears both bars by a wide margin. Not worth chasing further.

**[VERIFIED] `fastify-type-provider-zod@7.0.0` changed its internal mechanism, not just
its Zod-version floor.** From the README: "Starting from v7, this library uses Zod's
`.encode()` / `.decode()` APIs introduced in Zod 4.2. Because of this change, response
serialization is now based on `z.output<T>` instead of `z.input<T>`." Confirmed in source
(`src/core.ts` @ `v7.0.0`): the serializer compiler calls `safeEncode(schema, data)` from
`zod/v4/core`, not a plain `safeParse`. **[ASSUMPTION]** For response schemas that are
plain `z.object()` shapes without `.transform()`/`.pipe()` (the expected shape for a
public Project payload), input and output types are identical, so this distinction is
inert for issue #7's use case. It only matters if a response schema ever gains a
transform — worth a note for whoever writes the first response schema with one.

**[VERIFIED]** `src/core.ts` and `src/errors.ts` (`fastify-type-provider-zod@v7.0.0`)
import from `zod/v4/core`, and `zod@4.6.5`'s own `package.json` `exports` map (npm
registry metadata) includes a `./v4/core` entry pointing at `./v4/core/index.js` — the
subpath the type provider depends on exists in the exact pinned Zod version.

---

## 2. How validation errors surface — and the `path.join(".")` gap

**[VERIFIED] The exact mechanism, traced end to end through both packages' source:**

1. `validatorCompiler` (`src/core.ts` @ `v7.0.0`) runs `safeParse(schema, data)` from
   `zod/v4/core`. On failure it returns `{ error: createValidationError(result.error) }` —
   **not** a raw `Error` and not the `ZodError` itself.
2. `createValidationError` (`src/errors.ts`) maps each `$ZodError` issue into a
   `ZodFastifySchemaValidationError`:

   ```ts
   export function createValidationError(error: $ZodError): ZodFastifySchemaValidationError[] {
     return error.issues.map((issue) => {
       return {
         [ZodFastifySchemaValidationErrorSymbol]: true,
         keyword: issue.code,
         instancePath: `/${issue.path.join('/')}`,
         schemaPath: `#/${issue.path.join('/')}/${issue.code}`,
         message: issue.message,
         params: { ...omit(issue, ['path', 'code', 'message']) },
       }
     })
   }
   ```

   **The original `issue.path` array is consumed to build `instancePath` (a `/`-joined
   JSON-Pointer-style string) and then discarded — it is explicitly omitted from
   `params`.** Nothing downstream carries `issue.path` as an array.
3. Fastify's own `lib/validation.js` (`@fastify/v5.12.5`) receives this array as the
   compiler's return value. `validateParam`'s `answer()` returns `ret.error` (the array
   above) into `wrapValidationError(result, dataVar, schemaErrorFormatter)`. Since
   `result` is not `instanceof Error`, it goes through the **default**
   `schemaErrorFormatter` to build a message, then:

   ```js
   error.statusCode = error.statusCode || 400
   error.code = error.code || 'FST_ERR_VALIDATION'
   error.validation = result   // the ZodFastifySchemaValidationError[] array
   error.validationContext = dataVar
   ```

4. That constructed error — a Fastify error with `.validation`, `.code === 'FST_ERR_VALIDATION'`,
   `.statusCode === 400` — is what reaches `setErrorHandler(error, request, reply)`, via
   the same `handleError`/`onErrorHook` path every other Fastify error takes
   (`lib/error-handler.js`, `lib/reply.js` @ `v5.12.5`). It is **not** a `ZodError`.

**[VERIFIED] `hasZodFastifySchemaValidationErrors` narrows to exactly this shape**
(`src/errors.ts` @ `v7.0.0`): it checks `'validation' in error`, that `error.validation` is
a non-empty array, and that its first entry carries the
`Symbol.for('ZodFastifySchemaValidationError')` marker. Its type predicate is
`Omit<FastifyError, 'validation'> & { validation: ZodFastifySchemaValidationError[] }` —
an array of `{ keyword, instancePath, schemaPath, message, params }`, not `ZodIssue[]`.

**This is the gap against issue #7's claim.** `issue.path.join(".")` assumes direct access
to a `ZodError`'s `issues[].path` array. What actually reaches `setErrorHandler` has
**no `path` array** — only `instancePath`, a leading-slash, `/`-joined string (e.g.
`/items/0/name`), built by the type provider before Fastify ever sees the original issue.
**[ASSUMPTION]** The fix is mechanical and cheap: derive the RHF field name from
`instancePath` instead of a `path` array —

```ts
const fieldName = err.instancePath.replace(/^\//, '').split('/').join('.')
// "/items/0/name" -> "items.0.name"
```

— which happens to produce exactly the dot/numeric-index notation React Hook Form's
`FieldPath` type expects (confirmed below, §7). The *outcome* issue #7 wants (an RHF-
compatible field name from a validation failure) is fully achievable; the *stated
mechanism* (`.path.join(".")` off a raw Zod issue) is not what's on the wire. This is a
one-line correction, not a design problem, but it should be fixed in the ADR/implementation
notes so nobody goes looking for a `path` property that was never there.

**[VERIFIED]** The remaining Zod issue fields (`expected`, `received`, `minimum`, etc.,
whatever the issue code carries) survive into `params` via `omit(issue, ['path', 'code',
'message'])`, so a richer client-side message than "invalid" is still constructible from
what does reach the handler.

---

## 3. Overriding the status to 422

**[VERIFIED] This is a clean override, and it is the exact pattern Fastify's own docs
show** — not a hack layered on top of the library. `docs/Reference/Validation-and-Serialization.md`
@ `fastify@v5.12.5`, verbatim:

```js
fastify.setErrorHandler(function (error, request, reply) {
  if (error.validation) {
     reply.status(422).send(new Error('validation failed'))
  }
})
```

**[VERIFIED] Why the override is clean, traced through `lib/error-handler.js` @
`v5.12.5`:** a custom error handler registered via `setErrorHandler` is invoked as
`func(error, request, reply)` directly; Fastify's automatic status-code assignment
(`setErrorStatusCode`, which would otherwise read `error.statusCode`/`error.status`) is
only applied inside the **default** error handler. Once a custom handler calls
`reply.status(422)` before `reply.send(...)`, that status is what goes out — nothing
downstream reasserts `400`.

**[VERIFIED] Encapsulation applies:** "Error handlers are fully encapsulated, so a
`setErrorHandler` call within a plugin will limit the error handler to that plugin's
context" (`docs/Reference/Errors.md` @ `v5.12.5`). A single root-level `setErrorHandler`
covers every route unless a nested plugin registers its own.

**[VERIFIED, with one real caveat] No *ordinary* validation path bypasses the handler —
but `attachValidation: true` does, by design, and it is opt-in per route.** Per the same
doc: "To handle errors inside the route, specify the `attachValidation` option. If there
is a validation error, the `validationError` property of the request will contain the
same `Error` object Fastify would have sent on its own" — and Fastify's own sample handler
for that option calls `reply.code(400).send(req.validationError)` **manually**, hardcoding
400. **[ASSUMPTION]** As long as no route in this repo sets `attachValidation: true`,
every validation failure funnels through the global `setErrorHandler` and the 422 override
is total. If `attachValidation` is ever used for some route-specific reason, that route's
handler becomes responsible for its own status code and would need to remember the 422
convention itself — worth a lint rule or a code-review note rather than a runtime
guarantee.

---

## 4. Response serialization: unknown fields are stripped silently — confirmed in Zod's own source

**[VERIFIED] Confirmed directly in `zod@4.6.5`'s `$ZodObject` implementation**
(`packages/zod/src/v4/core/schemas.ts` @ `v4.6.5`). The parse function for a plain
`z.object()` (no `.strict()`, no `.catchall()`) does this:

```ts
inst._zod.parse = (payload, ctx) => {
  ...
  payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {}   // fresh, empty output object
  for (const key of value.allKeys) {                                // only declared shape keys
    ...
    const r = el._zod.run({ value: input[key], issues: [] }, ctx)
    handlePropertyResult(r, payload, key, input, optin, optout)
  }
  if (!catchall) {
    return proms.length ? Promise.all(proms).then(() => payload) : payload
  }
  return handleCatchall(...)   // only reached with .catchall()/.strict()
}
```

The output object is built from scratch and populated **only** with the schema's declared
keys. Undeclared input keys are never copied in, and — critically — **this logic does not
branch on parse direction.** `safeEncode` (used by the serializer compiler) is implemented
as `_safeParse` with `ctx.direction = "backward"` (`packages/zod/src/v4/core/parse.ts` @
`v4.6.5`), and `$ZodObject.parse` never reads `ctx.direction`. So the same "only declared
keys survive" behavior applies identically whether Zod is validating a request body
(`decode`/forward) or serializing a response (`encode`/backward).

**Conclusion: [VERIFIED]** A response schema narrower than the returned object **strips
the extra fields silently** — it does not throw, and this is the same code path regardless
of direction. This is exactly what issue #7 assumed, and it is what issue #5's plan to keep
Draft-only fields off the public Project payload can rely on, **provided** the public
response schema is a plain `z.object()` and not `.strict()`. **[ASSUMPTION]** Nothing here
was tested against nested objects/arrays of objects beyond reading the shape-loop
logic, but the same `$ZodObject.parse` function is what every nested object schema
compiles to, so the behavior should be uniform at any nesting depth. Confirming this against
one real nested Project-shaped schema during implementation is still a fair "testing
obligation," per issue #7's own framing — the *mechanism* is now verified; end-to-end
behavior on this repo's actual schemas is not.

---

## 5. Response schema outright rejection: throws, and reaches `setErrorHandler` — no silent leak

**[VERIFIED]** When `safeEncode` returns an error (the handler's return value fails the
response schema outright — a required field missing, wrong type, etc.), `createSerializerCompiler`
(`src/core.ts` @ `v7.0.0`) throws:

```ts
throw new ResponseSerializationError(method, url, { cause: result.error })
```

**[VERIFIED]** `ResponseSerializationError` (`src/errors.ts`) is built on
`createError('FST_ERR_RESPONSE_SERIALIZATION', "Response doesn't match the schema", 500)`
— **default status 500**, with `.cause` carrying the original `$ZodError`.

**[VERIFIED] This throw does not bypass error handling — Fastify wraps serialization in a
try/catch that routes into the same error pipeline** (`lib/reply.js` @ `v5.12.5`):

```js
try {
  payload = serialize(reply[kRouteContext], payload, reply.raw.statusCode, reply[kReplyHeaders]['content-type'])
} catch (e) {
  ...
  onErrorHook(reply, e)   // -> handleError -> the configured setErrorHandler
}
```

**Conclusion: [VERIFIED]** A serialization bug cannot leak a non-enveloped or partially-
written response to the client — it becomes an ordinary error, routed to the same
`setErrorHandler` as everything else, defaulting to `500`. **[ASSUMPTION]** Because
Fastify's error payload forwards `error.message`/`error.code` verbatim by default (per
`docs/Reference/Errors.md` @ `v5.12.5`, the "Security Consideration" note already recorded
in the Better Auth research doc's pattern), a naive `setErrorHandler` that does
`reply.send(error)` for anything with `.cause instanceof $ZodError` would put internal
schema shape information in a client-facing 500. `isResponseSerializationError` is
exported specifically so the handler can detect this case and respond with a generic
message instead — worth writing that branch explicitly rather than assuming the default
`reply.send(error)` path is safe for this error type.

---

## 6. Interaction with the Better Auth bypass scope — no interference, and here is exactly why

**[VERIFIED] The Zod validator/serializer compilers only ever run for a route that
declares the corresponding schema key — and the Better Auth catch-all route (per issue
#8's research) declares no schema at all.** Traced in `lib/validation.js` @
`fastify@v5.12.5`:

- `compileSchemasForValidation(context, compile)` returns immediately `if (!schema)`.
- `validate(context, request, execution)` returns `false` immediately if none of
  `context[paramsSchema] / [bodySchema] / [querystringSchema] / [headersSchema]` is set —
  i.e., if the route has no schema, the (global) validator compiler is never invoked for
  it, full stop.
- Symmetrically, `compileSchemasForSerialization(context, compile)` in the same file
  returns immediately `if (!context.schema || !context.schema.response)`.

Issue #8's Better Auth catch-all (`fastify.route({ method: [...], url: '/api/auth/*',
async handler(...) {...} })`) has no `schema` option whatsoever. Registering
`app.setValidatorCompiler(validatorCompiler)` and `app.setSerializerCompiler(serializerCompiler)`
**globally at the root** therefore has **zero runtime effect on that route** — there is no
schema for the Zod compiler to be handed. This is a stronger guarantee than "the two
mechanisms happen not to conflict": the Zod compilers are schema-gated and the auth
catch-all carries no schema, so they are never invoked on it.

**[VERIFIED, the other direction]** Content-type parser bypass (`addContentTypeParser`/
`removeAllContentTypeParsers`, scoped to the auth child plugin per issue #8's research)
operates entirely at the body-parsing stage, before validation ever runs. It has no
interaction with `setValidatorCompiler`/`setSerializerCompiler`, which are a separate
per-route-context configuration (`docs/Reference/Server.md` @ `v5.12.5`: "Set the schema
validator compiler for all routes"). Both are ordinary Fastify plugin-encapsulated
settings (`docs/Reference/Encapsulation.md` @ `v5.12.5` — decorators, hooks and plugin-
scoped settings are all governed by the same encapsulation context); a root-level
`setValidatorCompiler` is visible to the auth child scope like any other root plugin, but
— per the schema-gating above — visibility doesn't matter here because there is nothing
for it to act on.

**Conclusion: [VERIFIED]** Registering the Zod compilers globally is safe to do
independent of, and in either order relative to, wiring the Better Auth bypass scope from
issue #8. No route needs to explicitly opt out.

---

## 7. OpenAPI generation path

**[VERIFIED] The transform exists, is first-party to `fastify-type-provider-zod`, and is
documented specifically against `@fastify/swagger`.** `src/core.ts` @ `v7.0.0` exports
`createJsonSchemaTransform` / `jsonSchemaTransform` (per-route schema transform) and
`createJsonSchemaTransformObject` / `jsonSchemaTransformObject` (for registry-based
`$ref` schemas). The README's documented usage (`v7.0.0`):

```ts
app.register(fastifySwagger, {
  openapi: { info: { title: 'SampleApi', version: '1.0.0' }, servers: [] },
  transform: jsonSchemaTransform,
})
```

**[VERIFIED]** `@fastify/swagger`'s current published version is `9.9.0` (npm registry
`dist-tags`), which satisfies the type provider's declared peer `>=9.5.1`. Its own
`dependencies` (not peers) include `fastify-plugin@^6.0.0` — already present in this
repo's lockfile — and carry no explicit `fastify` version constraint of their own, so
nothing in `@fastify/swagger@9.9.0` conflicts with `fastify@5.12.5`.

**[VERIFIED]** The transform reads `schema.headers/querystring/body/params/response` off
each route, converts each Zod schema to JSON Schema via the package's own
`zodSchemaToJson` (backed by Zod's built-in `toJSONSchema` machinery, per `src/zod-to-json.ts`
@ `v7.0.0`), and honors a `hide` flag and a skip-list for excluding routes (e.g. the
Better Auth catch-all, or the docs routes themselves) from the generated spec.

**Conclusion: [VERIFIED]** The door issue #7 wants open — declarative Zod route schemas
that can later generate an OpenAPI document without contract-first development — is open,
on exactly the versions this repo pins. This finding stops at "the door is open": no
OpenAPI document was generated against this repo's actual routes, per the ticket's own
scope note.

---

## Fallback

**Not needed.** All seven sub-questions verify as "yes" or "yes, with a one-line
correction" (§2's `instancePath` vs `path.join(".")`) against the exact pinned versions.
Issue #7's envelope design does not need to change. The one adjustment worth carrying into
implementation notes: derive the RHF field name from `instancePath` (slash-joined, leading
slash), not from a `ZodError.issues[].path` array, since the latter is never exposed past
the type provider's own error-shaping step.

If a future Zod or `fastify-type-provider-zod` major release breaks this (both are
pre-1.0-in-spirit, fast-moving packages — `fastify-type-provider-zod` shipped a breaking
internal-mechanism change between `6.x` and `7.0.0` within the last few months, per §1),
the two fallbacks named in the ticket remain available and neither requires touching the
envelope shape itself:

1. **Fastify JSON Schema natively, Zod kept client-side only.** Fastify's built-in
   AJV/`fast-json-stringify` path (already documented in `docs/Reference/Validation-and-Serialization.md`
   §"Error Handling"/"Serialization") produces the same `error.validation`-bearing error
   shape and the same silent-strip-on-response behavior by default
   (`removeAdditional`/AJV semantics) — issue #7's `setErrorHandler` logic barely changes,
   but request/response schemas would be hand-written JSON Schema, duplicating the Zod
   schemas used for RHF client-side validation. Cost: schema duplication and drift risk
   between client and server.
2. **Zod in handlers with a hand-written bridge.** Validate manually inside each handler
   (`schema.safeParse(request.body)`) and reshape a `ZodError` into the same
   `FST_ERR_VALIDATION`-shaped body issue #7's error handler expects, bypassing Fastify's
   schema compiler pipeline entirely. Cost: no automatic response stripping (would need
   its own `.parse()` call before `reply.send()`), and no path to the OpenAPI transform in
   §7 without writing that generator by hand.

---

## Open questions and things NOT verified

1. **`instancePath` vs `path.join(".")` at arbitrary nesting depth.** The stripping
   mechanism and the `instancePath` derivation were confirmed by reading the object
   schema's core loop and the `createValidationError` mapping, not by running a nested
   payload through the compiled validator. Confirm once against a real nested schema.
   (§2, §4)
2. **`fastify-type-provider-zod`'s `>=7.x needs v4.2+` note vs. its own `>=4.1.5` peer
   range.** A minor upstream documentation/manifest inconsistency, immaterial at
   `zod@4.6.5`, but not explained by anything in the package's own source or changelog
   that was read. (§1)
3. **Response schemas that use `.transform()`/`.pipe()`.** `v7.0.0`'s switch to
   `z.output<T>`-based serialization (via `.encode()`) was read from the README and the
   `safeEncode` call site, not exercised against a transform-bearing schema. If any Draft/
   Project field ever needs a transform in its response shape, re-verify this specifically.
   (§1)
4. **Deep-nesting behavior of the silent-strip guarantee.** Confirmed at the single-level
   `$ZodObject.parse` loop; not traced through nested-object or array-of-object
   recursion, though the same function should apply uniformly. (§4)
5. **`isResponseSerializationError` actually wired into a `setErrorHandler` branch.**
   Confirmed the export exists and what it narrows to; whether issue #7's design already
   plans to use it to avoid leaking Zod internals in a 500 body is a design detail for the
   ADR, not something this research resolves. (§5)
6. **No live install was performed.** Every peer-dependency claim is read from published
   registry metadata (`peerDependencies` fields) and the package's own source, not from
   actually running `pnpm add fastify-type-provider-zod@7.0.0` against this repo's
   lockfile and checking for `pnpm install` conflicts (e.g. with `drizzle-orm@1.0.0-rc.4`'s
   own peer ranges, unrelated to this ticket but sharing the same lockfile). Cheap to
   check, not done here.

---

## Sources

All `fastify-type-provider-zod` citations pinned to tag **`v7.0.0`**
(`https://github.com/turkerdev/fastify-type-provider-zod`, raw source via
`https://raw.githubusercontent.com/turkerdev/fastify-type-provider-zod/v7.0.0/...`):
`src/core.ts`, `src/errors.ts`, `src/index.ts`, `README.md`.

All **Fastify** citations pinned to tag **`v5.12.5`**
(`https://raw.githubusercontent.com/fastify/fastify/v5.12.5/...`): `lib/validation.js`,
`lib/error-handler.js`, `lib/error-status.js`, `lib/reply.js`,
`docs/Reference/Errors.md`, `docs/Reference/Validation-and-Serialization.md`,
`docs/Reference/Encapsulation.md`, `docs/Reference/Server.md`.

All **Zod** citations pinned to tag **`v4.6.5`**
(`https://raw.githubusercontent.com/colinhacks/zod/v4.6.5/...`):
`packages/zod/src/v4/core/parse.ts`, `packages/zod/src/v4/core/schemas.ts`.

**React Hook Form** citation pinned to tag **`v7.88.0`**
(`https://raw.githubusercontent.com/react-hook-form/react-hook-form/v7.88.0/src/types/form.ts`).

**npm registry metadata** (`https://registry.npmjs.org/...`): `fastify-type-provider-zod`
(all published versions' `peerDependencies`/`dependencies`/`dist-tags`), `zod`
(`dist-tags`, `exports` map for `4.6.5`), `react-hook-form` (`dist-tags`),
`@fastify/swagger` (`dist-tags`, `dependencies` for `9.9.0`).

**This repository** (on this research branch, forked from `main`): `apps/api/package.json`,
`apps/web/package.json`, `pnpm-lock.yaml`.
