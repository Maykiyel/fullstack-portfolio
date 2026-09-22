# Portfolio V3 system flow

How the full-stack application fits together, and what happens when it is used.

Each diagram answers one question and reflects the **current** architecture and the
current milestone. Where the documentation describes an eventual direction rather than
what is being built, it is labelled as future in the surrounding notes and kept out of
the current-state diagrams.

Sources: `CONTEXT.md`, `STACK.md`, `docs/spec/portfolio-v3.md`,
`docs/spec/portfolio-v3-implementation.md`, `docs/development.md`, and the accepted
ADRs under `docs/adr/`. The companion data model is [`erd.md`](./erd.md).

## System architecture

The five primary seams are the public web application, the HTTP/API boundary, the
application/domain boundary, the infrastructure boundary, and the public content
representation boundary. This diagram shows responsibilities and boundaries, not file
structure.

```mermaid
flowchart TD
    subgraph people["People"]
        visitor["Visitor"]
        owner["Portfolio owner, an authenticated User"]
    end

    subgraph web["React + Vite web application"]
        publicui["Public Portfolio, homepage and Project index and Project detail and contact form"]
        adminui["Administration under the /admin route tree, Project management and Inquiry list"]
        serverstate["Server-state layer, React Router Data Mode loaders on public routes and TanStack Query throughout"]
        httpclient["Shared HTTP client, unwraps the response envelope and raises typed errors"]
        authclient["Authentication client, sole owner of session state in the browser"]
    end

    subgraph httpboundary["HTTP / API boundary"]
        v1["/api/v1, uniform response envelope with schema-validated requests and responses"]
        authroutes["Authentication route subtree, documented exception to the envelope"]
    end

    subgraph api["Fastify REST API"]
        publicroutes["Public routes, published Project reads and Inquiry submission"]
        adminroutes["Protected administration routes, session guard and authorization boundary"]
    end

    domain["Application / domain logic: public visibility rule, publish rule and lifecycle transitions, Inquiry and Media operations, mapping stored Projects to their public representation"]

    subgraph infra["Infrastructure"]
        db[("PostgreSQL, source of truth for managed Portfolio content")]
        storage[("S3-compatible object storage, Media binaries")]
        authinfra["Authentication and session infrastructure, HTTP-only cookie sessions"]
        email["Managed transactional email provider"]
    end

    visitor --> publicui
    owner --> adminui
    publicui --> serverstate
    adminui --> serverstate
    adminui --> authclient
    serverstate --> httpclient
    httpclient -->|HTTP| v1
    authclient -->|HTTP with credentials| authroutes
    v1 --> publicroutes
    v1 --> adminroutes
    authroutes --> authinfra
    adminroutes -->|verifies the session| authinfra
    publicroutes --> domain
    adminroutes --> domain
    domain --> db
    domain --> storage
    domain --> email
    authinfra --> db
```

Notes on the boundaries:

- The public Portfolio and the administration application are **one** React
  application; administration lives under an `/admin` route tree.
- The web application holds no competing authoritative copy of Portfolio content. Page
  structure, animation and art-directed presentation stay developer-owned; managed
  content comes from the API.
- Route handlers own transport concerns — request validation, authentication checks,
  status codes, response serialization. Meaningful rules live in application/domain
  code. Provider and persistence concerns live in infrastructure-facing code.
- Public reads and protected administrative mutations are explicit authorization
  boundaries inside one API application (ADR-0004).
- The authentication subtree emits its own response shape and is reached through the
  authentication client rather than the shared HTTP client, so it never passes through
  the envelope path (ADR-0011).
- WebGL and motion are progressive enhancement inside the web application (ADR-0008);
  they are not a system boundary and so do not appear here.

## Public Project request

