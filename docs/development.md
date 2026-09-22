# Development workflow

## Purpose

This document defines the lightweight software development lifecycle for Portfolio V3.

The process is intentionally small. The project is a personal portfolio and learning project, so process should protect architectural coherence without becoming bureaucracy.

## Development loop

```text
Idea / requirement
      ↓
Domain clarification
      ↓
Specification
      ↓
ADR when justified
      ↓
Implementation plan / vertical slice
      ↓
Implementation
      ↓
Behavior-focused tests
      ↓
Quality gates
      ↓
Review
      ↓
CI
      ↓
Deploy
      ↓
Observe and refine
```

## Vertical slice progression

The following is the canonical implementation order for V3. It is a guide, not a requirement that every slice use identical internal structure.

The first item is infrastructure foundation rather than a product feature. The first full-stack learning slice combines authentication and Projects because the administration workflow depends on an authenticated session.

### 0. Foundation

Establish the working repository before building product features:

```text
monorepo
→ web application
→ API application
→ React Router
→ Tailwind / shadcn
→ Fastify
→ Docker PostgreSQL
→ Drizzle
→ migrations
→ development tooling
```

Completion means the applications start independently, the API responds to a health endpoint, PostgreSQL is available locally, and Drizzle can run a migration.

### 1. Authentication + Projects

This is the first real vertical slice and the main backend-learning slice.

```text
admin login
→ authenticated session
→ Project form
→ API
→ application logic
→ PostgreSQL
→ public Project API
→ public Project page
```

Build:

- authentication and protected administration;
- Project creation and editing;
- Technology and Category relationships;
- Project listing and detail pages;
- Draft and Published behavior;
- server-side validation;
- API integration tests for important Project behavior.

Completion means an authenticated owner can create and manage a Project and that a published Project can be viewed through the public site.

### 2. Inquiries

Apply the architecture learned from Projects to the public contact workflow.

```text
public contact form
→ Inquiry API
→ validation
→ PostgreSQL
→ admin Inquiry list
→ owner notification
```

Build the initial Inquiry lifecycle and transactional email notification. Keep notification delivery isolated so asynchronous processing can be introduced later.

Completion means a visitor can submit a valid Inquiry and the owner can view it in administration.

### 3. Media

Extend Projects with managed Media assets.

```text
admin upload
→ multipart API
→ object storage
→ Media metadata
→ Project relationship
→ public Project media
```

Start with API-mediated uploads. Direct browser-to-object-storage uploads are a later optimization for larger assets.

Completion means a Media asset can be uploaded, associated with a Project, ordered, and displayed publicly.

### 4. Publishing and preview

Strengthen the Project lifecycle once the basic content flow works.

Build:

- authenticated draft preview;
- publication metadata;
- stronger publish validation;
- public visibility rules;
- the initial slug replacement redirect behavior.

Completion means the owner can safely prepare a Project privately, preview it, publish it, and remove it from normal public presentation by archiving it.

### 5. Administration polish

Turn the functional administration area into a reliable internal product.

Focus on:

- tables;
- forms;
- loading states;
- empty states;
- validation states;
- error handling;
- responsive behavior;
- navigation;
- usable Media management.

Do not turn this into a second showcase website. The admin should be polished because it is used frequently, not because it needs to compete visually with the public Portfolio.

### 6. Public visual experience

Once real Projects and Media exist, build the art-directed Portfolio experience around them.

Progression:

```text
visual system
→ typography / layout
→ responsive composition
→ GSAP
→ Lenis
→ Three.js fundamentals
→ React Three Fiber / Drei
→ integrated WebGL experiences
```

WebGL remains progressive enhancement. Essential content and navigation must remain usable without it.

Completion means the public Portfolio has the intended visual identity, motion language, and Project presentation while remaining usable and performant.

### 7. Production hardening

Finish the system for real-world use.

Focus on:

- accessibility review;
- performance work;
- WebGL performance;
- image/video delivery;
- CI quality gates;
- deployment;
- security hardening appropriate to the project;
- operational safeguards justified by actual use.

Deferred capabilities such as image transformation, Mux, direct object-storage uploads, background workers, search, and advanced analytics should be added only when the problem they solve actually appears.

## 1. Clarify the domain

Before implementing a feature, determine which existing domain concepts it uses.

If the feature introduces a new concept or changes the meaning of an existing concept, update `CONTEXT.md` before implementation proceeds.

Use concrete scenarios to resolve ambiguous language.

## 2. Define the work

Use the relevant specification for the feature or milestone.

A new implementation task should not silently redefine the Portfolio domain or contradict the architecture specification.

If the requested behavior is genuinely new, update the appropriate specification before coding when practical.

## 3. Record architectural decisions selectively

Create an ADR only when all of the following are true:

1. The decision is hard to reverse.
2. A future developer could reasonably wonder why it was done that way.
3. There was a meaningful alternative or trade-off.

Do not create an ADR for ordinary implementation details.

## 4. Implement vertical slices

Prefer end-to-end feature slices rather than implementing entire technical layers with no working feature attached to them.

For example:

```text
Project creation
→ admin form
→ API
→ application rule
→ database
→ public Project representation
```

The progression above is the preferred order, but individual slices may take different internal paths when their requirements differ.

## 5. Work with seams

A seam is a responsibility boundary, not a requirement to create a specific class or abstraction.

The current boundaries are:

```text
Web application
      ↓ HTTP
REST API
      ↓
Application / domain logic
      ↓
Infrastructure
      ├── PostgreSQL
      ├── object storage
      ├── authentication/session infrastructure
      └── transactional email
```

Use these boundaries to decide where behavior belongs:

- web code owns presentation and client interaction;
- HTTP routes own transport concerns such as request validation, authentication checks, status codes, and response serialization;
- application/domain code owns meaningful business rules;
- infrastructure code owns provider and persistence concerns.

Do not create elaborate layers solely to satisfy the diagram. Keep the implementation as simple as the feature allows.

The HTTP/API boundary is the primary backend testing seam because it exercises meaningful system behavior without coupling tests to internal implementation details.

## 6. Test behavior

Use the highest useful testing seam.

The HTTP/API boundary is the primary backend seam.

Prefer tests that describe behavior rather than implementation details.

Use unit tests when isolated logic is genuinely valuable and browser-level tests only for high-value workflows.

## 7. Quality gates

Before a change is complete, run:

- typecheck
- lint
- tests
- build

Add additional checks when they provide real value.

## 8. Review

Review the change for:

- correctness
- domain terminology
- API behavior
- authorization boundaries
- accessibility
- visual behavior
- responsive behavior
- performance
- scope creep
- documentation consistency

The code should not become more abstract than the problem requires.

## 9. CI

CI should enforce the basic quality gates automatically.

At minimum:

```text
typecheck
lint
tests
build
```

Selected security or dependency checks may be added when justified.

## 10. Deployment

Use managed infrastructure initially.

Keep production configuration separate from source code and validate required configuration at application startup.

Use versioned database migrations for schema changes.

## 11. Documentation synchronization

After implementation:

- update `CONTEXT.md` if the domain language changed;
- update the relevant spec if scope or behavior changed;
- add or update an ADR if a qualifying architectural decision changed.

Do not document implementation details that future readers can understand directly from the code.

## Definition of done

A feature is done when:

- the requested behavior works;
- domain language is consistent;
- server-side validation exists where needed;
- meaningful tests exist;
- typecheck passes;
- lint passes;
- build passes;
- no unrelated changes are included;
- relevant documentation is synchronized;
- CI passes.
