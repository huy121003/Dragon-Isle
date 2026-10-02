import {beforeEach,describe,expect,it} from 'vitest';
import {useAppStore} from '../../src/store/app-store.js';

describe('app store',()=>{
  beforeEach(()=>{
    useAppStore.setState({engineVersion:0,adminOpen:false,challengeOpen:false,
      connection:{status:'connected',blocked:false,since:0,nextRetryAt:0,attempts:0,message:''}});
  });
  it('keeps application-level UI state outside the game engine',()=>{
    useAppStore.getState().setAdminOpen(true);
    useAppStore.getState().setChallengeOpen(true);
    useAppStore.getState().bumpEngine();
    const state=useAppStore.getState();
    expect(state.adminOpen).toBe(true);
    expect(state.challengeOpen).toBe(true);
    expect(state.engineVersion).toBe(1);
  });
  it('can reset transient UI state',()=>{
    useAppStore.setState({adminOpen:true,challengeOpen:true});
    useAppStore.getState().resetUi();
    expect(useAppStore.getState().adminOpen).toBe(false);
    expect(useAppStore.getState().challengeOpen).toBe(false);
  });
});
