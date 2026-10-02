import {z} from 'zod';

export const UserSchema=z.object({
  id:z.string().min(1),username:z.string().min(1),role:z.string().optional(),
  disabled:z.boolean().optional(),challengeEnabled:z.boolean().optional()
}).passthrough();

export const AuthMeSchema=z.object({user:UserSchema});

export const ChallengeMatchSchema=z.object({
  id:z.string().min(1),phase:z.enum(['invited','select','battle']),opponent:z.string().min(1),
  opponentConnection:z.enum(['online','reconnecting']).optional(),
  opponentReconnectUntil:z.number().optional()
}).passthrough();

export const ChallengeStatusSchema=z.object({
  match:ChallengeMatchSchema.nullable().optional(),notice:z.string().nullable().optional()
}).passthrough();

export const ResourcePatchSchema=z.object({
  gold:z.number().int().min(0).max(1_000_000_000_000).optional(),
  food:z.number().int().min(0).max(1_000_000_000).optional(),
  gems:z.number().int().min(0).max(1_000_000_000).optional()
}).refine(value=>Object.keys(value).length>0,'At least one resource is required');
