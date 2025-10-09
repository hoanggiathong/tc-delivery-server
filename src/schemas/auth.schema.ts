import { z } from 'zod';
import { UserRole } from '@/types/user.type';

export const loginSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must not exceed 100 characters'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must not exceed 100 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
    name: z
      .string()
      .min(1, 'Name must be at least 1 character')
      .max(100, 'Name must not exceed 100 characters')
      .trim(),
    role: z.nativeEnum(UserRole).optional().default(UserRole.USER),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(100, 'Password must not exceed 100 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      ),
    name: z
      .string()
      .min(1, 'Name must be at least 1 character')
      .max(100, 'Name must not exceed 100 characters')
      .trim(),
    role: z.nativeEnum(UserRole),
  }),
});

export const updateSelectedRouteSchema = z.object({
  body: z.object({
    selectedRouteId: z.string().min(1, 'Route ID is required').optional().or(z.null()),
  }),
});

export type LoginRequest = z.infer<typeof loginSchema>['body'];
export type RegisterRequest = z.infer<typeof registerSchema>['body'];
export type CreateUserRequest = z.infer<typeof createUserSchema>['body'];
export type UpdateSelectedRouteRequest = z.infer<typeof updateSelectedRouteSchema>['body'];
