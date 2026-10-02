import {useCallback,useEffect,useMemo} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {message} from 'antd';
import {ApiError,apiFetch} from '../../api/http.js';
import {ChallengeStatusSchema,parseWith} from '../../api/schemas.js';
import {connectionApi,game} from '../../app/game-bridge.js';
import {useAppStore} from '../../store/app-store.js';

function handleNetworkError(error){
  if(error instanceof ApiError&&error.status===401){connectionApi()?.expire();return;}
  if(error instanceof ApiError&&[502,503,504].includes(error.status)){
    connectionApi()?.fail('Challenge server is unavailable.');return;
  }
  if(error instanceof ApiError&&error.status===0)connectionApi()?.fail('Connection to the challenge server was lost.');
}

export default function useChallenge(account,connection){
  const queryClient=useQueryClient();
  const open=useAppStore(state=>state.challengeOpen);
  const setOpen=useAppStore(state=>state.setChallengeOpen);

  const query=useQuery({
    queryKey:['challenge','status',account?.id],
    enabled:!!account&&!connection?.blocked,
    refetchInterval:2000,
    retry:false,
    queryFn:async()=>{
      try{
        return parseWith(ChallengeStatusSchema,await apiFetch('/api/challenge/status'),'Challenge status');
      }catch(error){handleNetworkError(error);throw error;}
    }
  });

  useEffect(()=>{
    if(query.data?.notice)message.info(query.data.notice,5);
    if(query.data?.match)setOpen(true);
  },[query.data?.notice,query.data?.match?.id,setOpen]);

  const mutation=useMutation({
    mutationFn:async({route,body,method='POST'})=>{
      if(connection?.blocked)return null;
      if(['invite','select'].includes(route)&&!await game()?.save())
        throw new Error('Unable to save dragons before the challenge.');
      try{
        return await apiFetch('/api/challenge/'+route,{
          method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})
        });
      }catch(error){handleNetworkError(error);throw error;}
    },
    onSuccess:async()=>{await queryClient.invalidateQueries({queryKey:['challenge','status',account?.id]});}
  });

  const request=useCallback((route,body,method='POST')=>{
    if(mutation.isPending||connection?.blocked)return Promise.resolve(null);
    return mutation.mutateAsync({route,body,method}).catch(()=>null);
  },[mutation,connection?.blocked]);

  const status=useCallback(()=>query.refetch(),[query]);
  const challenge=useMemo(()=>{
    if(!query.data&&!query.error&&!mutation.error)return null;
    return {...(query.data||{players:[],match:null}),
      busy:mutation.isPending,error:mutation.error?.message||query.error?.message||null};
  },[query.data,query.error,mutation.error,mutation.isPending]);

  return {challenge,open,setOpen,status,request};
}
