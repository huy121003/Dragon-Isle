import {describe,expect,it} from 'vitest';
import {AdminUsersSchema,AuthMeSchema,ChallengeStatusSchema,parseWith} from '../../src/api/schemas.js';

describe('API schemas',()=>{
  it('accepts auth payloads while preserving compatible extra fields',()=>{
    const parsed=parseWith(AuthMeSchema,{user:{id:'1',username:'trainer',role:'admin',extra:true}});
    expect(parsed.user.username).toBe('trainer');
    expect(parsed.user.extra).toBe(true);
  });
  it('rejects malformed auth payloads',()=>{
    expect(()=>parseWith(AuthMeSchema,{user:{id:1,username:null}})).toThrow(/invalid shape/i);
  });
  it('normalizes challenge players',()=>{
    const parsed=parseWith(ChallengeStatusSchema,{players:[],match:null});
    expect(parsed.players).toEqual([]);
    expect(parsed.match).toBeNull();
  });
  it('validates admin user collections',()=>{
    const parsed=parseWith(AdminUsersSchema,{users:[{id:'1',username:'a',progress:{gold:10}}]});
    expect(parsed.users[0].progress.gold).toBe(10);
  });
});
