import { z } from 'zod';

export const imageMetadataSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters.')
    .max(200, 'Title must be 200 characters or fewer.'),
  description: z.string().trim().max(5000, 'Description is too long.').optional().or(z.literal('')),
  caption: z.string().trim().max(1000, 'Caption is too long.').optional().or(z.literal('')),
  alt_text: z.string().trim().max(500, 'Alt text is too long.').optional().or(z.literal('')),
  category_id: z.string().uuid().optional().nullable(),
  author_id: z.string().uuid().optional().nullable(),
  album_id: z.string().uuid().optional().nullable(),
  is_featured: z.boolean().optional(),
  is_published: z.boolean().optional(),
  allow_download: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
});
