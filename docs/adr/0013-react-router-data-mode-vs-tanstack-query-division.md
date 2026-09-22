# Divide responsibility between React Router 8 Data Mode and TanStack Query

The split follows the public/admin line, not a single blanket rule. Public routes (Project index/detail) are **loader-driven**: each `loader` calls `queryClient.ensureQueryData(options)` and the component reads the same key via `useQuery`/`useSuspenseQuery`, so the fetch is owned by navigation and resolves from Query's cache. `/admin` routes are **component-driven**: routes render immediately, components fetch and mutate via `useQuery`/`useMutation`, and `onSuccess: () => queryClient.invalidateQueries(...)` is the only cache-invalidation path — there is no RR action driving revalidation to compete with it. The split is deliberate, not drift: it's the one place in this slice where prerendering (a standing architectural requirement for the public Project pages) actually depends on the loader being the thing that fetches, and nothing about `/admin` carries that constraint.

Pending/error UI follows the same line: RR's `useNavigation`/`ErrorBoundary` for public routes, Query's `isPending`/`isError` for `/admin`, so only one loading treatment is ever active on a given route.

Session state is owned entirely by Better Auth's `authClient.useSession()` (nanostores-backed), never mirrored into TanStack Query — Query is reserved for domain data. Sign-out calls `queryClient.clear()` so no cached admin data outlives the session that fetched it.

Auth failures are caught twice, deliberately: a `middleware` on the `/admin` layout route calls `authClient.getSession()` before any child route renders (RR8 client middleware runs on every navigation into that subtree even when the child routes carry no loaders — confirmed against the React Router docs), and the shared Axios instance (see [#7](https://github.com/Maykiyel/fullstack-portfolio/issues/7)) carries a `401` response interceptor as the backstop for a session that expires while already on an admin screen, which the middleware cannot catch since it only runs on navigation. Every `/admin` Axios call sets `withCredentials: true` explicitly — Axios defaults to `false`, Better Auth's client defaults `credentials: "include"`, and the mismatch 401s silently if missed.

## Considered options

- **Loader-driven everywhere** (prefetch-and-prime via `ensureQueryData` on every route): rejected — `/admin` is mutation-heavy and gains nothing from blocking navigation on a fetch, while paying the cost of keeping every admin loader in sync with the query keys its components read.
- **Component-driven everywhere** (RR loaders unused): rejected for public routes specifically — it forecloses the prerendering path the map's Notes require staying open for.
- **TanStack Query owns session state** via `authClient.getSession()` as a `queryFn`: rejected — it fights Better Auth's own cache instead of reusing the cross-tab sign-out sync Better Auth already provides for free.
- **Single auth-failure mechanism** (interceptor only, or middleware only): rejected — middleware alone misses a session dying mid-screen (no navigation to trigger it); interceptor alone means an authenticated shell renders before the dead session is discovered.

## Consequences

- Two different loading/error idioms exist in the same codebase (RR-native on public routes, Query-native on `/admin`). This is intentional, but it means a route's idiom isn't guessable from the rest of the app — a reader has to know which subtree they're in.
- If `/admin` ever gains a route that benefits from prerendering or loader-blocked navigation, it inherits the public pattern rather than the admin default — the line is drawn by requirement, not by path prefix, even though today the two happen to coincide.
