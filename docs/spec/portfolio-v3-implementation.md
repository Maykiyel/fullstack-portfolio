# Portfolio V3 implementation specification

## Problem Statement

The existing Portfolio is a frontend-only application whose content is managed in source code. This makes routine Project updates unnecessarily dependent on development and deployment work and provides no proper workflow for receiving and managing client Inquiries.

Portfolio V3 should preserve the visual ambition of the existing Portfolio while introducing a real application backend and private administration experience.

## Solution

Build V3 as a pnpm monorepo with a React/Vite web application and a TypeScript/Fastify REST API.

Use PostgreSQL as the source of truth for managed Portfolio content and object storage for Media files. Use authenticated administrative routes for Project and Inquiry management and public routes for published Project content and Inquiry submission.

The first milestone should prove the complete path from public UI to API to persistence and back to the public UI, then add contact and Media workflows.

## User Stories

1. As a visitor, I want to understand the Portfolio from the homepage, so that I can quickly determine what the owner does.
2. As a visitor, I want to browse Projects, so that I can explore the owner's work.
3. As a visitor, I want to view a Project detail page, so that I can understand the work in depth.
4. As a visitor, I want Project pages to include structured Case study content, so that I can understand the project's context and process.
5. As a visitor, I want to see Technologies and Categories, so that I can understand both the technical and professional scope of a Project.
6. As a visitor, I want to see Project Media assets, so that I can evaluate the work visually.
7. As a visitor, I want only Published Projects to be publicly visible, so that incomplete work is not exposed.
8. As a visitor, I want to submit an Inquiry without registration, so that contacting the owner is easy.
9. As a visitor, I want validation feedback on the Inquiry form, so that I can correct invalid information.
10. As a Portfolio owner, I want to authenticate into a private administration application, so that management operations are protected.
11. As a Portfolio owner, I want to create and edit Projects, so that I can manage my Portfolio without editing source code.
12. As a Portfolio owner, I want to publish and archive Projects, so that I can control public presentation.
13. As a Portfolio owner, I want to manage Technologies and Categories, so that Project metadata stays consistent.
14. As a Portfolio owner, I want to upload and order Media assets, so that Project presentation can be managed through the administration area.
15. As a Portfolio owner, I want to preview unpublished Projects while authenticated, so that I can verify content before publishing.
16. As a Portfolio owner, I want to review submitted Inquiries, so that client requests are not lost.
17. As a Portfolio owner, I want a notification when a new Inquiry is created, so that I can respond promptly.
18. As a Portfolio owner, I want the Inquiry data model to support a richer workflow later, so that the application can grow without becoming a CRM immediately.
19. As a developer, I want API validation independent of frontend validation, so that the backend does not trust the browser.
20. As a developer, I want versioned database migrations, so that environments can reproduce schema changes.
21. As a developer, I want API tests to exercise meaningful behavior, so that implementation can evolve without losing confidence.
22. As a developer, I want the public and administrative parts of the API to have explicit authorization boundaries, so that public access cannot perform administrative mutations.
23. As a developer, I want the Media storage boundary separated from Project behavior, so that storage providers can change later.
24. As a developer, I want the public representation of a Project separated from its database record, so that persistence details do not become API contracts.
25. As a developer, I want a small, focused dependency set, so that learning remains centered on application and backend engineering rather than framework sprawl.

## Implementation Decisions

### Repository and tooling

- Use a pnpm workspace monorepo.
- Keep `apps/web` and `apps/api` as separate applications.
- Do not create shared packages initially unless a concrete reuse case appears.
- Use TypeScript across web and API.
- Use ESLint and Prettier for code quality and formatting.
- Use Docker Compose for local infrastructure such as PostgreSQL.
- Use Vitest, React Testing Library, and Playwright for testing.

### Frontend

Use:

- React
- Vite
- React Router 7 Data Mode
- TanStack Query
- Axios
- React Hook Form
- Zod
- Tailwind CSS v4
- shadcn/ui with Base UI
- Lucide
- GSAP
- Lenis
- Three.js
- React Three Fiber
- Drei

Use React Router Data Mode for route-level loaders/actions and navigation state where useful. TanStack Query remains the primary server-state/cache layer. Do not mirror server state into Zustand. Zustand is deferred until a real global client-state problem exists.

Use Tailwind and custom components for the public visual language. Use shadcn primarily for the administration application and reusable interaction primitives.

Use React Three Fiber as the default React integration for Three.js. Keep WebGL progressively enhanced: essential content, navigation, and information architecture must remain usable without WebGL.

Do not introduce Framer Motion solely for convenience when GSAP already covers the project's animation needs.

### Backend

Use:

- Node.js
- TypeScript
- Fastify
- REST
- Drizzle
- PostgreSQL
- Better Auth

Organize the API by feature modules with a separate infrastructure layer.

Keep route handlers focused on HTTP concerns. Put application rules in application/domain operations. Keep database, object-storage, authentication-provider, and email-provider concerns in infrastructure-facing code.

### API contract

Use `/api/v1`.

Representative public endpoints:

```text
GET /api/v1/projects
GET /api/v1/projects/:slug
POST /api/v1/inquiries
```

Representative protected administration operations:

```text
GET    /api/v1/admin/projects
POST   /api/v1/admin/projects
GET    /api/v1/admin/projects/:id
PATCH  /api/v1/admin/projects/:id
GET    /api/v1/admin/inquiries
PATCH  /api/v1/admin/inquiries/:id
POST   /api/v1/admin/projects/:id/media
```

