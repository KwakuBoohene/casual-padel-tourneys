import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "../api/errors";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // A 401 is terminal: there is no refresh token, so retrying only delays the sign-out.
        retry: (failureCount: number, error: unknown) =>
          !(error instanceof ApiError && error.status === 401) && failureCount < 1,
        staleTime: 30_000
      }
    }
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
