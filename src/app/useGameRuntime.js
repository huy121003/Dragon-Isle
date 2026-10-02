import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {AuthMeSchema} from '../shared/schemas.js';
import {useAppStore,runtimeSnapshot} from './store.js';

export function useGameRuntime(){
  const runtimeVersion=useAppStore(state=>state.runtimeVersion);
  const connection=useAppStore(state=>state.connection);
  const bumpRuntime=useAppStore(state=>state.bumpRuntime);
  const syncConnection=useAppStore(state=>state.syncConnection);
  useEffect(()=>{
    document.body.classList.add('react-ready');
    const unsubscribe=window.DragonRuntime?.subscribe?.(bumpRuntime);
    if(!unsubscribe)window.addEventListener('dragon-ui-update',bumpRuntime);
    window.addEventListener('dragon-connection-change',syncConnection);
    window.gameBootPromise?.then(bumpRuntime);syncConnection();
    const timer=setInterval(bumpRuntime,1000);
    return()=>{
      clearInterval(timer);
      if(unsubscribe)unsubscribe();else window.removeEventListener('dragon-ui-update',bumpRuntime);
      window.removeEventListener('dragon-connection-change',syncConnection);
    };
  },[bumpRuntime,syncConnection]);
  void runtimeVersion;
  return {...runtimeSnapshot(),connection};
}

export function useAccount(){
  const query=useQuery({
    queryKey:['auth','me'],
    queryFn:async()=>{
      const response=await fetch('/api/auth/me',{cache:'no-store'});
      if(response.status===401)return null;
      if(!response.ok)throw new Error('Unable to check session.');
      return AuthMeSchema.parse(await response.json()).user;
    },
    retry:false,staleTime:30_000
  });
  return {account:query.data??null,ready:query.isFetched,error:query.error};
}
