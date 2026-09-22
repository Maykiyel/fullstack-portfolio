# Portfolio V3 stack

## Frontend

- React
- TypeScript
- Vite
- React Router 7 Data Mode
- TanStack Query
- Axios
- React Hook Form
- Zod

## Styling and UI

- Tailwind CSS v4
- shadcn/ui
- Base UI
- Lucide
- custom Portfolio components and CSS where appropriate

shadcn is primarily an accessible component foundation for the administration application. The public Portfolio's visual identity is project-owned.

## Motion and graphics

- GSAP
- Lenis
- Three.js
- React Three Fiber
- Drei

Three.js/WebGL is a progressive enhancement. Essential content and navigation must remain usable without it.

## Backend

- Node.js
- TypeScript
- Fastify
- REST
- Drizzle
- PostgreSQL
- Better Auth

## Testing

- Vitest
- React Testing Library
- Playwright

## Tooling

- pnpm workspaces
- ESLint
- Prettier
- Docker Compose
- CI

## Infrastructure

- managed PostgreSQL
- S3-compatible object storage
- managed transactional email
- managed application/frontend hosting

## Deferred / conditional technologies

### Zustand

Not part of the initial stack. Add only when a concrete global client-state problem appears.

### Mux

Not part of the initial stack. Revisit if video becomes a major content type and the Portfolio needs managed transcoding, adaptive streaming, large-file workflows, or playback analytics.

### Image transformation/CDN

Deferred until actual image-delivery requirements justify it.

### Background worker / queue

Deferred from the first milestone. The application should keep notification dispatch isolated so a worker can be added later without changing the Inquiry model.
