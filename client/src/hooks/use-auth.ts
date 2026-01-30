import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { User } from "@/types";
import { getMockData } from "@/data/mockData";

function getMockUser(): User | null {
  return getMockData(["/api/auth/user"]) as User | null;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => getMockUser(),
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Frontend-only: no API call. Just clear user from cache.
      queryClient.setQueryData(["/api/auth/user"], null);
    },
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
}
