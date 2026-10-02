import {create} from 'zustand';
import {connectionState,game} from '../app/game-bridge.js';

const initialConnection=()=>connectionState();
export const useAppStore=create((set,get)=>({
  engineVersion:0,
  connection:initialConnection(),
  adminOpen:false,
  challengeOpen:false,
  bumpEngine:()=>set(state=>({engineVersion:state.engineVersion+1})),
  syncConnection:()=>set({connection:{...connectionState()}}),
  setAdminOpen:adminOpen=>set({adminOpen:!!adminOpen}),
  setChallengeOpen:challengeOpen=>set({challengeOpen:!!challengeOpen}),
  game:()=>game(),
  resetUi:()=>set({adminOpen:false,challengeOpen:false})
}));
