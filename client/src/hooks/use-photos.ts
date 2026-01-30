import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InsertPhoto } from "@/types";
import { buildUrl } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { getMockData } from "@/data/mockData";

const PHOTOS_ME_PATH = "/api/photos/me";
const PHOTOS_USER_PATH = "/api/photos/:userId";

export function useMyPhotos() {
  return useQuery({
    queryKey: [PHOTOS_ME_PATH],
    queryFn: async () => getMockData([PHOTOS_ME_PATH]) ?? [],
  });
}

export function useUserPhotos(userId: string) {
  return useQuery({
    queryKey: [PHOTOS_USER_PATH, userId],
    enabled: !!userId,
    queryFn: async () => getMockData([PHOTOS_USER_PATH, userId]) ?? [],
  });
}

export function useAddPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertPhoto) => {
      const res = await apiRequest("POST", "/api/photos", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_ME_PATH] });
    },
  });
}

export function useUpdatePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ photoId, updates }: { photoId: number; updates: Partial<InsertPhoto> }) => {
      const url = buildUrl("/api/photos/:photoId", { photoId: photoId.toString() });
      const res = await apiRequest("PATCH", url, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_ME_PATH] });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => {
      const url = buildUrl("/api/photos/:photoId", { photoId: photoId.toString() });
      const res = await apiRequest("DELETE", url);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_ME_PATH] });
    },
  });
}

export function useSetProfilePhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoId: number) => {
      const url = buildUrl("/api/photos/:photoId/set-profile", { photoId: photoId.toString() });
      const res = await apiRequest("POST", url);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_ME_PATH] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function useReorderPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photoIds: number[]) => {
      const res = await apiRequest("POST", "/api/photos/reorder", { photoIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_ME_PATH] });
    },
  });
}
