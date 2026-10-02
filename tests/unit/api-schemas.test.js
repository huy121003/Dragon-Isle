import {describe,expect,it} from 'vitest';
import {AuthMeSchema,ChallengeStatusSchema,ResourcePatchSchema} from '../../src/api/schemas.js';

describe('API schemas',()=>{
  it('accepts auth payloads while preserving compatible extra fields',()=>{
    const parsed=AuthMeSchema.parse({user:{id:'1',username:'trainer',role:'admin',extra:true}});
    expect(parsed.user.username).toBe('trainer');
    expect(parsed.user.extra).toBe(true);
  });
  it('rejects malformed auth payloads',()=>{
    expect(()=>AuthMeSchema.parse({user:{id:1,username:null}})).toThrow();
  });
  it('validates challenge reconnect state',()=>{
    const parsed=ChallengeStatusSchema.parse({match:{id:'m1',phase:'battle',opponent:'B',
      opponentConnection:'reconnecting',opponentReconnectUntil:123}});
    expect(parsed.match.opponentConnection).toBe('reconnecting');
  });
  it('rejects invalid resource mutations',()=>{
    expect(ResourcePatchSchema.safeParse({gems:-1}).success).toBe(false);
    expect(ResourcePatchSchema.safeParse({gold:1000,gems:20}).success).toBe(true);
  });
});