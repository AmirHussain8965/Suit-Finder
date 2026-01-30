import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getMockData } from "@/data/mockData";

/**
 * Frontend-only: no real API calls. All data comes from mock.
 */
function mockQueryFn<T>({ queryKey }: { queryKey: unknown[] }): T {
  const data = getMockData(queryKey);
  if (data === undefined) {
    return null as T;
  }
  return data as T;
}

export async function apiRequest(
  _method: string,
  _url: string,
  data?: unknown,
): Promise<Response> {
  // Frontend-only: log and return success. No backend call.
  if (import.meta.env.DEV && data !== undefined) {
    console.log("[mock API]", _method, _url, data);
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  () =>
  async (context) => {
    return Promise.resolve(mockQueryFn<T>(context));
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
