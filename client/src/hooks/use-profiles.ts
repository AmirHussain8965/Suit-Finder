import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateProfileRequest, Profile } from "@/types";
import { getMockData } from "@/data/mockData";

const PROFILES_ME_KEY = "/api/profiles/me";
const PROFILES_NEARBY_KEY = "/api/profiles/nearby";

export function useProfile() {
  return useQuery({
    queryKey: [PROFILES_ME_KEY],
    queryFn: async () => getMockData([PROFILES_ME_KEY]) as Profile | null,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: UpdateProfileRequest) => {
      const current = getMockData([PROFILES_ME_KEY]) as Record<string, unknown> | null;
      return { ...current, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILES_ME_KEY] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) => {
      const current = getMockData([PROFILES_ME_KEY]) as Record<string, unknown> | null;
      return { ...current, ...coords };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFILES_ME_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROFILES_NEARBY_KEY] });
    },
  });
}

export function useNearbyProfiles(_lat?: number, _lng?: number, _radius?: number) {
  return useQuery({
    queryKey: [PROFILES_NEARBY_KEY, _lat, _lng, _radius],
    enabled: !!_lat && !!_lng,
    queryFn: async () => getMockData([PROFILES_NEARBY_KEY]) ?? [],
  });
}
