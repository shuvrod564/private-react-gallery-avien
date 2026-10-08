import { z } from 'zod';

const name = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(100, 'Name must be 100 characters or fewer.');

export const categorySchema = z.object({
  name,
  description: z.string().trim().max(1000, 'Description is too long.').optional().or(z.literal('')),
  cover_image_id: z.string().uuid().optional().nullable(),
});

export const tagSchema = z.object({
  name,
});

export const authorSchema = z.object({
  name,
  bio: z.string().trim().max(2000, 'Bio is too long.').optional().or(z.literal('')),
  website_url: z.string().trim().url('Enter a valid URL.').optional().or(z.literal('')),
  avatar_url: z.string().trim().url('Enter a valid URL.').optional().or(z.literal('')),
});

export const albumSchema = z.object({
  name,
  description: z.string().trim().max(1000, 'Description is too long.').optional().or(z.literal('')),
  cover_image_id: z.string().uuid().optional().nullable(),
});
