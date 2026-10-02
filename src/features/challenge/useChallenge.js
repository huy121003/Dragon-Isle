import {useEffect} from 'react';
import {message} from 'antd';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {ChallengeStatusSchema} from '../../api/schemas.js';
import {connectionApi,connectionState,game} from '../../app/game-bridge.js';

async function readStatus(){
  const response=await fetch('/api/challenge/status',{credentials:'same-origin',cache:'no-store'});
  if(response.status===401){connectionApi()?.expire();return {match:null};}
  if(!response.ok){
    if([502,503,504].includes(response.status))connectionApi()?.fail('Challenge server is unavailable.');
    throw new Error('Challenge status is temporarily unavailable.');
  }
  return ChallengeStatusSchema.parse(await response.json());
}

export default function useChallenge(account,connection){
  const client=useQueryClient();
  const query=useQuery({
    queryKey:['challenge','status',account?.id],
    queryFn:readStatus,enabled:!!account&&!connection?.blocked,
    refetchInterval:2000,refetchIntervalInBackground:true,retry:false
  });
  const mutation=useMutation({
    mutationFn:async({route,body,method='POST'})=>{
      if(connectionState()?.blocked)return null;
      if(['invite','select'].includes(route)&&!await game()?.save())
        throw new Error('Unable to save dragons before the challenge.');
      const response=await fetch('/api/challenge/'+route,{method,credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});
      if(response.status===401){connectionApi()?.expire();return null;}
      const result=await response.json().catch(()=>({}));
      if(!response.ok){
        if([502,503,504].includes(response.status))connectionApi()?.fail('Challenge server is unavailable.');
        throw new Error(result.error||'Challenge request failed.');
      }
      return result;
    },
    onSuccess:()=>client.invalidateQueries({queryKey:['challenge','status',account?.id]}),
    onError:error=>{
      if(error instanceof TypeError)connectionApi()?.fail('Connection to the challenge server was lost.');
    }
  });
  useEffect(()=>{
    if(query.data?.notice)message.info(query.data.notice,5);
  },[query.data?.notice]);
  useEffect(()=>{
    if(account&&!connection?.blocked)client.invalidateQueries({queryKey:['challenge','status',account.id]});
  },[account?.id,connection?.blocked,client]);
  const base=query.data||{players:[],match:null};
  return {
    challenge:{...base,error:query.error?.message||mutation.error?.message||null,
      busy:mutation.isPending},
    status:()=>query.refetch(),
    request:(route,body,method)=>mutation.mutateAsync({route,body,method})
  };
}
