import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { UpdateProfileRequest } from "@shared/schema";
import { z } from "zod";

// Fetch current user's profile
export function useProfile() {
  return useQuery({
    queryKey: [api.profiles.me.path],
    queryFn: async () => {
      const res = await fetch(api.profiles.me.path, { credentials: "include" });
      if (res.status === 404) return null; // Profile not created yet
      if (!res.ok) throw new Error("Failed to fetch profile");
      return api.profiles.me.responses[200].parse(await res.json());
    },
  });
}

// Update profile details
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: UpdateProfileRequest) => {
      const validated = api.profiles.update.input.parse(updates);
      const res = await fetch(api.profiles.update.path, {
        method: api.profiles.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.profiles.update.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to update profile");
      }
      return api.profiles.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.profiles.me.path] });
    },
  });
}

// Update location specifically
export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) => {
      const res = await fetch(api.profiles.location.path, {
        method: api.profiles.location.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update location");
      return api.profiles.location.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate both me and nearby since my location changed relative to others
      queryClient.invalidateQueries({ queryKey: [api.profiles.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.profiles.nearby.path] });
    },
  });
}

// Fetch nearby profiles
export function useNearbyProfiles(lat?: number, lng?: number, radius?: number) {
  return useQuery({
    queryKey: [api.profiles.nearby.path, lat, lng, radius],
    enabled: !!lat && !!lng, // Only fetch if we have coordinates
    queryFn: async () => {
      const params = new URLSearchParams();
      if (lat) params.append("lat", lat.toString());
      if (lng) params.append("lng", lng.toString());
      if (radius) params.append("radius", radius.toString());

      const url = `${api.profiles.nearby.path}?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      
      if (!res.ok) throw new Error("Failed to fetch nearby profiles");
      return api.profiles.nearby.responses[200].parse(await res.json());
    },
  });
}
