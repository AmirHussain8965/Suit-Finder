import { z } from 'zod';
import { insertProfileSchema, insertPhotoSchema, insertMessageSchema, insertEventSchema, profiles, photos, conversations, messages, events, eventCategories } from './schema';

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
    verifyAge: {
      method: 'POST' as const,
      path: '/api/profiles/verify-age',
      input: z.object({
        birthDate: z.string(),
      }),
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        400: errorSchemas.validation,
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
  photos: {
    myPhotos: {
      method: 'GET' as const,
      path: '/api/photos/me',
      responses: {
        200: z.array(z.custom<typeof photos.$inferSelect>()),
      },
    },
    userPhotos: {
      method: 'GET' as const,
      path: '/api/photos/:userId',
      responses: {
        200: z.array(z.custom<typeof photos.$inferSelect>()),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/photos',
      input: insertPhotoSchema,
      responses: {
        200: z.custom<typeof photos.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/photos/:photoId',
      input: insertPhotoSchema.partial(),
      responses: {
        200: z.custom<typeof photos.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/photos/:photoId',
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    setProfilePhoto: {
      method: 'POST' as const,
      path: '/api/photos/:photoId/set-profile',
      responses: {
        200: z.custom<typeof photos.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  conversations: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations',
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/conversations/:conversationId',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/conversations',
      input: z.object({
        participantIds: z.array(z.string()),
        name: z.string().optional(),
        isGroup: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof conversations.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    startDirect: {
      method: 'POST' as const,
      path: '/api/conversations/direct/:userId',
      responses: {
        200: z.custom<typeof conversations.$inferSelect>(),
      },
    },
    addParticipants: {
      method: 'POST' as const,
      path: '/api/conversations/:conversationId/participants',
      input: z.object({
        userIds: z.array(z.string()),
      }),
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/conversations/:conversationId/messages',
      responses: {
        200: z.array(z.any()),
      },
    },
    send: {
      method: 'POST' as const,
      path: '/api/conversations/:conversationId/messages',
      input: z.object({
        content: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof messages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/conversations/:conversationId/read',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  events: {
    list: {
      method: 'GET' as const,
      path: '/api/events',
      responses: {
        200: z.array(z.any()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/events/:eventId',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    hostEvents: {
      method: 'GET' as const,
      path: '/api/profiles/:userId/events',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/events',
      input: insertEventSchema.extend({
        category: z.enum(eventCategories),
      }),
      responses: {
        200: z.custom<typeof events.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/events/:eventId/join',
      responses: {
        200: z.any(),
      },
    },
    leave: {
      method: 'DELETE' as const,
      path: '/api/events/:eventId/leave',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    updateAttendee: {
      method: 'PATCH' as const,
      path: '/api/events/:eventId/attendees/:userId',
      input: z.object({
        status: z.enum(['pending', 'approved', 'declined']),
      }),
      responses: {
        200: z.any(),
        403: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/events/:eventId',
      responses: {
        200: z.object({ message: z.string() }),
        403: errorSchemas.unauthorized,
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