A visitor opening a published Project detail page. The index follows the same path
against the collection endpoint.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant B as Browser
    participant RR as React Router route loader
    participant Q as TanStack Query cache
    participant HC as Shared HTTP client
    participant R as Fastify public Project route
    participant D as Application / domain logic
    participant PG as PostgreSQL

    V->>B: opens the public Project URL for a slug
    B->>RR: navigation into the public Project route
    RR->>Q: ensure query data for this Project key
    alt cached and fresh
        Q-->>RR: cached Project representation
    else needs fetching
        Q->>HC: run the query function
        HC->>R: GET the public Project by slug
        R->>R: validate the route parameter against the route schema
        R->>D: read the published Project for this slug
        D->>PG: select the Project joined to its Technologies and Categories
        Note over D,PG: visibility rule, only Published Projects that are not soft-deleted
        alt a matching published Project exists
            PG-->>D: Project row and its taxonomy rows
            D-->>R: public Project representation, slug as identifier, no internal id or lifecycle field
            R->>R: serialize against the declared response schema
            R-->>HC: 200 with the data envelope
            HC-->>Q: unwrapped representation
        else no match, wrong state, soft-deleted, or unknown slug
            PG-->>D: no row
            D-->>R: not found
            R-->>HC: 404 with the error envelope
            HC-->>Q: typed API error
        end
        Q-->>RR: resolved or rejected
    end
    RR->>B: render the route
    B->>Q: component reads the same query key
    Q-->>B: Project representation
    B-->>V: Project detail page, or the route error boundary on 404
```

Notes:

- Public routes are loader-driven: the loader primes the cache and the component reads
  the same key, which is what keeps prerendering the public Project pages possible
  later (ADR-0013). Pending and error states on public routes use React Router's own
  navigation state and error boundary.
- The public representation is a separate contract from the stored row. The response
  schema is what actually leaves the process, so internal fields cannot leak by
  accident.
- A Draft, an Archived, a soft-deleted and a nonexistent Project are indistinguishable
  from outside — all four are the same 404, so no hidden work is revealed.
- The public Project index is unpaginated and unfiltered at this stage, ordered by most
  recent publication. Pagination, filtering and server-side caching are future
  additions, and the envelope leaves room for pagination metadata without a breaking
  change.

## Admin Project workflow

An authenticated Portfolio owner creating or updating a Project.

```mermaid
sequenceDiagram
    autonumber
    actor O as Portfolio owner
    participant AC as Authentication client
    participant F as Admin Project form
    participant Q as TanStack Query
    participant HC as Shared HTTP client
    participant G as Protected route guard
    participant R as Fastify admin Project route
    participant D as Application / domain logic
    participant PG as PostgreSQL

    O->>AC: navigates into /admin
    AC->>AC: resolve the session before any admin route renders
    alt no valid session
        AC-->>O: redirect to sign in
    else session valid
        AC-->>F: render the Project form
        O->>F: fills the form, slug suggested from the title and overridable
        F->>F: client-side schema validation
        F->>Q: submit through a mutation
        Q->>HC: create or update the Project
        HC->>R: POST or PATCH the admin Project resource with credentials
        R->>G: authenticate and authorize the request
        alt session missing or expired
            G-->>HC: 401 with the error envelope
            HC-->>Q: typed API error, session backstop signs the owner out
        else authorized
            G-->>R: request may proceed
            R->>R: validate the request body against the route schema
            alt request invalid
                R-->>HC: 422 with per-field error details
                HC-->>Q: typed API error
                Q-->>F: field errors mapped onto the form
            else request valid
                R->>D: create or update the Project
                Note over D: domain rules, slug uniqueness, slug frozen while Published,<br/>replace-the-set semantics for Technologies and Categories
                D->>PG: write the Project row and its taxonomy links
                alt a domain rule rejects the write
                    PG-->>D: no change
                    D-->>R: conflict or rule violation
                    R-->>HC: 409 or 422 with the error envelope
                    HC-->>Q: typed API error
                    Q-->>F: error surfaced on the offending field or on the form
                else write accepted
                    PG-->>D: persisted Project
                    D-->>R: administrative Project representation
                    R-->>HC: 200 or 201 with the data envelope
                    HC-->>Q: unwrapped representation
                    Q->>Q: invalidate the affected Project queries
                    Q-->>F: refreshed server state and success feedback
                end
            end
        end
    end
