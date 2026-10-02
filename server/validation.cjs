const {z}=require('zod');

const SaveSchema=z.object({
  version:z.number().int().min(1).max(12),
  dragons:z.array(z.unknown()),
  buildings:z.array(z.unknown()),
  land:z.array(z.unknown()),
  eggs:z.array(z.unknown()),
  savedAt:z.number().finite().positive()
}).passthrough();

const resourceLimits={gold:1_000_000_000_000,food:1_000_000_000,gems:1_000_000_000};
const ResourcePatchSchema=z.object({
  gold:z.number().int().min(0).max(resourceLimits.gold).optional(),
  food:z.number().int().min(0).max(resourceLimits.food).optional(),
  gems:z.number().int().min(0).max(resourceLimits.gems).optional()
}).strict().refine(value=>Object.keys(value).length>0,'At least one resource is required.');

const CredentialsSchema=z.object({
  username:z.string().min(3).max(24).regex(/^[A-Za-z0-9_]+$/),
  password:z.string().min(8).max(128)
}).strict();
const ChallengeAvailabilitySchema=z.object({enabled:z.boolean()}).strict();
const ChallengeRespondSchema=z.object({accept:z.boolean()}).strict();
const ChallengeInviteSchema=z.object({opponentId:z.string().min(1)}).strict();
const ChallengeSelectSchema=z.object({ids:z.array(z.number().int()).length(3)}).strict();

function validSave(value){return SaveSchema.safeParse(value).success;}
function validResourcePatch(value){return ResourcePatchSchema.safeParse(value).success;}
function parse(schema,value,message='Dữ liệu không hợp lệ.'){
  const result=schema.safeParse(value);
  if(result.success)return result.data;
  const error=new Error(message);error.status=400;error.validation=result.error.issues;throw error;
}

module.exports={
  SaveSchema,ResourcePatchSchema,CredentialsSchema,ChallengeAvailabilitySchema,
  ChallengeRespondSchema,ChallengeInviteSchema,ChallengeSelectSchema,
  validSave,validResourcePatch,resourceLimits,parse
};
