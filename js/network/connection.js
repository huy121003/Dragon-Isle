"use strict";
(function(){
  const RECONNECT_MS=5000,PROLONGED_MS=120000;
  let blocked=false,timer=null,saveAdapter=null;
  let state={status:"connected",since:0,nextRetryAt:0,attempts:0,message:""};

  function snapshot(){
    return {...state,blocked,prolonged:state.since>0&&Date.now()-state.since>=PROLONGED_MS};
  }
  function publish(){
    window.DragonConnectionState=snapshot();
    window.dispatchEvent(new Event("dragon-connection-change"));
  }
  function configure(adapter){saveAdapter=adapter||null;}
  function schedule(){
    if(timer||!blocked||state.status==="session-expired")return;
    state.nextRetryAt=Date.now()+RECONNECT_MS;publish();
    timer=setTimeout(()=>{timer=null;retry();},RECONNECT_MS);
  }
  function fail(message){
    const now=Date.now();
    if(!blocked)state.since=now;
    blocked=true;state.status="reconnecting";state.attempts++;
    state.message=message||"Cannot reach the game server.";
    schedule();publish();
  }
  function connected(){
    if(timer){clearTimeout(timer);timer=null;}
    blocked=false;state={status:"connected",since:0,nextRetryAt:0,attempts:0,message:""};
    publish();
  }
  function expire(){
    if(timer){clearTimeout(timer);timer=null;}
    blocked=true;saveAdapter?.setReadOnly?.(true);
    state={status:"session-expired",since:state.since||Date.now(),nextRetryAt:0,
      attempts:state.attempts,message:"Your session has expired. Returning to sign in…"};
    publish();
    setTimeout(()=>{if(window.location&&typeof window.location.reload==="function")window.location.reload();},700);
  }
  async function retry(){
    if(!blocked)return true;
    if(state.status==="session-expired")return false;
    if(timer){clearTimeout(timer);timer=null;}
    state.nextRetryAt=0;publish();
    try{
      const response=await fetch("/api/auth/me",{cache:"no-store"});
      if(response.status===401){expire();return false;}
      if(!response.ok)throw new Error("Server returned "+response.status+".");
      if(saveAdapter?.hasPending?.()&&!saveAdapter?.isReadOnly?.()){
        const ok=await saveAdapter.flush();
        if(!ok)return false;
      }else connected();
      return !blocked;
    }catch(error){
      fail("Cannot reconnect to the game server. Retrying automatically.");
      return false;
    }
  }

  window.DragonConnectionState=snapshot();
  window.DragonConnectionApi={retry,fail,expire,connected,configure,
    getState:()=>({...window.DragonConnectionState})};
})();