These are illustrative and should be finalized during implementation.

Use conventional REST semantics, stable error codes, explicit response schemas, and pagination metadata on administrative collections.

Use OpenAPI documentation, but do not require contract-first development initially.

### Domain and persistence

- Project is the central content concept.
- Case study content belongs to Project.
- Technology and Category are separate normalized concepts.
- Media asset belongs to Project.
- Inquiry is distinct from Client.
- User represents authenticated management access.
- Availability is professional information and is distinct from Inquiry state.
- Projects support Draft, Published, and Archived states.
- Soft deletion uses a deletion timestamp.
- Basic timestamps are required; full audit history is deferred.
- IDs use UUIDv7 or ULID if supported cleanly.
- System timestamps are stored in UTC.
- Migrations are committed to Git.

The initial Project model uses fixed structured sections for Case study content. The model must remain modular enough to evolve toward ordered content blocks later.

### Authentication and authorization

Use Better Auth with secure HTTP-only cookie sessions.

Disable public registration initially.

Seed one practical administrator account for production setup.

Use a simple role model initially while leaving the domain/data model capable of supporting more granular permissions later.

### Media

Initial Media architecture:

```text
Browser
  ↓ multipart/form-data
Fastify API
  ↓
Object storage

PostgreSQL
  ↓
Media metadata and Project relationship
```

The initial implementation may upload files through the API. Keep the storage boundary provider-independent.

The eventual direction for larger files is signed direct-to-object-storage uploads.

For images, start with stored originals and improve delivery later through transformation/CDN services.

For video, start with object storage for small/medium assets. Mux is not part of the initial stack. Introduce Mux later only if video requirements justify transcoding, adaptive streaming, large-file handling, or playback analytics.

### Inquiries and email

The public contact form creates an Inquiry through the API.

The Inquiry is validated and persisted before notification handling.

Use a managed transactional email API. Keep notification delivery isolated enough to introduce a queue/worker later.

Do not build a persistent worker as a first-milestone prerequisite.

Rate-limit public write endpoints, particularly Inquiry and authentication endpoints.

### Rendering and caching

Start with client-side public rendering.

Use TanStack Query for client caching.

Later, consider public page prerendering/static generation, server-side caching, dedicated read models, and resilient static fallbacks based on actual requirements.

### Deployment

Use managed infrastructure.

Initial topology may use separate web and API hosts/subdomains if that is simplest for deployment.

The eventual preferred browser architecture can put the API behind the same origin under `/api` when the hosting setup supports it cleanly.

Use managed PostgreSQL, object storage, and transactional email rather than self-managing those services.

### Testing

Primary seam: HTTP/API boundary.

Test externally observable behavior rather than implementation details.

Protect these behaviors:

- authentication and authorization
- Project CRUD
- publication visibility
- archive/delete behavior
- Inquiry submission
- Inquiry persistence
- notification dispatch
- Media validation and association
- important response validation

Use Playwright selectively for high-value end-to-end flows.

### CI and quality

CI should run:

- typecheck
- lint
- tests
- build

Add security/dependency/quality checks where they provide concrete value.

### Product structure

Public routes initially include:

```text
/
/projects
/projects/:slug
```

The administration application is initially part of the same React application under an `/admin` route tree.

The eventual public information architecture may expand into About, Services, Writing, or other professional content.

### First milestone

The first milestone is complete when the application supports:

```text
Public
- homepage
- Project index
- Project detail

Admin
- authentication
- Project CRUD
- Inquiry list

Backend
- authentication
- Project API
- Inquiry API
- PostgreSQL
- migrations
- basic Media upload
- email notification

Engineering
- validation
- tests
- lint/typecheck
- CI
- production deployment
```

The first milestone does not require the final Awwwards-level polish or advanced media delivery architecture.

## Testing Decisions

The API boundary is the highest useful seam for backend behavior.

Good tests should answer questions such as:

- Can an authenticated User create a Project?
- Does a Draft Project remain hidden from public consumers?
- Does publishing make a valid Project public?
- Does an unauthorized request fail without mutating state?
- Can a visitor submit a valid Inquiry?
- Is an invalid Inquiry rejected?
- Is a submitted Inquiry persisted?
- Is notification dispatch initiated?
- Can a valid Media asset be associated with a Project?
- Are invalid Media uploads rejected?

Avoid tests whose primary purpose is verifying internal call structure or ORM method choices.

## Out of Scope

- generic CMS behavior
- public registration
- full permission-management UI
- full CRM functionality
- full audit history
- block editor in the first milestone
- full-text search
- generalized API query language
- advanced analytics without a concrete goal
- persistent worker infrastructure in the first milestone
- direct-to-object-storage uploads in the first milestone
- image transformation pipeline in the first milestone
- Mux integration in the first milestone
- self-managed production infrastructure
- enterprise observability
- enterprise-wide rate limiting
- reintroducing Next.js solely for SSR
- adding a second animation library for ordinary UI motion

## Further Notes

The public Portfolio remains the product. The backend should exist because it enables genuine management and contact workflows, not because having a backend is inherently better.

The architecture should remain capable of growing into a personal professional platform, but future features should be introduced only when they earn their complexity.

The public design system should be owned by the project. shadcn/ui is a foundation for accessible components, not the visual identity of the Portfolio.

Three.js and React Three Fiber are progressive enhancements. They should not make essential content unavailable to users who cannot or do not run WebGL.