```

Notes:

- Administration routes are component-driven: components fetch and mutate, and
  invalidation on success is the single cache-invalidation path (ADR-0013). Pending and
  error states here come from the query layer, not from router navigation state.
- Authentication is checked twice on purpose — once before the admin subtree renders,
  and once by the HTTP client as a backstop for a session that expires mid-screen.
  Neither replaces the server-side guard, which is the actual authorization boundary.
- Server-side validation is independent of the form's validation. The backend does not
  trust the browser.
- Technologies are created inline from this form through their own find-or-create
  operation before the Project write, so the Project payload carries identifiers only.
  Categories are a fixed set with no creation path.
- The administrative representation is richer than the public one: it is the owner's
  view of the record, including lifecycle state.

## Project publication and preview

Draft, authenticated preview, and public published content are three different things.
This diagram shows all three against one Project.

```mermaid
sequenceDiagram
    autonumber
    actor O as Portfolio owner
    actor V as Visitor
    participant A as Administration application
    participant P as Public web application
    participant R as Fastify API
    participant D as Application / domain logic
    participant PG as PostgreSQL

    Note over O,PG: 1. Draft content is private
    O->>A: saves a half-written Project
    A->>R: write through the protected admin route
    R->>D: create or update
    D->>PG: Project stored in the Draft state
    V->>P: opens the Project slug
    P->>R: GET the public Project by slug
    R->>D: apply the public visibility rule
    D->>PG: look for a published, non-deleted Project
    PG-->>D: no match, the Project is a Draft
    D-->>R: not found
    R-->>P: 404
    P-->>V: not found, the Draft is not revealed

    Note over O,PG: 2. Authenticated preview
    O->>A: opens the Project in administration
    A->>R: GET the Project through the protected admin route
    R->>D: read regardless of lifecycle state, authorization already established
    D->>PG: read the Project and its taxonomy
    PG-->>D: Draft Project
    D-->>R: administrative Project representation
    R-->>A: 200 with the data envelope
    A-->>O: the owner can review Draft content while authenticated

    Note over O,PG: 3. Publication
    O->>A: requests the publish transition
    A->>R: dedicated publish transition on the admin Project resource
    R->>D: run the publish rule for this stored Project
    alt wrong current state for this transition
        D-->>R: invalid state transition
        R-->>A: 409 with the error envelope
        A-->>O: the transition is not legal from the current state
    else the Project is not yet publishable
        Note over D: publish rule, non-empty summary,<br/>at least one Case study section, at least one Category
        D-->>R: not publishable, one detail entry per unmet requirement
        R-->>A: 422 with the error envelope
        A-->>O: the owner is told exactly what is missing
    else publishable
        D->>PG: set the state to Published and stamp the publication time
        PG-->>D: updated Project
        D-->>R: administrative Project representation
        R-->>A: 200 with the data envelope
        A-->>O: the Project is now public
    end

    Note over V,PG: 4. Public published content
    V->>P: opens the Project slug again
    P->>R: GET the public Project by slug
    R->>D: apply the public visibility rule
    D->>PG: look for a published, non-deleted Project
    PG-->>D: the Project row
    D-->>R: public Project representation
    R-->>P: 200 with the data envelope
    P-->>V: the published Project page
