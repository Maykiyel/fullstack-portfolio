import type { ReactNode } from "react";

type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  // 1.7: QueryClientProvider wraps children here.
  return <>{children}</>;
};
