import { z } from 'zod';
import { insertProfileSchema, profiles } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  profiles: {
    me: {
      method: 'GET' as const,
      path: '/api/profiles/me',
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: z.null(), // Profile might not exist yet
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/profiles/me',
      input: insertProfileSchema.partial(),
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    location: {
      method: 'PATCH' as const,
      path: '/api/profiles/me/location',
      input: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    nearby: {
      method: 'GET' as const,
      path: '/api/profiles/nearby',
      input: z.object({
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        radius: z.coerce.number().optional(), // in km
      }).optional(),
      responses: {
        200: z.array(z.custom<{
          userId: string;
          displayName: string | null;
          latitude: number | null;
          longitude: number | null;
          bio: string | null;
          profileImageUrl: string | null;
        }>()),
      },
    },
  },
  favorites: {
    list: {
      method: 'GET' as const,
      path: '/api/favorites',
      responses: {
        200: z.array(z.custom<{
          userId: string;
          displayName: string | null;
          profileImageUrl: string | null;
        }>()),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/favorites/:targetUserId',
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/favorites/:targetUserId',
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