```

Notes:

- **Draft content** is reachable only through the protected administration routes.
  **Public published content** is reachable only through the public routes, and only
  while the Project is Published and not soft-deleted. Archived Projects are likewise
  absent from public presentation.
- **Authenticated preview** today is the administration application reading the Project
  through the protected route — the same authorization boundary, not a second one. A
  dedicated authenticated draft preview of the *public* presentation belongs to the
  publishing-and-preview slice; because a slug is allocated at creation, that preview
  will have a stable slug to address a Draft by. Its mechanism is **not yet specified**
  and is deliberately absent from this diagram.
- Lifecycle changes go through dedicated transitions rather than a generic update
  carrying a new state. The legal graph is Draft to Published, Published to Draft,
  Published to Archived, and Archived to Draft (ADR-0012). Unpublishing is what makes a
  frozen published slug correctable.
- Two failure modes stay distinct: a transition requested from the wrong current state
  is a conflict, while failing the publish rule is an unprocessable request carrying one
  detail entry per unmet requirement.
- Publication time is overwritten on every transition into Published.
- The exact transition endpoint paths are finalized during implementation; the
  specification's endpoint list is explicitly illustrative.

## Inquiry submission

A visitor contacting the Portfolio owner, without an account.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant F as Contact form
    participant HC as Shared HTTP client
    participant R as Fastify public Inquiry route
    participant D as Application / domain logic
    participant PG as PostgreSQL
    participant M as Managed transactional email provider
    actor O as Portfolio owner

    V->>F: fills in the contact form
    F->>F: client-side schema validation
    F->>HC: submit
    HC->>R: POST the public Inquiry resource
    R->>R: rate limiting on this public write endpoint
    alt rate limited
        R-->>HC: error envelope
        HC-->>F: typed API error surfaced on the form
    else accepted for processing
        R->>R: validate the request body against the route schema
        alt request invalid
            R-->>HC: 422 with per-field error details
            HC-->>F: field errors mapped onto the form
        else request valid
            R->>D: create the Inquiry
            D->>PG: persist the Inquiry
            PG-->>D: persisted Inquiry
            Note over D,M: the Inquiry is persisted before any notification handling,<br/>so a notification failure cannot lose the request
            D->>M: dispatch the owner notification through the notification boundary
            M-->>O: notification email
            D-->>R: result
            R-->>HC: success envelope
            HC-->>F: confirmation
            F-->>V: the Inquiry was received
        end
    end
    O->>O: reviews the Inquiry later in the administration Inquiry list
```

Notes:

- The Inquiry is validated and persisted **before** notification handling. Persistence
  is what the visitor's request depends on; the notification is how the owner hears
  about it.
- Notification delivery sits behind its own boundary so that asynchronous processing can
  be introduced later without changing the Inquiry model. There is **no persistent
  background worker or queue** at this milestone, and none is implied here — dispatch is
  initiated within the request.
- Public write endpoints, Inquiry and authentication in particular, are rate limited.
- The Inquiry field set, its status model, the choice of transactional email provider,
  the notification payload and the rate-limiting thresholds are **not yet specified**;
  they belong to the Inquiry slice. This diagram shows only the path the documentation
  has settled.
- An Inquiry does not make its sender a Client.

## Media upload

The current upload path, in which files pass through the API.

```mermaid
sequenceDiagram
    autonumber
    actor O as Portfolio owner
    participant A as Administration application
    participant R as Fastify admin Media route
    participant D as Application / domain logic
    participant S as Storage boundary
    participant OS as Object storage
    participant PG as PostgreSQL

    O->>A: selects a file for a Project
    A->>R: POST the file to the Project Media resource as multipart form data
    R->>R: authenticate and authorize the request
    R->>R: validate the upload against the route rules
    alt upload rejected
        R-->>A: error envelope
        A-->>O: the upload is refused with a reason
    else upload accepted
        R->>D: add a Media asset to this Project
        D->>S: store the binary
        S->>OS: put the object
        OS-->>S: stored object reference
        S-->>D: storage reference
        D->>PG: persist the Media asset metadata and its Project relationship
        PG-->>D: persisted Media asset
        D-->>R: Media asset representation
        R-->>A: success envelope
        A-->>O: the asset is associated with the Project and can be ordered
    end
```

Notes:

- The binary lives in object storage; the database stores metadata and the relationship
  to the Project (ADR-0005). No binary is stored relationally.
- The storage boundary is provider-independent on purpose, so the storage provider can
  change without touching Project behaviour.
- **Future direction, not current architecture:** signed direct browser-to-object-storage
  uploads are the eventual path for larger files, and image transformation or CDN
  delivery is a later optimization. Neither is part of the current milestone, and
  managed video infrastructure is deliberately outside the current stack. The diagram
  above is the path being built.
- Accepted media types, size limits, the ordering model and the public Media
  representation are **not yet specified**; they belong to the Media slice.
