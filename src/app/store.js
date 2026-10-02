import {create} from 'zustand';
import {connectionState,game} from './game-bridge.js';

export const useAppStore=create(set=>({
  runtimeVersion:0,
  connection:connectionState(),
  adminOpen:false,
  challengeOpen:false,
  bumpRuntime:()=>set(state=>({runtimeVersion:state.runtimeVersion+1})),
  syncConnection:()=>set({connection:{...connectionState()}}),
  setAdminOpen:adminOpen=>set({adminOpen}),
  setChallengeOpen:challengeOpen=>set({challengeOpen})
}));

export function runtimeSnapshot(){
  const current=game();
  return {game:current,state:current?.state,ui:current?.ui};
}
