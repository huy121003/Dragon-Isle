import {beforeEach,describe,expect,it} from 'vitest';
import {useAppStore} from '../../src/app/store.js';

describe('app store',()=>{
  beforeEach(()=>{
    useAppStore.setState({runtimeVersion:0,adminOpen:false,challengeOpen:false,
      connection:{status:'connected',blocked:false,since:0,nextRetryAt:0,attempts:0,message:''}});
  });
  it('keeps application-level UI state outside the game engine',()=>{
    useAppStore.getState().setAdminOpen(true);
    useAppStore.getState().setChallengeOpen(true);
    useAppStore.getState().bumpRuntime();
    const state=useAppStore.getState();
    expect(state.adminOpen).toBe(true);
    expect(state.challengeOpen).toBe(true);
    expect(state.runtimeVersion).toBe(1);
  });
  it('updates transient UI state independently',()=>{
    useAppStore.getState().setAdminOpen(true);
    useAppStore.getState().setChallengeOpen(true);
    expect(useAppStore.getState().adminOpen).toBe(true);
    expect(useAppStore.getState().challengeOpen).toBe(true);
    useAppStore.getState().setAdminOpen(false);
    useAppStore.getState().setChallengeOpen(false);
    expect(useAppStore.getState().adminOpen).toBe(false);
    expect(useAppStore.getState().challengeOpen).toBe(false);
  });
});