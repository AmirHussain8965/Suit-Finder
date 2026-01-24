import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertPhoto } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useMyPhotos() {
  return useQuery({
    queryKey: [api.photos.myPhotos.path],
    queryFn: async () => {
      const res = await fetch(api.photos.myPhotos.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch photos");
      return res.json();
    },
  });
}

export function useUserPhotos(userId: string) {
  return useQuery({
    queryKey: [api.photos.userPhotos.path, userId],
    enabled: !!userId,
    queryFn: async () => {
      const url = buildUrl(api.photos.userPhotos.path, { userId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch photos");
      return res.json();
    },
  });
}

export function useAddPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertPhoto) => {
      const res = await apiRequest(api.photos.add.method, api.photos.add.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.photos.myPhotos.path] });
    },
  });
}

export function useUpdatePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId, updates }: { photoId: number; updates: Partial<InsertPhoto> }) => {
      const url = buildUrl(api.photos.update.path, { photoId });
      const res = await apiRequest(api.photos.update.method, url, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.photos.myPhotos.path] });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => {
      const url = buildUrl(api.photos.delete.path, { photoId });
      const res = await apiRequest(api.photos.delete.method, url);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.photos.myPhotos.path] });
    },
  });
}

export function useSetProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => {
      const url = buildUrl(api.photos.setProfilePhoto.path, { photoId });
      const res = await apiRequest(api.photos.setProfilePhoto.method, url);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.photos.myPhotos.path] });
    },
  });
}
