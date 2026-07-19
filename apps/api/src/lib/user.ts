import { z } from 'zod';

import { isoDateString } from './schema.js';

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export type PublicUser = z.infer<typeof publicUserSchema>;
