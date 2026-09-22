# Portfolio V3

## Purpose

Portfolio V3 is a personal professional portfolio and full-stack learning project.

The public site is the primary product. It should present the owner's work through a highly polished, Awwwards-style experience while making professional contact easy.

A private administration application supports content management and demonstrates credible full-stack engineering.

The system should be capable of growing into a broader personal professional platform without requiring that functionality in the first release.

## Product goals

### Public experience

The public site should:

- present the owner's work through a strong visual identity
- provide a homepage, Project index, and Project detail pages
- support rich structured Case studies
- use deliberate animation and WebGL/3D experiences where they genuinely improve the presentation
- make professional information easy to understand
- make starting an Inquiry easy
- remain accessible and usable when enhanced visual effects are unavailable
- remain performant despite rich visual content

### Content management

The owner should be able to manage Projects without editing source files.

The administration experience should eventually support:

- Project creation and editing
- publication and archiving
- Technologies and Categories
- Media assets
- authenticated previews
- selected professional information
- Inquiries

### Client contact

Visitors should be able to submit an Inquiry without creating an account.

Inquiries are stored so the owner can review them later and are accompanied by an email notification through a managed transactional email provider.

### Technical learning

The project should provide practical experience with:

- backend architecture
- REST API design
- PostgreSQL and relational modeling
- authentication and authorization
- object storage and media handling
- application/domain boundaries
- testing
- CI/CD and deployment

Infrastructure complexity should remain secondary to application engineering.

## Domain model

The canonical terminology is defined in `CONTEXT.md`.

The primary concepts are:

- Portfolio
- Project
- Case study
- Technology
- Category
- Media asset
- Inquiry
- User
- Client
- Availability

Projects are the central content entity. A Case study is content belonging to a Project, not a separate primary work entity.

Technologies and Categories are intentionally separate. A Technology describes a tool, technology, or capability used by a Project. A Category describes the professional nature of the work.

An Inquiry is not automatically a Client relationship.

## Content lifecycle

Projects use three primary lifecycle states:

```text
Draft → Published → Archived
```

Draft Projects are private. Published Projects are publicly presented. Archived Projects are retained but removed from normal active presentation.

Soft deletion is represented separately from lifecycle state so archival and deletion are not conflated.

## Architectural shape

V3 is a monorepo containing a React/Vite web application and a separate TypeScript/Fastify API.

```text
Public/Admin web
      ↓
HTTP API
      ↓
Application/domain logic
      ↓
Infrastructure
 ┌────┼────┬────┐
 ▼    ▼    ▼    ▼
DB  storage auth email
```

The primary application seams are:

1. Public web application
2. HTTP/API boundary
3. Application/domain boundary
4. Infrastructure boundary
5. Public content representation boundary

The HTTP/API boundary is the primary automated testing seam.

## Frontend stack

- React
- TypeScript
- Vite
- React Router 7 in Data Mode
- TanStack Query
- Axios
- React Hook Form
- Zod
- Tailwind CSS v4
- shadcn/ui using the current Base UI foundation
- Lucide for general-purpose interface icons
- GSAP
- Lenis
- Three.js
- React Three Fiber
- Drei

The public Portfolio should be mostly composed from custom components built with the project's design language. shadcn/ui is primarily an accessible component foundation for the administration application and for interaction primitives that do not define the Portfolio's visual identity.

React Three Fiber is the default React integration for Three.js. Three.js/WebGL is an enhancement layer, not a prerequisite for essential content or navigation.

## Backend stack

- Node.js
- TypeScript
- Fastify
- REST
- Drizzle
- PostgreSQL
- Better Auth

The API uses `/api/v1` versioning.

Public reads and protected administrative mutations are separate authorization concerns within the same API application.

## Data ownership

PostgreSQL is the source of truth for managed Portfolio content.

The database owns Projects, Technologies, Categories, Project relationships, Media metadata, Inquiries, and Users.

Media binaries are stored in object storage. The database stores metadata and relationships.

The web application does not maintain a competing authoritative copy of Portfolio content.

Page structure, animation, visual composition, and highly art-directed presentation remain developer-owned where appropriate.

## Media strategy

The first milestone uses object storage for images and smaller video assets. Uploads initially pass through the API using multipart/form-data.

The long-term upload path may use direct browser-to-object-storage uploads with signed authorization.

Image transformation/CDN delivery is a later optimization.

Managed video infrastructure such as Mux is deliberately not part of the initial stack. It may be introduced later if the Portfolio develops significant video requirements such as large uploads, adaptive streaming, transcoding, or video playback analytics.

## Authentication

Authentication uses established infrastructure with secure HTTP-only cookie sessions. Custom password hashing/session cryptography is out of scope.

Public registration is disabled initially. One practical administrator account is sufficient for the first release, while the User model remains capable of supporting additional Users later.

## Public rendering and resilience

The first functional milestone may use normal client-side rendering for the public site.

The architecture should leave room for prerendering/static generation of public Project pages later.

Client caching begins with TanStack Query. Server-side caching and dedicated public read models are future optimizations.

A resilient static/fallback representation of public content may be introduced later so a transient API failure does not necessarily make the Portfolio unusable.

## Testing and quality

Use Vitest, React Testing Library, and Playwright for behavior-focused testing at appropriate seams.

CI should at minimum run typechecking, linting, tests, and builds.

The initial quality target is practical production quality: validation, authentication, authorization, migrations, secure configuration, targeted rate limiting, testing, and deployment.

## Delivery direction

### First milestone

Deliver a complete functional foundation:

- public homepage
- Project index
- Project detail
- authentication
- Project CRUD
- public Project API
- Inquiry submission and administration
- PostgreSQL and migrations
- basic Media upload
- email notification
- tests
- CI
- production deployment

### V3 target

After the functional foundation, improve:

- visual polish and animation
- administration UX
- richer Project editing
- authenticated preview
- Media management
- public caching
- image optimization
- professional content management
- Inquiry workflow
- historical slug redirects
- selected production hardening

### Future direction

Potential future capabilities include flexible content blocks, richer permissions, full-text search, asynchronous jobs, advanced analytics, shareable previews, and richer professional workflows.

These are directions, not commitments.

## Non-goals

V3 is not intended to become:

- a generic CMS
- a SaaS product
- a CRM
- a multi-tenant platform
- a full analytics platform
- self-managed infrastructure
- custom authentication infrastructure
- custom storage infrastructure
- custom email infrastructure
- a block editor before the structured Project model proves insufficient
