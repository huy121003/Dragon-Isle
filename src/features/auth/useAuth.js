import {useQuery} from '@tanstack/react-query';
import {apiFetch,ApiError} from '../../api/http.js';
import {AuthMeSchema,parseWith} from '../../api/schemas.js';

export function useAuth(){
  const query=useQuery({
    queryKey:['auth','me'],
    queryFn:async()=>{
      try{return parseWith(AuthMeSchema,await apiFetch('/api/auth/me'),'Auth response');}
      catch(error){if(error instanceof ApiError&&error.status===401)return {user:null};throw error;}
    },
    retry:false
  });
  return {account:query.data?.user||null,ready:query.isFetched,isError:query.isError,error:query.error};
}
