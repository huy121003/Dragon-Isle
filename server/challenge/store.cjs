/**
 * Persistent storage for live Challenge state.
 *
 * The state machine owns transitions; this module only loads, indexes, releases
 * and atomically persists matches/notices.
 */
const {readJson,writeJson}=require('../store.cjs');
const config=require('../../js/config/challenge.js');

/** Create the persistent in-memory index backing live Challenge matches and notices. */
function createChallengeStore({stateFile,users,now}){
  const matches=new Map(),byUser=new Map(),notices=new Map();
  let loaded=false;

  /** Load persisted state once and rebuild the user->match index. */
  async function ensureLoaded(){
    if(loaded)return;
    loaded=true;
    const stored=await readJson(stateFile,{matches:[],notices:[]});
    for(const pair of Array.isArray(stored?.notices)?stored.notices:[])
      if(Array.isArray(pair)&&pair.length===2)notices.set(pair[0],pair[1]);

    for(const raw of Array.isArray(stored?.matches)?stored.matches:[]){
      if(!raw||!raw.id||!Array.isArray(raw.players)||raw.players.length!==2||
        !Object.values(config.phases).includes(raw.phase)||raw.players.some(id=>byUser.has(id)))continue;
      if(raw.players.some(id=>!users().some(user=>user.id===id)))continue;
      const fallback=Number(raw.updatedAt)||now();
      raw.seen=Array.isArray(raw.seen)&&raw.seen.length===2?
        raw.seen.map(value=>Number(value)||fallback):[fallback,fallback];
      raw.persistedAt=Number(raw.persistedAt)||fallback;
      if(raw.battle){
        raw.battle.events=Array.isArray(raw.battle.events)?raw.battle.events:[];
        raw.battle.eventSeq=Number.isSafeInteger(raw.battle.eventSeq)?raw.battle.eventSeq:raw.battle.events.length;
      }
      matches.set(raw.id,raw);
      raw.players.forEach(id=>byUser.set(id,raw.id));
    }
  }

  /** Persist current matches/notices. writeJson is atomic in server/store.cjs. */
  async function persist(){
    await writeJson(stateFile,{matches:[...matches.values()],notices:[...notices.entries()]});
  }

  /** Remove a match and queue the same notice for both participants. */
  function release(match,message){
    matches.delete(match.id);
    for(const id of match.players){
      byUser.delete(id);
      notices.set(id,message);
    }
  }

  return {matches,byUser,notices,ensureLoaded,persist,release};
}

module.exports={createChallengeStore};
