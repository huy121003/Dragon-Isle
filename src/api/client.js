import {z} from 'zod';
export const UserSchema=z.object({id:z.string(),username:z.string(),role:z.string().optional(),disabled:z.boolean().optional(),challengeEnabled:z.boolean().optional()});
export const AuthResponseSchema=z.object({user:UserSchema});
export const ChallengeResponseSchema=z.object({players:z.array(z.any()).optional(),match:z.any().nullable().optional(),notice:z.string().nullable().optional(),error:z.string().nullable().optional()}).passthrough();
export class ApiError extends Error{constructor(message,status,body={}){super(message);this.name='ApiError';this.status=status;this.body=body;}}
export async function api(path,{schema,body,headers,...options}={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new ApiError(payload.error||('Request failed ('+response.status+')'),response.status,payload);
 return schema?schema.parse(payload):payload;
}
