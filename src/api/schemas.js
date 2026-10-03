import {z} from 'zod';

export const UserSchema=z.object({
  id:z.string(),
  username:z.string(),
  role:z.string().optional(),
  disabled:z.boolean().optional(),
  challengeEnabled:z.boolean().optional()
}).passthrough();

export const AuthMeSchema=z.object({user:UserSchema});
export const ChallengePlayerSchema=z.object({
  id:z.string(),username:z.string(),level:z.number().optional(),dragons:z.number().optional()
}).passthrough();
export const ChallengeMatchSchema=z.object({
  id:z.string(),phase:z.enum(['invited','select','battle']),opponent:z.string(),
  opponentConnection:z.enum(['online','reconnecting']).optional(),
  opponentReconnectUntil:z.number().optional()
}).passthrough();
export const ChallengeStatusSchema=z.object({
  players:z.array(ChallengePlayerSchema).default([]),
  match:ChallengeMatchSchema.nullable().optional(),
  notice:z.string().nullable().optional(),
  error:z.string().nullable().optional()
}).passthrough();
export const AdminUserSchema=UserSchema.extend({
  progress:z.object({
    level:z.number().optional(),dragons:z.number().optional(),gold:z.number().optional(),
    food:z.number().optional(),gems:z.number().optional(),discovered:z.number().optional(),
    savedAt:z.number().optional()
  }).nullable().optional()
});
export const AdminUsersSchema=z.object({users:z.array(AdminUserSchema)});
export const ResourcePatchSchema=z.object({
  gold:z.number().int().min(0).max(1_000_000_000_000).optional(),
  food:z.number().int().min(0).max(1_000_000_000).optional(),
  gems:z.number().int().min(0).max(1_000_000_000).optional(),
  level:z.number().int().min(1).max(1_000_000).optional()
}).strict().refine(value=>Object.keys(value).length>0,'At least one resource is required');

export function parseWith(schema,value,label='API response'){
  const parsed=schema.safeParse(value);
  if(parsed.success)return parsed.data;
  throw new Error(label+' has an invalid shape: '+parsed.error.issues.map(issue=>issue.path.join('.')+': '+issue.message).join('; '));
}
