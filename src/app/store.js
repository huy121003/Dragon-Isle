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
  connection:connectionState(),
  adminOpen:false,
  challengeOpen:false,
  syncGameRuntime:()=>set({gameRuntime:readGameRuntime()}),
  syncConnection:()=>set({connection:{...connectionState()}}),
  setAdminOpen:adminOpen=>set({adminOpen}),
  setChallengeOpen:challengeOpen=>set({challengeOpen}),
  resetUi:()=>set({adminOpen:false,challengeOpen:false})
}));
