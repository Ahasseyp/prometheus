import { z } from 'zod';

export const isoDateString = z.preprocess(
  (value) => (value instanceof Date ? value.toISOString() : value),
  z.string().datetime()
);
