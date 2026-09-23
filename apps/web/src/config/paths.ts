export const paths = {
  home: { path: "/", getHref: () => "/" },
  admin: {
    root: { path: "/admin", getHref: () => "/admin" },
    dashboard: { path: "", getHref: () => "/admin" },
  },
} as const;
