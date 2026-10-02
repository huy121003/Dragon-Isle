export class ApiError extends Error{
  constructor(message,status=0,body=null){super(message);this.name='ApiError';this.status=status;this.body=body;}
}
export async function apiFetch(url,options={}){
  let response;
  try{
    response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
  }catch(cause){
    const error=new ApiError('Network request failed.',0);error.cause=cause;throw error;
  }
  const body=await response.json().catch(()=>null);
  if(!response.ok)throw new ApiError(body?.error||('Request failed ('+response.status+').'),response.status,body);
  return body;
}
