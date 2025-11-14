import { z } from 'zod';

export const TokenPayloadSchema = z.object({
  userId: z.number(),            
  username: z.string(),
  role: z.string().optional(),
  roleId: z.number().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;