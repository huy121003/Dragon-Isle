"use strict";

/* SAVE TRANSPORT: Server profile loading, queued writes and manual import/export. */
let saveReadOnly=false;
let serverSaveAvailable=!!(window.location&&/^https?:$/.test(window.location.protocol));
let pendingServerSave=null;
let serverSaveBusy=false;
let serverFlushPromise=null;
let serverWarningShown=false;
let serverSaveRevision=0;

async function loadGameFromServer(){
  const response=await fetch('/api/save',{headers:{'X-Dragon-Account':currentAccount.id},cache:'no-store'});
  if(!response.ok)throw new Error(response.status===401?'Session expired. Sign in again.':
    'Cannot read progress from the server.');
  serverSaveRevision=Math.max(0,Math.floor(Number(response.headers.get('X-Dragon-Save-Revision'))||0));
  saveReadOnly=false;serverWarningShown=false;
  const raw=await response.json();
  if(!raw)return newGame();
  return migrateSave(raw);
}
/* SAVE: Ghi các snapshot theo thứ tự; thao tác mới không bị bản lưu cũ ghi đè. */
function flushServerSave(){
  if(!serverSaveAvailable)return Promise.resolve(false);
  if(serverSaveBusy)return serverFlushPromise;
  serverSaveBusy=true;
  serverFlushPromise=(async function(){
    while(pendingServerSave){
      const snapshot=pendingServerSave;
      pendingServerSave=null;
      let response;
      try{
        response=await fetch('/api/save',{method:'PUT',headers:{'Content-Type':'application/json',
          'X-Dragon-Account':currentAccount.id,'X-Dragon-Save-Revision':String(serverSaveRevision)},
          body:snapshot,cache:'no-store',keepalive:snapshot.length<=window.DragonConfig.system.save.keepaliveMaxBytes});
      }catch(cause){
        if(!pendingServerSave)pendingServerSave=snapshot;
        const error=new Error('Connection lost. Progress is queued and will retry automatically.');
        error.code='SAVE_NETWORK';error.cause=cause;throw error;
      }
      const body=await response.json().catch(function(){return {};});
      if(!response.ok){
        const error=new Error(body.error||(response.status===401?'Session expired.':
          response.status===409?'Progress changed on another device. Reload to continue safely.':
          'Cannot save the JSON profile.'));
        error.code=body.code||(response.status===401?'SESSION_EXPIRED':response.status>=500?'SAVE_RETRYABLE':'');
        if(error.code==='SAVE_RETRYABLE'&&!pendingServerSave)pendingServerSave=snapshot;
        throw error;
      }
      serverSaveRevision=Math.max(serverSaveRevision+1,
        Math.floor(Number(body.serverRevision)||serverSaveRevision+1));
      if(body.dailyMissions&&state){
        state.dailyMissions=body.dailyMissions;
        window.DragonRuntime?.emit?.('ui');
      }
      serverWarningShown=false;
      window.DragonConnectionApi?.connected();
    }
    return true;
  })().catch(function(error){
      if(error.code==='SAVE_CONFLICT'){
        pendingServerSave=null;saveReadOnly=true;
      }else if(error.code==='SAVE_NETWORK'||error.code==='SAVE_RETRYABLE'){
        window.DragonConnectionApi?.fail(error.message);
      }else if(error.code==='SESSION_EXPIRED'){
        window.DragonConnectionApi?.expire();
      }
      if(!serverWarningShown&&error.code!=='SAVE_NETWORK'&&error.code!=='SAVE_RETRYABLE'&&
        error.code!=='SESSION_EXPIRED'){
        serverWarningShown=true;
        toast(error.message+(error.code==='SAVE_CONFLICT'?'':' Check the connection and reload.'));
      }
      return false;
  }).finally(function(){serverSaveBusy=false;});
  return serverFlushPromise;
}
function saveGame(){
  if(saveReadOnly||!state)return Promise.resolve(false);
  state.version=SAVE_VERSION;
  state.savedAt=Date.now();
  pendingServerSave=JSON.stringify(state);
  return flushServerSave();
}

window.DragonConnectionApi?.configure({
  hasPending:function(){return !!pendingServerSave;},
  isReadOnly:function(){return saveReadOnly;},
  setReadOnly:function(value){saveReadOnly=!!value;},
  flush:flushServerSave
});
