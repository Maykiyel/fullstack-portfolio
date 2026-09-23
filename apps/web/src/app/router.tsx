import { useMemo } from "react";
import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

import { paths } from "@/config/paths";

// Maps a route module's default export onto the route object.
// In 1.9 this becomes convert(queryClient) and also maps clientLoader → loader.
const convert = (m: { default: ComponentType }) => ({ Component: m.default });

const createAppRouter = () =>
  createBrowserRouter([
    {
      lazy: () => import("@/app/routes/public/root").then(convert),
      children: [
        {
          index: true,
          lazy: () => import("@/app/routes/public/home").then(convert),
        },
      ],
    },
    {
      path: paths.admin.root.path,
      // 1.7: middleware goes HERE, declared directly on this object.
      // A lazy() function can't supply middleware in v8.
      lazy: () => import("@/app/routes/admin/root").then(convert),
      children: [
        {
          index: true,
          lazy: () => import("@/app/routes/admin/dashboard").then(convert),
        },
      ],
    },
    {
      path: "*",
      lazy: () => import("@/app/routes/not-found").then(convert),
    },
  ]);

export const AppRouter = () => {
  const router = useMemo(() => createAppRouter(), []);
  return <RouterProvider router={router} />;
};
