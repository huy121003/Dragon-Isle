import {create} from 'zustand';
import {connectionState,game} from './game-bridge.js';

/** Capture a render snapshot when the game runtime publishes a change.
 * The nested objects remain owned by the legacy simulation during migration;
 * this wrapper gives Zustand subscribers a new, explicit revision boundary.
 */
function readGameRuntime(){
  const current=game();
  return current?{game:current,state:current.state,ui:current.ui,account:current.account,data:current.data}:null;
}

export const useAppStore=create(set=>({
  /** React consumes this event-driven compatibility snapshot. */
  gameRuntime:null,
  /** Separate counters let shell state and time-driven HUDs subscribe independently. */
  runtimeRevision:0,
  uiRevision:0,
  worldRevision:0,
  connection:connectionState(),
  adminOpen:false,
  challengeOpen:false,
  syncGameRuntime:(reason='ui')=>set(state=>({
    gameRuntime:readGameRuntime(),
    runtimeRevision:state.runtimeRevision+1,
    uiRevision:state.uiRevision+(reason==='tick'?0:1),
    worldRevision:state.worldRevision+(reason==='tick'?1:0)
  })),
  syncConnection:()=>set({connection:{...connectionState()}}),
  setAdminOpen:adminOpen=>set({adminOpen}),
  setChallengeOpen:challengeOpen=>set({challengeOpen}),
  resetUi:()=>set({adminOpen:false,challengeOpen:false})
}));
