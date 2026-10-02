import {useQuery} from '@tanstack/react-query';
import {api,AuthResponseSchema,ApiError} from '../../api/client.js';
export default function useAccount(){
 const query=useQuery({queryKey:['auth','me'],queryFn:async()=>{try{return (await api('/api/auth/me',{schema:AuthResponseSchema})).user;}catch(error){if(error instanceof ApiError&&error.status===401)return null;throw error;}}});
 return {account:query.data??null,ready:query.isFetched,error:query.error};
}
