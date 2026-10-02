import {useEffect} from 'react';
import {useShallow} from 'zustand/react/shallow';
import {useAppStore} from './store.js';

export function useGameRuntime(){
  const runtime=useAppStore(useShallow(state=>({
    game:state.gameRuntime?.game,
    state:state.gameRuntime?.state,
    ui:state.gameRuntime?.ui,
    account:state.gameRuntime?.account,
    data:state.gameRuntime?.data,
    uiRevision:state.uiRevision
  })));
  const connection=useAppStore(state=>state.connection);
  const syncGameRuntime=useAppStore(state=>state.syncGameRuntime);
  const syncConnection=useAppStore(state=>state.syncConnection);
  useEffect(()=>{
    document.body.classList.add('react-ready');
    const unsubscribe=window.DragonRuntime?.subscribe?.(syncGameRuntime);
    const onRuntimeUpdate=event=>syncGameRuntime(event.detail?.reason||'ui');
    if(!unsubscribe)window.addEventListener('dragon-ui-update',onRuntimeUpdate);
    window.addEventListener('dragon-connection-change',syncConnection);
    syncGameRuntime();
    window.gameBootPromise?.then(syncGameRuntime);syncConnection();
    return()=>{
      if(unsubscribe)unsubscribe();else window.removeEventListener('dragon-ui-update',onRuntimeUpdate);
      window.removeEventListener('dragon-connection-change',syncConnection);
    };
  },[syncGameRuntime,syncConnection]);
  return {...runtime,connection};
}
