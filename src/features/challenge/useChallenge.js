import {useCallback,useEffect,useRef,useState} from 'react';
import {message} from 'antd';
import {connectionApi,connectionState,game} from '../../app/game-bridge.js';

export default function useChallenge(account,connection){
  const [challenge,setChallenge]=useState(null),[open,setOpen]=useState(false);
  const sequence=useRef(0),busy=useRef(false);

  const status=useCallback(async()=>{
    if(connectionState()?.blocked)return;
    const current=++sequence.current;
    try{
      const response=await fetch('/api/challenge/status',{credentials:'same-origin',cache:'no-store'});
      if(response.status===401){connectionApi()?.expire();return;}
      if(!response.ok){
        if([502,503,504].includes(response.status))connectionApi()?.fail('Challenge server is unavailable.');
        else setChallenge(value=>({...value,error:'Challenge status is temporarily unavailable.'}));
        return;
      }
      const next=await response.json();
      if(current!==sequence.current)return;
      if(next.notice)message.info(next.notice,5);
      setChallenge({...next,error:null,busy:busy.current});
      if(next.match)setOpen(true);
    }catch(error){connectionApi()?.fail('Connection to the challenge server was lost.');}
  },[]);

  const request=useCallback(async(route,body,method='POST')=>{
    if(busy.current||connectionState()?.blocked)return;
    busy.current=true;
    try{
      setChallenge(value=>({...value,busy:true,error:null}));
      if(['invite','select'].includes(route)&&!await game()?.save())
        throw new Error('Unable to save dragons before the challenge.');
      const response=await fetch('/api/challenge/'+route,{method,credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});
      if(response.status===401){connectionApi()?.expire();return;}
      const result=await response.json().catch(()=>({}));
      if(!response.ok){
        if([502,503,504].includes(response.status))connectionApi()?.fail('Challenge server is unavailable.');
        throw new Error(result.error||'Challenge request failed.');
      }
      await status();
    }catch(error){
      if(error instanceof TypeError)connectionApi()?.fail('Connection to the challenge server was lost.');
      setChallenge(value=>({...value,error:error.message}));
    }finally{busy.current=false;setChallenge(value=>({...value,busy:false}));}
  },[status]);

  useEffect(()=>{
    if(!account)return;
    status();
    const timer=setInterval(status,2000);
    return()=>clearInterval(timer);
  },[account?.id,status]);
  useEffect(()=>{if(account&&!connection?.blocked)status();},[account?.id,connection?.blocked,status]);

  return {challenge,open,setOpen,status,request};
}
