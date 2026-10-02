const {z}=require('zod');

const SaveSchema=z.object({
  version:z.number().int().min(1).max(12),
  dragons:z.array(z.unknown()),buildings:z.array(z.unknown()),land:z.array(z.unknown()),eggs:z.array(z.unknown()),
  savedAt:z.number().positive()
}).passthrough();

const ResourcePatchSchema=z.object({
  gold:z.number().int().min(0).max(1_000_000_000_000).optional(),
  food:z.number().int().min(0).max(1_000_000_000).optional(),
  gems:z.number().int().min(0).max(1_000_000_000).optional()
}).strict().refine(value=>Object.keys(value).length>0);

const resourceLimits={gold:1_000_000_000_000,food:1_000_000_000,gems:1_000_000_000};
const validSave=value=>SaveSchema.safeParse(value).success;
const validResourcePatch=value=>ResourcePatchSchema.safeParse(value).success;

module.exports={SaveSchema,ResourcePatchSchema,validSave,validResourcePatch,resourceLimits};
