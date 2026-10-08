import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

export const newPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match.',
  path: ['confirm'],
});
