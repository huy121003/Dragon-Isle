import {describe,it,expect,vi} from 'vitest';
import {applyChallengeMutationResult} from '../../src/features/challenge/challenge-cache.js';

describe('Challenge action cache updates',()=>{
  it('uses the authoritative turn result without fetching status again',()=>{
    let current={online:true,match:{id:'duel',eventSeq:4}};
    const client={setQueryData:vi.fn((key,update)=>{current=update(current);}),
      invalidateQueries:vi.fn()};
    const match={id:'duel',eventSeq:5,myTurn:false};

    expect(applyChallengeMutationResult(client,['challenge','status','a'],'turn',{match})).toBe(true);
    expect(current.match).toBe(match);
    expect(client.invalidateQueries).not.toHaveBeenCalled();
  });

  it('closes the local match immediately after a successful forfeit',()=>{
    let current={online:true,match:{id:'duel'}};
    const client={setQueryData:(key,update)=>{current=update(current);}};

    expect(applyChallengeMutationResult(client,['challenge','status','a'],'turn',{finished:true,won:false})).toBe(true);
    expect(current.match).toBeNull();
  });
});
