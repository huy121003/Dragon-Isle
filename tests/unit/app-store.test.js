import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {useAppStore} from '../../src/app/store.js';

describe('app store',()=>{
  beforeEach(()=>{
    useAppStore.setState({gameRuntime:null,runtimeRevision:0,uiRevision:0,worldRevision:0,
      adminOpen:false,challengeOpen:false,
      connection:{status:'connected',blocked:false,since:0,nextRetryAt:0,attempts:0,message:''}});
  });
  afterEach(()=>vi.unstubAllGlobals());
  it('keeps application-level UI state outside the game engine',()=>{
    useAppStore.getState().setAdminOpen(true);
    useAppStore.getState().setChallengeOpen(true);
    const state=useAppStore.getState();
    expect(state.adminOpen).toBe(true);
    expect(state.challengeOpen).toBe(true);
    expect(state.gameRuntime).toBeNull();
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

  it('publishes game runtime snapshots through Zustand instead of render polling',()=>{
    const runtime={state:{gold:25},ui:{modal:null},account:{id:'u1'},data:{species:{}}};
    vi.stubGlobal('window',{DragonGame:runtime});
    const first=useAppStore.getState().gameRuntime;
    useAppStore.getState().syncGameRuntime();
    const published=useAppStore.getState().gameRuntime;
    expect(published).not.toBe(first);
    expect(published).toMatchObject({game:runtime,state:runtime.state,ui:runtime.ui,account:runtime.account,data:runtime.data});

    runtime.state.gold=40;
    useAppStore.getState().syncGameRuntime();
    expect(useAppStore.getState().gameRuntime).not.toBe(published);
    expect(useAppStore.getState().gameRuntime.state.gold).toBe(40);
  });

  it('keeps world-tick subscriptions separate from app-shell UI changes',()=>{
    const runtime={state:{gold:25},ui:{modal:null},account:{id:'u1'},data:{}};
    vi.stubGlobal('window',{DragonGame:runtime});
    useAppStore.getState().syncGameRuntime('tick');
    expect(useAppStore.getState().worldRevision).toBe(1);
    expect(useAppStore.getState().uiRevision).toBe(0);
    useAppStore.getState().syncGameRuntime('ui');
    expect(useAppStore.getState().worldRevision).toBe(1);
    expect(useAppStore.getState().uiRevision).toBe(1);
  });
});
