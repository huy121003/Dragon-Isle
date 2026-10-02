import {useQuery} from '@tanstack/react-query';
import {apiFetch} from '../../api/http.js';
import {AuthMeSchema,parseWith} from '../../api/schemas.js';

export function useAuth(){
  const query=useQuery({
    queryKey:['auth','me'],
    queryFn:async()=>parseWith(AuthMeSchema,await apiFetch('/api/auth/me'),'Auth response'),
    retry:false
  });
  return {account:query.data?.user||null,ready:!query.isPending,isError:query.isError,error:query.error};
}
